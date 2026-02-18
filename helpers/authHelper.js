import bcrypt from "bcrypt";

export const hashPassword = async (password) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.log(error);
  }
};

// Catch error early while keeping behavior (return false) consistent in auth logic for security reason
export const comparePassword = async (password, hashedPassword) => {
  if (typeof password !== "string" || typeof hashedPassword !== "string") {
    console.warn("Invalid input passed to comparePassword");
    return false;
  }

  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error("bcrypt comparison failed:", error);
    return false;
  }
};
