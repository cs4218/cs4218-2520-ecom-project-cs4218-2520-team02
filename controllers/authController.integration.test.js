// Gavin Sin Fu Chen, A0273285X
import dotenv from "dotenv";
dotenv.config(); // needed to load process.env config in loginController
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { beforeAll, jest } from "@jest/globals";

import userModel from "../models/userModel.js";
import {
  registerController,
  loginController,
  forgotPasswordController,
  updateProfileController,
} from "../controllers/authController.js";
import { comparePassword, hashPassword } from "../helpers/authHelper.js";

describe("Auth Controller Integration Tests", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    process.env.JWT_SECRET = "testsecret";
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());

    app.post("/register", registerController);
    app.post("/login", loginController);
    app.post("/forgot-password", forgotPasswordController);
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("registerController", () => {
    it("should successfully register if none exists", async () => {
      // Act
      const res = await request(app).post("/register").send({
        name: "a",
        email: "a@a.com",
        password: "a",
        phone: "a",
        address: "a",
        answer: "a",
      });

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        success: true,
        message: "User Register Successfully",
      });
      const dbUsers = await userModel.find({ email: "a@a.com" });
      expect(dbUsers.length).toBe(1);
    });

    it("should return 200 if registered email already exists", async () => {
      // Arrange
      let sampleUser = {
        name: "a",
        email: "a@a.com",
        password: "a",
        phone: "a",
        address: "a",
        answer: "a",
      };
      const user = await userModel.create(sampleUser);

      // Act
      sampleUser.name = "b";
      const res = await request(app).post("/register").send(sampleUser);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: false,
        message: "Already Register please login",
      });
      const dbUsers = await userModel.find({ email: "a@a.com" });
      expect(dbUsers.length).toBe(1);
      const unchanged = await userModel.findById(user._id);
      expect(unchanged.name).toBe("a");
    });
  });

  describe("loginController", () => {
    it("should login successfully with valid credential", async () => {
      // Arrange
      let sampleUser = {
        name: "a",
        email: "a@a.com",
        password: "a",
        phone: "a",
        address: "a",
        answer: "a",
      };
      const hashedPassword = await hashPassword("a");
      sampleUser.password = hashedPassword;
      await userModel.create(sampleUser);

      // Act
      const res = await request(app)
        .post("/login")
        .send({ email: sampleUser.email, password: "a" });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: "login successfully",
      });
    });

    it("should fail to login with invalid credential", async () => {
      // Arrange
      let sampleUser = {
        name: "a",
        email: "a@a.com",
        password: "a",
        phone: "a",
        address: "a",
        answer: "a",
      };
      const hashedPassword = await hashPassword("a");
      sampleUser.password = hashedPassword;
      await userModel.create(sampleUser);

      // Act
      const res = await request(app)
        .post("/login")
        .send({ email: sampleUser.email, password: "b" }); // wrong password

      // Assert
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        success: false,
        message: "Invalid Password",
      });
    });
  });

  describe("forgotPasswordController", () => {
    it("should update password successfully", async () => {
      // Arrange
      let sampleUser = {
        name: "a",
        email: "a@a.com",
        password: "a",
        phone: "a",
        address: "a",
        answer: "a",
      };
      await userModel.create(sampleUser);

      // Act
      const res = await request(app).post("/forgot-password").send({
        email: sampleUser.email,
        answer: sampleUser.answer,
        newPassword: "b",
      });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: "Password Reset Successfully",
      });
      const dbUsers = await userModel.find({ email: sampleUser.email });
      expect(dbUsers.length).toBe(1);
      // check that new password "b" is updated in the db
      const isPasswordUpdated = await comparePassword("b", dbUsers[0].password);
      expect(isPasswordUpdated).toBe(true);
    });

    it("should return 404 if wrong answer is provided", async () => {
      // Arrange
      let sampleUser = {
        name: "a",
        email: "a@a.com",
        password: "a",
        phone: "a",
        address: "a",
        answer: "a",
      };
      await userModel.create(sampleUser);

      // Act
      const res = await request(app).post("/forgot-password").send({
        email: sampleUser.email,
        answer: "b",
        newPassword: "b",
      });

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        message: "Wrong Email Or Answer",
      });
      const dbUsers = await userModel.find({ email: sampleUser.email });
      expect(dbUsers.length).toBe(1);
      // check that password remains unchanged in the db
      expect(dbUsers[0].password).toBe(sampleUser.password);
    });
  });

  describe("updateProfileController", () => {
    let user;

    beforeEach(async () => {
      // Arrange
      let sampleUser = {
        name: "a",
        email: "a@a.com",
        password: "123456",
        phone: "a",
        address: "a",
        answer: "a",
      };
      user = await userModel.create(sampleUser);
    });

    beforeAll(async () => {
      const requireSignIn = (req, res, next) => {
        req.user = user;
        next();
      };
      app.put("/profile", requireSignIn, updateProfileController);
    });

    it("should update profile successfully", async () => {
      // Act
      const res = await request(app).put("/profile").send({
        password: "newPassword",
      });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: "Profile Updated Successfully",
      });
      const dbUser = await userModel.findById(user._id);
      // check that new password is updated and the rest unchanged in the db
      const isPasswordUpdated = await comparePassword(
        "newPassword",
        dbUser.password,
      );
      expect(isPasswordUpdated).toBe(true);
      expect(dbUser.name).toBe(user.name);
      expect(dbUser.address).toBe(user.address);
      expect(dbUser.phone).toBe(user.phone);
    });

    it("should return 422 if invalid password is provided", async () => {
      // Act
      const res = await request(app).put("/profile").send({
        password: "12345", // less than 6 character
      });

      // Assert
      expect(res.status).toBe(422);
      expect(res.body).toMatchObject({
        error: "Password is required and 6 character long",
      });
      const dbUser = await userModel.findById(user._id);
      // check that profile remain unchanged in the db
      expect(dbUser.password).toBe(user.password);
      expect(dbUser.name).toBe(user.name);
      expect(dbUser.address).toBe(user.address);
      expect(dbUser.phone).toBe(user.phone);
    });
  });
});
