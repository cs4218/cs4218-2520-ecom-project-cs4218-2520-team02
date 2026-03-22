// Jovin Ang Yusheng, A0273460H
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import formidable from "express-formidable";

import productModel from "../../../../models/productModel.js";
import categoryModel from "../../../../models/categoryModel.js";

// =============== Setup ===============
let mongoServer;
let app;

const mockAuthMiddleware = (req, res, next) => {
    req.user = { _id: new mongoose.Types.ObjectId().toString() };
    next();
};

// =============== Tests ===============
describe("createProductController integration", () => {
    let logSpy;
    let category;

    beforeAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        const { createProductController } = await import(
            "../../../productController.js"
        );

        app = express();
        app.post(
            "/api/v1/product/create-product",
            mockAuthMiddleware,
            formidable(),
            createProductController
        );
    });

    beforeEach(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
        logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        category = await categoryModel.create({
            name: "Electronics",
            slug: "electronics",
        });
    });

    afterEach(() => {
        logSpy.mockRestore();
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    test("creates a product and persists it in the database", async () => {
        const response = await request(app)
            .post("/api/v1/product/create-product")
            .field("name", "Wireless Keyboard")
            .field("description", "Mechanical wireless keyboard")
            .field("price", "79")
            .field("quantity", "50")
            .field("category", category._id.toString())
            .field("shipping", "true");

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Product Created Successfully");
        expect(response.body.products.name).toBe("Wireless Keyboard");
        expect(response.body.products.slug).toBe("Wireless-Keyboard");

        const saved = await productModel.findById(response.body.products._id);
        expect(saved).not.toBeNull();
        expect(saved.name).toBe("Wireless Keyboard");
        expect(saved.description).toBe("Mechanical wireless keyboard");
        expect(saved.price).toBe(79);
        expect(saved.quantity).toBe(50);
        expect(saved.category.toString()).toBe(category._id.toString());
    });

    test("creates a product with a photo and stores the photo data", async () => {
        const photoBuffer = Buffer.from("fake-image-data");

        const response = await request(app)
            .post("/api/v1/product/create-product")
            .field("name", "Camera Lens")
            .field("description", "50mm prime lens")
            .field("price", "299")
            .field("quantity", "10")
            .field("category", category._id.toString())
            .field("shipping", "false")
            .attach("photo", photoBuffer, "lens.jpg");

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);

        const saved = await productModel.findById(response.body.products._id);
        expect(saved).not.toBeNull();
        expect(saved.name).toBe("Camera Lens");
        expect(saved.photo.data).toBeTruthy();
        expect(saved.photo.contentType).toBeTruthy();
    });
});
