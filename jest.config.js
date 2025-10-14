module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  // Exclude demo, examples, and other non-test directories
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/demo/',
    '/examples/',
    '/coverage-report/',
    '/demo-report/',
  ],
  // Don't transform these patterns
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  // Setup files
  setupFilesAfterEnv: [],
};