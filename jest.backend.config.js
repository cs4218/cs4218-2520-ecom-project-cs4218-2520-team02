export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
    "<rootDir>/**/__tests__/**/*.test.js",
    "<rootDir>/controllers/*.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: ["controllers/**", "middlewares/**", "models/**", "routes/**"],
  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
  },
};
