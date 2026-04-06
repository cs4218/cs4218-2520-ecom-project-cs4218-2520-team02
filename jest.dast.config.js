export default {
  displayName: 'dast',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/security/dast/**/*.test.js'],
  collectCoverage: false,
  // ZAP scans can take several minutes - allow up to 6 minutes per test file
  testTimeout: 360_000,
};
