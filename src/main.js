import * as core from '@actions/core'
import { pipxInstall } from './pipx-install.js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run() {
  try {
    const installConfigFile = core.getInput('install-config-file')
    const cachePackages = core.getInput('cache-packages')

    await pipxInstall({ installConfigFile, cachePackages })
  } catch (error) {
    // Fail the workflow step if an error occurs
    core.setFailed(error.message)
  }
}
