// Jovin Ang Yusheng, A0273460H
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import slugify from "slugify";

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
describe("deleteProductController integration", () => {
    let logSpy;
    let category;
    let existingProduct;

    beforeAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        const { deleteProductController } = await import(
            "../../../productController.js"
        );

        app = express();
        app.delete(
            "/api/v1/product/delete-product/:pid",
            mockAuthMiddleware,
            deleteProductController
        );
    });

    beforeEach(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
        logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        category = await categoryModel.create({
            name: "Gadgets",
            slug: "gadgets",
        });

        existingProduct = await productModel.create({
            name: "Smart Watch",
            slug: slugify("Smart Watch"),
            description: "A smart watch",
            price: 199,
            quantity: 5,
            category: category._id,
            shipping: false,
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

    test("deletes an existing product and removes it from the database", async () => {
        const response = await request(app).delete(
            `/api/v1/product/delete-product/${existingProduct._id}`
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Product Deleted successfully");

        const deleted = await productModel.findById(existingProduct._id);
        expect(deleted).toBeNull();
    });

    test("returns 404 when deleting a product that does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app).delete(
            `/api/v1/product/delete-product/${nonExistentId}`
        );

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Product not found");
    });
});
