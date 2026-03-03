export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
    "<rootDir>/**/__tests__/**/*.test.js",
    "<rootDir>/controllers/*.test.js",
    "<rootDir>/helpers/*.test.js",
    "<rootDir>/middlewares/*.test.js",
    "<rootDir>/models/*.test.js",
  ],
  testPathIgnorePatterns: ["<rootDir>/client/", "<rootDir>/.*\\.integration\\.test\\.js$"],
  
  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/**",
    "middlewares/**",
    "models/**",
    "routes/**",
    "helpers/**",
    "!**/*.test.js",
    "!**/*.integration.test.js",
  ],
  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
  },
};
