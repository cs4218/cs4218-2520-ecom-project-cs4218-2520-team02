// Jovin Ang Yusheng, A0273460H
import mongoose from "mongoose";
import request from "supertest";

import {
    seedCategory,
    seedProduct,
    setupProductIntegrationSuite,
} from "./utils/integrationTestUtils.js";

const { app } = setupProductIntegrationSuite();

// =============== Tests ===============
describe("productPhotoController integration", () => {
    test("returns photo binary data with correct content type header", async () => {
        const category = await seedCategory({ name: "Cameras", slug: "cameras" });
        const photoBuffer = Buffer.from("fake-image-binary-data");

        const product = await seedProduct({
            name: "Camera X",
            category,
            price: 500,
            photo: {
                data: photoBuffer,
                contentType: "image/jpeg",
            },
        });

        const response = await request(app).get(
            `/api/v1/product/product-photo/${product._id}`
        );

        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/image\/jpeg/);
        expect(Buffer.from(response.body).toString()).toBe("fake-image-binary-data");
    });

    test("returns 404 when product exists but has no photo data", async () => {
        const category = await seedCategory({ name: "Audio", slug: "audio" });

        const product = await seedProduct({
            name: "Speaker Y",
            category,
            price: 80,
            photo: {},
        });

        const response = await request(app).get(
            `/api/v1/product/product-photo/${product._id}`
        );

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Photo not found");
    });

    test("returns 404 when product ID does not exist in database", async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app).get(
            `/api/v1/product/product-photo/${nonExistentId}`
        );

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Photo not found");
    });
});
