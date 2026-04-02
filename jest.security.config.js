export default {
  displayName: 'security',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/security/**/*.test.js'],
  // No coverage collection — this is a static analysis suite, not unit tests
  collectCoverage: false,
};
