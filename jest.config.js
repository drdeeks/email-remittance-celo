module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    transform: {
        '^.+\.ts$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            diagnostics: false
        }]
    },
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    }
};