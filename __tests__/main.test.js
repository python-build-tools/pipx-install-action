/**
 * Unit tests for the action's main functionality, src/main.js
 */
import { jest } from '@jest/globals'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load as loadYaml } from 'js-yaml'

import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const main = await import('../src/main.js')

const dirname = path.dirname(fileURLToPath(import.meta.url))
const testDataDir = path.join(dirname, 'data')
const emptyPyprojectFile = path.join(testDataDir, 'pyproject.empty.toml')
const actionYmlFile = path.join(dirname, '..', 'action.yml')

describe('action', () => {
  const inputsDefaults = {}
  const actionYml = loadYaml(fs.readFileSync(actionYmlFile))
  for (const [inputName, inputConfig] of Object.entries(actionYml.inputs)) {
    inputsDefaults[inputName] = inputConfig.default
  }

  let inputs = null

  beforeEach(() => {
    jest.clearAllMocks()
    inputs = {
      ...inputsDefaults,
      'install-config-file': emptyPyprojectFile
    }

    // Mock the action's inputs
    core.getInput.mockImplementation((name) => {
      return inputs[name]
    })
  })

  it('logs if nothing to do', async () => {
    await main.run()

    expect(core.info).toHaveBeenCalledWith('Nothing to install.')
  })

  it('sets a failed status', async () => {
    inputs['install-config-file'] = 'failfail.fail'

    await main.run()

    expect(core.setFailed).toHaveBeenCalledWith(
      "ENOENT: no such file or directory, open 'failfail.fail'"
    )
  })
})
