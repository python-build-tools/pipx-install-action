/**
 * Partial mock module for `node:fs/promises`.
 *
 * `pipx-install.js` imports the default export and needs a real `readFile` to
 * load the TOML fixtures in `__tests__/data/`, so only `symlink` and `stat` are
 * replaced with mocks.
 */
import { jest } from '@jest/globals'

const actual = await import('node:fs/promises')

export const symlink = jest.fn()
export const stat = jest.fn()

export default { ...actual.default, symlink, stat }
