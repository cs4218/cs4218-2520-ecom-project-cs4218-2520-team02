// Jovin Ang Yusheng, A0273460H
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import formidable from "express-formidable";
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
describe("updateProductController integration", () => {
    let logSpy;
    let category;
    let existingProduct;

    beforeAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        const { updateProductController } = await import(
            "../../../productController.js"
        );

        app = express();
        app.put(
            "/api/v1/product/update-product/:pid",
            mockAuthMiddleware,
            formidable(),
            updateProductController
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

        existingProduct = await productModel.create({
            name: "Old Keyboard",
            slug: slugify("Old Keyboard"),
            description: "An old keyboard",
            price: 40,
            quantity: 20,
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

    test("updates product fields and persists changes in the database", async () => {
        const response = await request(app)
            .put(`/api/v1/product/update-product/${existingProduct._id}`)
            .field("name", "New Keyboard")
            .field("description", "A brand new keyboard")
            .field("price", "89")
            .field("quantity", "50")
            .field("category", category._id.toString())
            .field("shipping", "true");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Product Updated Successfully");

        const updated = await productModel.findById(existingProduct._id);
        expect(updated.name).toBe("New Keyboard");
        expect(updated.description).toBe("A brand new keyboard");
        expect(updated.price).toBe(89);
        expect(updated.quantity).toBe(50);
        expect(updated.slug).toBe("New-Keyboard");
    });

    test("updates product with a new photo and stores the photo data", async () => {
        const photoBuffer = Buffer.from("new-photo-data");

        const response = await request(app)
            .put(`/api/v1/product/update-product/${existingProduct._id}`)
            .field("name", "Old Keyboard")
            .field("description", "An old keyboard")
            .field("price", "40")
            .field("quantity", "20")
            .field("category", category._id.toString())
            .field("shipping", "false")
            .attach("photo", photoBuffer, "keyboard.jpg");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        const updated = await productModel.findById(existingProduct._id);
        expect(updated.photo.data).toBeTruthy();
        expect(updated.photo.contentType).toBeTruthy();
    });

    test("returns 404 when updating a product that does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app)
            .put(`/api/v1/product/update-product/${nonExistentId}`)
            .field("name", "Ghost Product")
            .field("description", "Does not exist")
            .field("price", "10")
            .field("quantity", "1")
            .field("category", category._id.toString())
            .field("shipping", "false");

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Product not found");
    });
});
