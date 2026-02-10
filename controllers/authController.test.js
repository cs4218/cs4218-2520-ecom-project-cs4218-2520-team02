import { jest, beforeEach } from "@jest/globals";

// Mock userModel
await jest.unstable_mockModule("../models/userModel.js", () => {
  const UserMock = jest.fn(() => ({
    save: jest.fn().mockResolvedValue({ _id: "1" }),
  }));

  UserMock.findOne = jest.fn();

  return { default: UserMock };
});
await jest.unstable_mockModule("../helpers/authHelper.js", () => {
  return {
    hashPassword: jest.fn().mockResolvedValue("hashedPassword"),
    comparePassword: jest.fn(),
  };
});
await jest.unstable_mockModule("jsonwebtoken", () => {
  const sign = jest.fn().mockReturnValue("token");
  return {
    default: { sign },
    sign,
  };
});

const { default: userModel } = await import("../models/userModel.js");
const { default: JWT } = await import("jsonwebtoken");
const { registerController, loginController } =
  await import("./authController");
const { comparePassword } = await import("../helpers/authHelper.js");

describe("Auth Controller", () => {
  let req, res;

  beforeEach(() => {
    jest.resetAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  describe.skip("Register Controller", () => {
    it("should return message if name is missing", async () => {
      // Arrange
      req = {
        body: {
          email: "a@a.com",
          password: "a",
          phone: "a",
          address: "a",
          answer: "a",
        },
      };

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Name is Required" });
    });

    it("should return message if email is missing", async () => {
      // Arrange
      req = {
        body: {
          name: "a",
          password: "a",
          phone: "a",
          address: "a",
          answer: "a",
        },
      };

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Email is Required" });
    });

    it("should return message if password is missing", async () => {
      // Arrange
      req = {
        body: {
          name: "a",
          email: "a@a.com",
          phone: "a",
          address: "a",
          answer: "a",
        },
      };

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Password is Required",
      });
    });

    it("should return message if phone is missing", async () => {
      // Arrange
      req = {
        body: {
          name: "a",
          email: "a@a.com",
          password: "a",
          address: "a",
          answer: "a",
        },
      };

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Phone no is Required",
      });
    });

    it("should return message if address is missing", async () => {
      // Arrange
      req = {
        body: {
          name: "a",
          email: "a@a.com",
          password: "a",
          phone: "a",
          answer: "a",
        },
      };

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Address is Required" });
    });

    it("should return message if answer is missing", async () => {
      // Arrange
      req = {
        body: {
          name: "a",
          email: "a@a.com",
          password: "a",
          phone: "a",
          address: "a",
        },
      };

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Answer is Required" });
    });

    it("should return status 200 if user already exists", async () => {
      // Arrange
      req = {
        body: {
          name: "a",
          email: "a@a.com",
          password: "a",
          phone: "a",
          address: "a",
          answer: "a",
        },
      };
      userModel.findOne.mockResolvedValue({ _id: "existing" });

      // Act
      await registerController(req, res);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "a@a.com" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Already Register please login",
      });
    });

    it("should return status 201 if user is not already registered", async () => {
      // Arrange
      req = {
        body: {
          name: "a",
          email: "a@a.com",
          password: "a",
          phone: "a",
          address: "a",
          answer: "a",
        },
      };
      userModel.findOne.mockResolvedValue(null);
      userModel.mockImplementation(function (data) {
        Object.assign(this, data);
        this.save = jest.fn().mockResolvedValue({ _id: "new" });
      });

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "User Register Successfully",
        user: { _id: "new" },
      });
    });

    it("should return status 500 when saving user fails", async () => {
      // Arrange
      req = {
        body: {
          name: "a",
          email: "a@a.com",
          password: "a",
          phone: "a",
          address: "a",
          answer: "a",
        },
      };
      userModel.findOne.mockResolvedValue(null);
      userModel.mockImplementation(function (data) {
        Object.assign(this, data);
        this.save = jest.fn().mockRejectedValue(new Error("db down"));
      });

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in Registeration",
        error: new Error("db down"),
      });
    });
  });

  describe.skip("Login Controller", () => {
    it("should return status 404 if email is missing", async () => {
      // Arrange
      req = { body: { password: "a" } };

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("should return status 404 if password is missing", async () => {
      // Arrange
      req = { body: { email: "a@a.com" } };

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("should return status 404 if user not found", async () => {
      // Arrange
      req = { body: { email: "a@a.com", password: "a" } };
      userModel.findOne.mockResolvedValue(null);

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registered",
      });
    });

    it("should return status 401 if password not match", async () => {
      // Arrange
      req = { body: { email: "a@a.com", password: "a" } };
      userModel.findOne.mockResolvedValue({ email: "a@a.com", password: "b" });

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Password",
      });
    });

    it("should return status 500 if error is thrown", async () => {
      // Arrange
      req = { body: { email: "a@a.com", password: "a" } };
      userModel.findOne.mockResolvedValue({ email: "a@a.com", password: "a" });
      comparePassword.mockRejectedValue(new Error("comparePassword error"));

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in login",
        error: new Error("comparePassword error"),
      });
    });

    it("should return status 200 if user login successfully", async () => {
      // Arrange
      req = { body: { email: "a@a.com", password: "a" } };
      userModel.findOne.mockResolvedValue({
        _id: "a",
        name: "a",
        email: "a@a.com",
        phone: "a",
        address: "a",
        role: 0,
        password: "a",
      });
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockResolvedValue("token");

      // Act
      await loginController(req, res);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "a@a.com" });
      expect(comparePassword).toHaveBeenCalledWith("a", "a");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "login successfully",
        user: {
          _id: "a",
          name: "a",
          email: "a@a.com",
          phone: "a",
          address: "a",
          role: 0,
        },
        token: "token",
      });
    });
  });

  describe("Forgot Password Controller", () => {

  });
});
