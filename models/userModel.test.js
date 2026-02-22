// Gavin Sin Fu Chen, A0273285X
import mockingoose from "mockingoose";
import mongoose from "mongoose";
import User from "./userModel.js";

describe("User Model", () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  const defaultUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: "testUser",
    email: "test@example.com",
    password: "password123",
    phone: "12345678",
    address: {},
    answer: "abc",
    role: 0,
  };

  describe("BVA Analysis", () => {
    it("should allow minimum boundary (name.length = 1)", async () => {
      const mockUser = { ...defaultUser, name: "a" };
      mockingoose(User).toReturn(mockUser, "findOne");

      const found = await User.findOne({ _id: mockUser._id });

      expect(found.name).toBe("a");
    });

    it("should allow maximum boundary (long name)", async () => {
      const longName = "a".repeat(100);
      const mockUser = { ...defaultUser, name: longName };
      mockingoose(User).toReturn(mockUser, "findOne");

      const found = await User.findOne({ _id: mockUser._id });
      expect(found.name.length).toBe(100);
    });

    it("should allow role boundary (role = 0 for user)", async () => {
      const mockUser = { ...defaultUser, role: 0 };
      mockingoose(User).toReturn(mockUser, "findOne");

      const found = await User.findOne({ _id: mockUser._id });
      expect(found.role).toBe(0);
    });

    it("should allow role boundary (role = 1 for admin)", async () => {
      const mockUser = { ...defaultUser, role: 1 };
      mockingoose(User).toReturn(mockUser, "findOne");

      const found = await User.findOne({ _id: mockUser._id });
      expect(found.role).toBe(1);
    });
  });

  describe("EP", () => {
    it("should trim name field", async () => {
      const mockUser = { ...defaultUser, name: "New Name " };
      mockingoose(User).toReturn({ ...defaultUser, name: "New Name" }, "save");

      const user = new User(mockUser);
      const savedUser = await user.save();

      expect(savedUser.name).toBe("New Name");
    });

    it("should use default role value (role = 0)", async () => {
      const mockUser = { ...defaultUser };
      delete mockUser.role;
      mockingoose(User).toReturn({ ...defaultUser, role: 0 }, "save");

      const user = new User(mockUser);
      const savedUser = await user.save();

      expect(savedUser.role).toBe(0);
    });

    it("should return mocked user on save (valid partition)", async () => {
      const mockUser = {
        ...defaultUser,
        name: "New Name",
      };
      mockingoose(User).toReturn(mockUser, "save");

      const user = new User(mockUser);
      const savedUser = await user.save();

      expect(savedUser._id.toString()).toBe(mockUser._id);
      expect(savedUser.name).toBe("New Name");
    });
  });

  describe("Fields Validation - Required Field", () => {
    it("should fail when name is missing", async () => {
      const user = new User({
        email: "test@example.com",
        password: "password123",
        phone: "12345678",
        address: {},
        answer: "abc",
      });

      expect(user.validate()).rejects.toThrow("Path `name` is required");
    });
      
    it("should fail when email is missing", async () => {
      const user = new User({
        name: "testUser",
        password: "password123",
        phone: "12345678",
        address: {},
        answer: "abc",
      });

      expect(user.validate()).rejects.toThrow("Path `email` is required");
    });
      
    it("should fail when password is missing", async () => {
      const user = new User({
        name: "testUser",
        email: "test@example.com",
        phone: "12345678",
        address: {},
        answer: "abc",
      });

      expect(user.validate()).rejects.toThrow("Path `password` is required");
    });
      
    it("should fail when phone is missing", async () => {
      const user = new User({
        name: "testUser",
        email: "test@example.com",
        password: "password123",
        address: {},
        answer: "abc",
      });

      expect(user.validate()).rejects.toThrow("Path `phone` is required");
    });
      
    it("should fail when address is missing", async () => {
      const user = new User({
        name: "testUser",
        email: "test@example.com",
        password: "password123",
        phone: "12345678",
        answer: "abc",
      });

      expect(user.validate()).rejects.toThrow("Path `address` is required");
    });
      
    it("should fail when answer is missing", async () => {
      const user = new User({
        name: "testUser",
        email: "test@example.com",
        password: "password123",
        phone: "12345678",
        address: {},
      });

      expect(user.validate()).rejects.toThrow("Path `answer` is required");
    });
  });
});
