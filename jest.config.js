module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      // Skip full type checking — just transpile (10x faster)
      diagnostics: false,
      isolatedModules: true,
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
  forceExit: true,
  testTimeout: 20000,
  runInBand: true,
  // Runs after test framework is installed in env — closes DB so Jest can exit cleanly
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
};
