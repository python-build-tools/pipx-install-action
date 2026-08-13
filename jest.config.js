// See: https://jestjs.io/docs/configuration

/** @type {import('jest').Config} */
const jestConfig = {
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: ['./src/**'],
  coverageDirectory: './coverage',
  coverageReporters: ['json-summary', 'text', 'lcov'],
  moduleFileExtensions: ['js'],
  reporters: ['default'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Native ESM needs no transpilation, so babel-jest is never invoked.
  transform: {},
  verbose: true
}

export default jestConfig
