/**
 * Mock module for `@actions/core`, substituted via jest.unstable_mockModule.
 *
 * This is a *partial* mock. `@actions/cache` also imports named exports from
 * `@actions/core` (`setSecret` among them), so a mock that exported only the
 * functions this action calls would break any test that loads the real cache
 * module. Re-exporting everything and overriding only what we assert on keeps
 * those consumers satisfied — explicit local exports take precedence over
 * `export *`.
 */
import { jest } from '@jest/globals'

export * from '@actions/core'

export const debug = jest.fn()
export const error = jest.fn()
export const info = jest.fn()
export const warning = jest.fn()
export const getInput = jest.fn()
export const setOutput = jest.fn()
export const setFailed = jest.fn()
