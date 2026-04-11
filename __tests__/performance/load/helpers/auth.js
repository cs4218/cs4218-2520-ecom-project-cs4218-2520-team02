import { createSuiteAuthHelpers } from "../../common/k6/auth.js";

const loadAuthHelpers = createSuiteAuthHelpers({
  suitePrefix: "LOAD",
  suiteLabel: "Load",
  password: "Load1234!",
  address: "123 Load Street",
  userEmailPrefix: "load",
});

export const {
  buildAuthHeaders,
  buildUniqueUser,
  getExistingUserCredentials,
  loginUser,
  pickUserForVu,
  registerUser,
} = loadAuthHelpers;

export const getLoadUserPool = loadAuthHelpers.getUserPool;
