import { createSuiteAuthHelpers } from "../../common/k6/auth.js";

const capacityAuthHelpers = createSuiteAuthHelpers({
  suitePrefix: "CAPACITY",
  suiteLabel: "Capacity",
  password: "Capacity1234!",
  address: "123 Capacity Street",
  userEmailPrefix: "capacity",
});

export const {
  buildAuthHeaders,
  buildUniqueUser,
  getExistingUserCredentials,
  loginUser,
  pickUserForVu,
  registerUser,
} = capacityAuthHelpers;

export const getCapacityUserPool = capacityAuthHelpers.getUserPool;
