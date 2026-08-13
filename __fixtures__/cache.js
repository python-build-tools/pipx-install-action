/**
 * Mock module for `@actions/cache`, substituted via jest.unstable_mockModule.
 */
import { jest } from '@jest/globals'

export const saveCache = jest.fn()
export const restoreCache = jest.fn()
