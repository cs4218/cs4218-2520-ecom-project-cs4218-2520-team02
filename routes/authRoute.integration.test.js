// Gavin Sin Fu Chen, A0273285X
import dotenv from "dotenv";
dotenv.config(); // needed to load process.env config in loginController
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { beforeAll, jest } from "@jest/globals";

import userModel from "../models/userModel.js";
import { loginController } from "../controllers/authController.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";
import { hashPassword } from "../helpers/authHelper.js";

describe("Auth Route Integration", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    process.env.JWT_SECRET = "testsecret";
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());

    // follow the same codes in authRoute to emulate protected route
    app.post("/login", loginController);
    app.get("/user-auth", requireSignIn, (req, res) => {
      res.status(200).send({ ok: true });
    });
    app.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
      res.status(200).send({ ok: true });
    });
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("test protected user route auth", () => {
    it("allows access when a valid token is provided", async () => {
      // Arrange
      const sampleUser = {
        name: "a",
        email: "a@example.com",
        password: await hashPassword("123456"),
        phone: "a",
        address: "a",
        answer: "a",
      };
      await userModel.create(sampleUser);
      const loginRes = await request(app).post("/login").send({
        email: sampleUser.email,
        password: "123456",
      }); // login already

      // Act
      const response = await request(app)
        .get("/user-auth")
        .set("Authorization", loginRes.body.token);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it("rejects access when token is invalid", async () => {
      // Act
      const response = await request(app)
        .get("/user-auth")
        .set("Authorization", "invalid-token");

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        message: "Invalid token",
      });
    });
  });

  describe("test protected admin route auth", () => {
    it("allows access for admin users with valid token", async () => {
      // Arrange
      const sampleUser = {
        name: "a",
        email: "a@example.com",
        password: await hashPassword("123456"),
        phone: "a",
        address: "a",
        answer: "a",
      };
      await userModel.create(sampleUser);
      // grant admin role
      await userModel.updateOne({ email: sampleUser.email }, { role: 1 });
      const loginRes = await request(app).post("/login").send({
        email: sampleUser.email,
        password: "123456",
      }); // login first

      // Act
      const res = await request(app)
        .get("/admin-auth")
        .set("Authorization", loginRes.body.token);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it("rejects access for non-admin users", async () => {
      // Arrange
      const sampleUser = {
        name: "a",
        email: "a@example.com",
        password: await hashPassword("123456"),
        phone: "a",
        address: "a",
        answer: "a",
      };
      await userModel.create(sampleUser);
      const loginRes = await request(app).post("/login").send({
        email: sampleUser.email,
        password: "123456",
      });

      // Act
      const response = await request(app)
        .get("/admin-auth")
        .set("Authorization", loginRes.body.token);

      // Assert
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        message: "Admin access required",
      });
    });
  });
});
