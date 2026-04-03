export default {
  displayName: 'injection',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/security/injection.test.js'],
  collectCoverage: false,
  testTimeout: 30_000, // each test allows up to 30s; ReDoS test uses internal 8s cap
};
