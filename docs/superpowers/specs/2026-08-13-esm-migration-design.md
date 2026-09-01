# ESM migration and `@actions/*` major upgrades

Date: 2026-08-13

## Goal

Upgrade `@actions/core` to its latest release and, because that release is
ESM-only, migrate this repository from CommonJS to ECMAScript modules.

This lifts the constraint that `AGENTS.md` and `.agents/INSTRUCTIONS.md`
currently document as the repository's central hard rule: that `@actions/core`,
`@actions/cache`, and `@actions/exec` must not be bumped past `^2.x`, `^5.x`,
and `^2.x` respectively because `src/` uses `require()`.

## Scope

One pull request. The three dependency majors and the ESM migration are a single
atomic change and cannot be separated: `@actions/cache@5` pins
`@actions/core@^2`, so bumping `core` alone would resolve a second, nested
CommonJS copy of `core` and bundle both into `dist/`.

| Package          | From  | To    |
| ---------------- | ----- | ----- |
| `@actions/core`  | 2.0.3 | 3.0.1 |
| `@actions/cache` | 5.2.0 | 6.2.0 |
| `@actions/exec`  | 2.0.0 | 3.0.0 |

All three are ESM-only at these majors (`type: module`, with an `exports` map
that offers `import` and no `require`).

No public API of the action changes. `action.yml` inputs are byte-identical,
`runs.using` stays `node24`, and `main` stays `dist/index.js`. The action's
observable behavior is unchanged.

### Dependency API compatibility

`restoreCache`, `saveCache`, `exec`, and `getExecOutput` keep their existing
signatures. `@actions/cache` 6.x adds only additive behavior: a `core.warning`
on read-only-token cache failures, and honoring `ACTIONS_CACHE_MODE`. Nothing
this repository calls changes shape.

`npm audit --omit=dev` reports 0 vulnerabilities on the resulting tree.

## Source migration (`src/`)

Three files convert from `require`/`module.exports` to `import`/`export`.

Three points that are not purely mechanical:

- **Relative imports need explicit `.js` extensions.** Node's ESM resolver does
  not guess extensions, so `require('./main')` becomes
  `import { run } from './main.js'`.
- **CommonJS dependencies are imported as defaults.** `@iarna/toml` and `semver`
  are CommonJS, so they are imported as `import TOML from '@iarna/toml'` and
  `import semver from 'semver'`. Named imports from CommonJS depend on static
  analysis by `cjs-module-lexer` and are avoidable here.
- **`pipx-install.js` declares `module.exports` at the top of the file**,
  relying on function hoisting. That block is deleted and `pipxInstall` gains an
  inline `export`.

Node built-ins move to `node:`-prefixed specifiers (`node:fs/promises`,
`node:path`, `node:crypto`).

## Test migration (`__tests__/`)

This is the substantive part of the work. The existing tests are built almost
entirely on `jest.spyOn(someModule, 'someExport')`. ESM module namespace objects
are frozen, so every one of those calls fails under native ESM. Mocking has to
move from mutating a live namespace to substituting the module before it is
imported.

The pattern, matching the upstream `actions/javascript-action` template:

```js
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

// Dynamic, and only after the mock is registered.
const { run } = await import('../src/main.js')
```

A new `__fixtures__/` directory holds mock modules for `@actions/core`,
`@actions/cache`, `@actions/exec`, and `node:fs/promises`.

Two consequences deserve explicit note.

**`pipx-install.test.js` needs a partial mock of `node:fs/promises`.** It mocks
`symlink` and `stat` but relies on `readFile` being real so the TOML fixtures in
`__tests__/data/` still load. `unstable_mockModule` replaces a whole module, so
the fixture reexports the real module and overrides only those two functions:

```js
const real = await import('node:fs/promises')
export const symlink = jest.fn()
export const stat = jest.fn()
export default { ...real.default, symlink, stat }
```

**`main.test.js` loses its `jest.spyOn(main, 'run')` self-spy.** Spying on the
module under test's own export is not possible in ESM. The assertion it fed,
`expect(runMock).toHaveReturned()`, only established that `run` reached its end
without throwing; the meaningful assertions in that test are already the ones
against `core.info` and `core.setFailed`, which move onto the `core` fixture.
Behavioral coverage is unchanged; one vacuous assertion is removed.

`main.test.js` continues to read `action.yml` to derive input defaults and
continues to exercise the real `pipx-install.js`, preserving the
entry-point-driven integration path.

### Jest configuration

Configuration moves out of the `package.json` `"jest"` key into a
`jest.config.js` file, which sets `transform: {}` because native ESM requires no
transpilation.

Both the `test` and `ci-test` scripts gain
`NODE_OPTIONS=--experimental-vm-modules NODE_NO_WARNINGS=1`. This goes in the
npm scripts rather than in the workflow files so local runs and CI behave
identically.

The existing coverage-badge behavior of `test` is retained as-is, including its
`make-coverage-badge` fallback. Restructuring that script is out of scope.

### Removed dead devDependencies

`@babel/core`, `@babel/eslint-parser`, `@babel/preset-env`, and
`babel-preset-jest` are removed. There is no Babel configuration anywhere in the
repository; these have been inert since the original template scaffold, and
native ESM tests need no transform. This applies the repository's own standing
rule against carrying unused dependencies to the toolchain being changed here.

## Build: rollup replaces `@vercel/ncc`

`dist/` is produced by rollup, matching the upstream template. The `package`
script becomes `rollup --config rollup.config.js`, and `bundle` continues to run
`format:write` followed by `package`.

