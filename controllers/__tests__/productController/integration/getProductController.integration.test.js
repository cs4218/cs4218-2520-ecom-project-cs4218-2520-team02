// Jovin Ang Yusheng, A0273460H
import request from "supertest";

import {
    expectNoPhoto,
    seedCategory,
    seedProducts,
    setupProductIntegrationSuite,
} from "./utils/integrationTestUtils.js";

const { app } = setupProductIntegrationSuite();

// =============== Tests ===============
describe("getProductController integration", () => {
    test("returns all products sorted by createdAt descending with populated categories and no photo", async () => {
        const category = await seedCategory({ name: "Electronics", slug: "electronics" });

        const [older, newer] = await seedProducts([
            {
                name: "Old Product",
                category,
                price: 50,
                createdAt: new Date("2025-01-01"),
            },
            {
                name: "New Product",
                category,
                price: 100,
                createdAt: new Date("2026-01-01"),
            },
        ]);

        const response = await request(app).get("/api/v1/product/get-product");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.countTotal).toBe(2);
        expect(response.body.products).toHaveLength(2);

        expect(response.body.products[0]._id).toBe(newer._id.toString());
        expect(response.body.products[1]._id).toBe(older._id.toString());

        response.body.products.forEach((product) => {
            expect(product.category).toMatchObject({
                _id: category._id.toString(),
                name: "Electronics",
                slug: "electronics",
            });
        });

        expectNoPhoto(response.body.products);
    });

    test("returns empty array when no products exist", async () => {
        const response = await request(app).get("/api/v1/product/get-product");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.countTotal).toBe(0);
        expect(response.body.products).toEqual([]);
    });

    test("limits results to 12 products", async () => {
        const category = await seedCategory({ name: "Bulk", slug: "bulk" });

        const definitions = Array.from({ length: 15 }, (_, i) => ({
            name: `Product ${i + 1}`,
            category,
            price: (i + 1) * 10,
            createdAt: new Date(Date.UTC(2025, 0, i + 1)),
        }));

        await seedProducts(definitions);

        const response = await request(app).get("/api/v1/product/get-product");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.countTotal).toBe(12);
        expect(response.body.products).toHaveLength(12);
    });
});
