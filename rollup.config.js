// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import license from 'rollup-plugin-license'

const config = {
  input: 'src/index.js',
  output: {
    esModule: true,
    file: 'dist/index.js',
    format: 'es',
    // Deliberately off: dist/ is committed, and the generated map is ~16.5MB,
    // which would land in git history on every dependency bump and bury the
    // dist/ diff that check-dist.yml reports.
    sourcemap: false
  },
  plugins: [
    // ignoreTryCatch: false is required. Several bundled dependencies probe for
    // optional modules with require() inside a try/catch — minimatch resolves
    // `path` that way. By default this plugin leaves those requires alone, and
    // in an ESM bundle `require` is undefined, so the throw is swallowed and the
    // dependency silently takes its fallback path. That made minimatch use
    // `sep: '/'`, which stops Windows paths from matching and broke
    // @actions/cache's saveCache on windows-latest only. See __tests__/dist.test.js.
    commonjs({ ignoreTryCatch: false }),
    // Required, and absent from the upstream actions/javascript-action config:
    // @actions/cache imports its own package.json, and the build fails without
    // this plugin.
    json(),
    nodeResolve({ preferBuiltins: true }),
    license({ thirdParty: { output: 'dist/licenses.txt' } })
  ]
}

export default config
