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

  setupFilesAfterEnv: ["<rootDir>/__mocks__/jest.mocks.js"],

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
