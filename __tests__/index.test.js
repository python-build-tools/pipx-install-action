/**
 * Unit tests for the action's entrypoint, src/index.js
 */
import { jest } from '@jest/globals'

const run = jest.fn()

// Mocks must be registered before the module under test is imported.
jest.unstable_mockModule('../src/main.js', () => ({ run }))

describe('index', () => {
  it('calls run when imported', async () => {
    await import('../src/index.js')

    expect(run).toHaveBeenCalled()
  })
})
