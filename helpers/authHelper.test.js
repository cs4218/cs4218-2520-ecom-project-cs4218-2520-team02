import bcrypt from "bcrypt";
import { hashPassword, comparePassword } from "./authHelper";
import { jest, beforeEach } from "@jest/globals";

describe("Auth Helper", () => {
  describe("hashPassword", () => {
    const plainPassword = "password123";

    beforeEach(() => {
      jest.restoreAllMocks();
      // Suppress console log
      jest.spyOn(console, "log").mockImplementation(() => {});
    });

    it("should return hashed password", async () => {
      jest.spyOn(bcrypt, "hash").mockResolvedValue("hashedPassword");
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
      jest.spyOn(bcrypt, "hash").mockRejectedValue(new Error("Error occurred"));
      const result = await hashPassword(plainPassword);
      expect(result).toBeUndefined();
    });

    // BVA tests added
    it("should hash empty string password", async () => {
      const hashedPassword = await hashPassword("");
      expect(typeof hashedPassword).toBe("string");
      expect(hashedPassword).not.toBe("");
    });

    it("should return undefined if password is null", async () => {
      const hashedPassword = await hashPassword(null);
      expect(hashedPassword).toBeUndefined();
    });

    it("should hash very long password", async () => {
      const longPassword = plainPassword.repeat(100);
      const hashedPassword = await hashPassword(longPassword);
      const isMatch = await bcrypt.compare(longPassword, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it("should hash password with special characters", async () => {
      const specialPassword = "!@#$%^&*()-_=+[]{}|;:'\",.<>/?";
      const hashedPassword = await hashPassword(specialPassword);
      const isMatch = await bcrypt.compare(specialPassword, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it("should hash password with unicode", async () => {
      const unicodePassword = "password_ñ_€";
      const hashedPassword = await hashPassword(unicodePassword);
      const isMatch = await bcrypt.compare(unicodePassword, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it("should hash password with null byte", async () => {
      const nullBytePassword = "p\0ssword123";
      const hashedPassword = await hashPassword(nullBytePassword);
      const isMatch = await bcrypt.compare(nullBytePassword, hashedPassword);
      expect(isMatch).toBe(true);
    });
  });

  describe("comparePassword", () => {
    beforeEach(() => {
      // Suppress console warn, error
      jest.spyOn(console, "warn").mockImplementation(() => {});
      jest.spyOn(console, "error").mockImplementation(() => {});
    });

    let plainPassword = "password123";
    let hashedPassword = "hashedPassword";
    it("should return false if passwords not match", async () => {
      const result = await comparePassword(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    it("should return null if bcrypt.compare fails", async () => {
      jest
        .spyOn(bcrypt, "compare")
        .mockRejectedValue(new Error("Error occurred"));
      const result = await comparePassword(plainPassword, plainPassword);
      expect(result).toBe(false);
    });

    it("should handle empty string password", async () => {
      plainPassword = "";
      const result = await comparePassword(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    it("should handle null password", async () => {
      plainPassword = null;
      const result = await comparePassword(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    it("should handle undefined password", async () => {
      plainPassword = undefined;
      const result = await comparePassword(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });
  });
});
