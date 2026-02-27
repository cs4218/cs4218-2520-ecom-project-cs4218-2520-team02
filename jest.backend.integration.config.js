export default {
  // display name
  displayName: "backend-integration",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
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
  ],
  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
  },
};
