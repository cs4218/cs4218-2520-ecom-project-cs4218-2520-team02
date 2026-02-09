import bcrypt from "bcrypt";
import { hashPassword, comparePassword } from "./authHelper";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashedPassword"),
  compare: jest.fn().mockResolvedValue(true),
}));

describe("Auth Helper", () => {
  describe("hashPassword", () => {
    const plainPassword = "password123";

    it("should return hashed password", async () => {
      const result = await hashPassword(plainPassword);
      expect(result).toBe("hashedPassword");
      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
    });

    it("hashed password should not equal original password", async () => {
      const result = await hashPassword(plainPassword);
      expect(result).not.toBe(plainPassword);
    });

    it("hashed password should match original password when compared with bcrypt", async () => {
      const hashedPassword = await hashPassword(plainPassword);
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it("should return null if bcrypt.hash fails", async () => {
      bcrypt.hash.mockImplementationOnce(() => {
        throw new Error("Error occurred");
      });
      const result = await hashPassword(plainPassword);
      expect(result).toBeNull();
    });
  });

  describe("comparePassword", () => {
    const plainPassword = "password123";
    const hashedPassword = "hashedPassword";

    it("should return true if passwords match", async () => {
      const result = await comparePassword(plainPassword, hashedPassword);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword,
      );
      expect(result).toBe(true);
    });

    it("should return false if passwords not match", async () => {
      bcrypt.compare.mockResolvedValue(false);
      const result = await comparePassword(plainPassword, hashedPassword);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword,
      );
      expect(result).toBe(false);
    });
  });
});
