// Censon Lee Lemuel John Alejo, A0273436B
import { createSuiteAuthHelpers } from "../../common/k6/auth.js";

const stressAuthHelpers = createSuiteAuthHelpers({
  suitePrefix: "STRESS",
  suiteLabel: "Stress",
  password: "Stress1234!",
  address: "123 Stress Street",
  userEmailPrefix: "stress",
});

export const {
  buildAuthHeaders,
  buildUniqueUser,
  getExistingUserCredentials,
  loginUser,
  pickUserForVu,
  registerUser,
} = stressAuthHelpers;

export const getStressUserPool = stressAuthHelpers.getUserPool;
