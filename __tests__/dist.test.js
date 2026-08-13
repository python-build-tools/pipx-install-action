/**
 * Guards against a silent class of bundling bug in the committed dist/ bundle.
 *
 * `dist/index.js` is ESM, where `require` does not exist. Several bundled
 * dependencies probe for optional modules with `require()` inside a try/catch
 * and fall back when it throws — minimatch resolves `path` that way, for
 * example. @rollup/plugin-commonjs leaves those requires untouched unless
 * `ignoreTryCatch: false` is set, so they degrade silently instead of failing
 * loudly: minimatch fell back to `sep: '/'`, which stopped Windows paths from
 * matching and broke @actions/cache's saveCache on windows-latest only.
 *
 * check-dist.yml guarantees the committed bundle matches a fresh build, so
 * asserting against the committed file is equivalent to asserting on the build.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const distFile = path.join(dirname, '..', 'dist', 'index.js')

describe('dist bundle', () => {
  const bundle = fs.readFileSync(distFile, 'utf8')

  it('contains no executable bare require() calls', () => {
    // Match a bare `require(` identifier, excluding property accesses like
    // `foo.require(` and `createRequire(`.
    const bareRequire = /(?<![\w$.])require\(/

    const offenders = bundle
      .split('\n')
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => {
        const match = bareRequire.exec(line)
        if (!match) return false

        // Ignore mentions inside a line comment.
        const commentIndex = line.indexOf('//')
        if (commentIndex !== -1 && commentIndex < match.index) return false

        // @iarna/toml deliberately hides one behind eval() so bundlers skip it,
        // and degrades gracefully when it throws — it only affects util.inspect
        // formatting of TOML parse errors.
        if (line.includes('eval(')) return false

        return true
      })
      .map(({ line, lineNumber }) => `${lineNumber}: ${line.trim()}`)

    expect(offenders).toEqual([])
  })
})
