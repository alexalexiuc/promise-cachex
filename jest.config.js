module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': '@swc/jest',
  },
  collectCoverageFrom: ['src/**/*.ts'],
};
