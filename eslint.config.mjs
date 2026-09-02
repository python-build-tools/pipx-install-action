// See: https://eslint.org/docs/latest/use/configure/configuration-files

import js from '@eslint/js'
import json from '@eslint/json'
import jest from 'eslint-plugin-jest'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'

// super-linter lints JavaScript and JSON with a single eslint config, so this
// file covers both. None of the shared JavaScript configs below declare `files`
// of their own, which would apply their rules to the JSON files too, so they
// are scoped explicitly.
const jsFiles = ['**/*.js', '**/*.mjs', '**/*.cjs']

export default [
  {
    ignores: ['**/coverage', '**/dist', '**/linter', '**/node_modules']
  },

  ...[
    js.configs.recommended,
    jest.configs['flat/recommended'],
    prettierRecommended
  ].map((config) => ({ ...config, files: jsFiles })),

  {
    files: jsFiles,

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
      },

      ecmaVersion: 2023,
      sourceType: 'module'
    },

    rules: {
      camelcase: 'off',
      'no-console': 'off',
      'no-shadow': 'off',
      'no-unused-vars': 'off',
      'prettier/prettier': 'error'
    }
  },

  {
    ...json.configs.recommended,
    files: ['**/*.json'],
    language: 'json/json'
  },

  {
    // super-linter routes .jsonc through this config too, so cover it here
    // rather than leaving it silently unlinted if a file is ever added.
    ...json.configs.recommended,
    files: ['**/*.jsonc'],
    language: 'json/jsonc'
  },

  {
    // npm generates the lockfile, and its `packages` map uses "" as the key for
    // the root project. Turn off just that rule rather than skipping the file,
    // so the remaining JSON checks still apply.
    files: ['package-lock.json'],
    language: 'json/json',
    rules: {
      'json/no-empty-keys': 'off'
    }
  }
]
