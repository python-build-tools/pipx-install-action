/**
 * Mock module for `@actions/exec`, substituted via jest.unstable_mockModule.
 */
import { jest } from '@jest/globals'

export const exec = jest.fn()
export const getExecOutput = jest.fn()
