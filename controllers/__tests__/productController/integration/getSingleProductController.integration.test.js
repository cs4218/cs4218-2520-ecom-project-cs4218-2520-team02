// Jovin Ang Yusheng, A0273460H
import request from "supertest";

import {
    seedCategory,
    seedProduct,
    seedProducts,
    setupProductIntegrationSuite,
} from "./utils/integrationTestUtils.js";

const { app } = setupProductIntegrationSuite();

// =============== Tests ===============
describe("getSingleProductController integration", () => {
    test("returns the product matching the slug with populated category and no photo", async () => {
        const category = await seedCategory({ name: "Audio", slug: "audio" });

        const [target, other] = await seedProducts([
            {
                name: "Wireless Headphones",
                slug: "wireless-headphones",
                category,
                description: "Noise-cancelling wireless headphones",
                price: 199,
                quantity: 30,
                shipping: true,
            },
            {
                name: "Wired Earbuds",
                slug: "wired-earbuds",
                category,
                price: 29,
            },
        ]);

        const response = await request(app).get(
            "/api/v1/product/get-product/wireless-headphones"
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Single Product Fetched");

        const product = response.body.product;
        expect(product._id).toBe(target._id.toString());
        expect(product.name).toBe("Wireless Headphones");
        expect(product.slug).toBe("wireless-headphones");
        expect(product.description).toBe("Noise-cancelling wireless headphones");
        expect(product.price).toBe(199);
        expect(product.quantity).toBe(30);
        expect(product.shipping).toBe(true);

        expect(product.category).toMatchObject({
            _id: category._id.toString(),
            name: "Audio",
            slug: "audio",
        });

        expect(product).not.toHaveProperty("photo");
    });

    test("returns 404 when no product matches the given slug", async () => {
        const category = await seedCategory({ name: "Misc", slug: "misc" });
        await seedProduct({
            name: "Some Product",
            slug: "some-product",
            category,
            price: 10,
        });

        const response = await request(app).get(
            "/api/v1/product/get-product/non-existent-slug"
        );

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Product not found");
    });
});
