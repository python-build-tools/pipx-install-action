// super-linter resolves JAVASCRIPT_ES_CONFIG_FILE under LINTER_RULES_PATH
// (.github/linters), so this re-exports the repo's config. That keeps one
// source of truth for `npm run lint` and for super-linter's JAVASCRIPT_ES,
// JSON and JSONC linters, which all share this config.
export { default } from '../../eslint.config.mjs'