No clean step is introduced. Rollup and the license plugin both overwrite their
outputs deterministically, so a `rimraf` dependency would earn nothing. The one
stale artifact this leaves is the `licenses.txt` that ncc produced, which the
license plugin overwrites at the same path.

```js
plugins: [
  commonjs({ ignoreTryCatch: false }),
  json(),
  nodeResolve({ preferBuiltins: true }),
  license({ thirdParty: { output: 'dist/licenses.txt' } })
]
```

Three deliberate deviations from the upstream template's configuration:

- **`commonjs({ ignoreTryCatch: false })` is required.** Found during
  implementation, not design. Several bundled dependencies probe for optional
  modules with `require()` inside a try/catch — minimatch resolves `path` that
  way, and undici probes `node:http2` and `node:crypto`. This plugin leaves
  those requires untouched by default, and in an ESM bundle `require` is
  undefined, so the throw is swallowed and each dependency silently takes a
  degraded fallback. minimatch fell back to `sep: '/'`, which stopped Windows
  paths from matching and made `@actions/cache`'s `saveCache` fail on
  `windows-latest` only, with Ubuntu unaffected because `sep` is `/` there
  anyway. This was a regression from ncc, which rewrites try/catch requires into
  its own module registry; it was not caused by the `@actions/cache` major.
  `__tests__/dist.test.js` guards the invariant.

- **`@rollup/plugin-json` is required.** It is absent upstream, where the only
  dependency is `@actions/core`. Here, `@actions/cache` imports its own
  `package.json`, and the build fails outright without this plugin.
- **`sourcemap: false`.** The generated source map is roughly 16.5 MB. Because
  `dist/` is committed, enabling it would add that volume to Git history on
  every dependency bump and would bury the `dist/` diff that `check-dist.yml`
  reports. With source maps off, `dist/` keeps exactly the two files it holds
  today, `index.js` and `licenses.txt`, so the migration introduces no new
  committed build artifacts.

`rollup-plugin-license` preserves `dist/licenses.txt`, emitting a notice for
every package rollup actually bundles. This matters because the build inlines
the production dependency tree, which the `@actions/cache@6` upgrade grows to 45
packages by adding the Azure Storage SDK. That makes `dist/index.js` a
redistributed derived work of MIT- and Apache-2.0-licensed code whose notices
must travel with it.

`optionalDependencies: { "@rollup/rollup-linux-x64-gnu": "*" }` is added, as
upstream does, for `npm ci` reliability on the Linux runners.

`.licensed.yml` is left as it is. It is currently unused, and wiring up
`github/licensed` properly is out of scope for this change.

## Runtime and CI

`dist/index.js` is an ESM bundle, and Node resolves it as ESM because the root
`package.json` declares `type: module` and ships with the action checkout. This
is the same arrangement the upstream template uses.

No workflow files need to change:

- `ci.yml` calls `npm run ci-test`, which carries the required `NODE_OPTIONS`.
- `check-dist.yml` calls `npm run bundle`, which now invokes rollup.
- `eslint.config.mjs` already sets `sourceType: 'module'`.

## Verification

`npm run all` must pass locally: format, lint, test, package.

The decisive check is `ci.yml`'s `test-action` and `test-action-windows` jobs,
which execute the real bundle through `uses: ./` on `ubuntu-latest` and
`windows-latest`. Whether an ESM bundle loads and runs under the `node24`
runtime is only fully provable there, and that is the primary residual risk in
this change.

The following were each validated with a working spike before this design was
written: rollup bundling the full dependency tree including the Azure SDK;
`rollup-plugin-license` emitting attribution for 41 packages; `ncc`'s ESM
support (the rejected alternative); `jest.unstable_mockModule` with fixture
modules; the partial `node:fs/promises` mock keeping `readFile` real; and Jest
30 running with no Babel installed.

## Documentation impact

- **`.agents/INSTRUCTIONS.md`** — update the stack summary (CommonJS to ESM, ncc
  to rollup), the repository map (add `rollup.config.js`, `jest.config.js`,
  `__fixtures__/`), and the golden commands. Most importantly, invert the
  central constraint and pitfall 3: the prohibition on bumping `@actions/*`
  majors is replaced by guidance that this repository is ESM and must stay that
  way, with no `require()` reintroduced.
- **`AGENTS.md`** — replace the same constraint.
- **`README.md`** — contains no CommonJS, ncc, or `dist/` references, so no
  change is expected. Verify rather than assume.
- **`.agents/INPUTS.md` and `.agents/OUTPUTS.md`** — do not exist in this
  repository, and this change alters no trigger, runtime input, or output. No
  impact.

## Alternatives rejected

**Keeping `@vercel/ncc`.** ncc 0.45 does handle ESM: it detects ESM input, emits
an ESM bundle plus a `dist/package.json` containing `{"type":"module"}`, and the
result runs correctly against the full dependency tree. It would have been the
smaller diff. Rollup was chosen instead to align with the upstream
`actions/javascript-action` template this repository derives from, for a smaller
bundle (2.9 MB against 3.4 MB), and because ncc is largely dormant.

**Adopting `github/licensed`** in place of `dist/licenses.txt`. Deferred.
`licensed` is a Ruby tool, and neither Ruby nor Docker is available on the
development machine; `licensed status` also fails until `.licenses/` exists,
which a fresh branch cannot bootstrap because `workflow_dispatch` is only
available for workflows already present on the default branch. Sequencing that
correctly is a separate change.

**Bumping `@actions/core` alone**, leaving `cache` and `exec` behind. Rejected:
it resolves and bundles two copies of `@actions/core`, one CommonJS and one ESM.
