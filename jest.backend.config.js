export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: ["<rootDir>/controllers/*.test.js", "<rootDir>/middlewares/*.test.js", "<rootDir>/models/*.test.js", "<rootDir>/routes/*.test.js"],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: ["controllers/**", "middlewares/**", "models/**", "routes/**"],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
};
