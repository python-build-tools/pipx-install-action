<!-- For repository-specific context (what this repository is, stack, commands,
CI/CD), see .agents/INSTRUCTIONS.md. This file holds only hard rules. -->

# Agent instructions

For full repository-specific context (stack, golden commands, CI/CD, pitfalls),
see [.agents/INSTRUCTIONS.md](.agents/INSTRUCTIONS.md).

## Constraints

- Never commit a change to `src/`, `package.json`, or `package-lock.json`
  without running `npm run all` first (or at minimum `npm run package`).
  `dist/index.js` is the file GitHub Actions actually executes, and
  `check-dist.yml` CI fails if the committed `dist/` doesn't match a fresh
  build.
- This repository is **native ESM** (`"type": "module"` in `package.json`).
  Never reintroduce `require()`, `module.exports`, or `__dirname` into `src/` or
  `__tests__/` — use `import`/`export` and
  `path.dirname(fileURLToPath(import.meta.url))`. Relative imports need explicit
  `.js` extensions. `@actions/core`, `@actions/cache`, and `@actions/exec` are
  ESM-only from `3.x`, `6.x`, and `3.x` onward, which is why this is
  load-bearing.
- Mock modules in tests with `jest.unstable_mockModule` plus a fixture in
  `__fixtures__/`, never `jest.spyOn(module, 'export')` — ESM module namespaces
  are frozen. Fixtures for modules that other dependencies also import must
  `export *` the real module and override only what the test asserts on. See
  INSTRUCTIONS.md.
- Don't add or `require()` a dependency without using it. Check the GitHub
  Advisory Database / `npm audit` before adding or upgrading dependencies.
- No secrets, tokens, or credentials in code, tests, or workflow files.

Trust these instructions first; search the repository only when something is
missing or incorrect.
