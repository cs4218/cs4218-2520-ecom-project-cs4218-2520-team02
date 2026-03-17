export default {
  // display name
  displayName: "backend-integration",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
    "<rootDir>/**/__tests__/**/*.integration.test.js",
    "<rootDir>/controllers/*.integration.test.js",
    "<rootDir>/helpers/*.integration.test.js",
    "<rootDir>/middlewares/*.integration.test.js",
    "<rootDir>/models/*.integration.test.js",
  ],
  testPathIgnorePatterns: ["<rootDir>/client/"],
  
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
    "!controllers/__tests__/**/**/utils/**" // Ignore util files
  ],
  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
  },
};
