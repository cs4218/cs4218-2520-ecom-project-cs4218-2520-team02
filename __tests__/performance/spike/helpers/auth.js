import { createSuiteAuthHelpers } from "../../common/k6/auth.js";

const spikeAuthHelpers = createSuiteAuthHelpers({
  suitePrefix: "SPIKE",
  suiteLabel: "Spike",
  password: "Spike1234!",
  address: "123 Spike Street",
  userEmailPrefix: "spike",
});

export const {
  buildAuthHeaders,
  buildUniqueUser,
  getExistingUserCredentials,
  loginUser,
  pickUserForVu,
  registerUser,
} = spikeAuthHelpers;

export const getSpikeUserPool = spikeAuthHelpers.getUserPool;
