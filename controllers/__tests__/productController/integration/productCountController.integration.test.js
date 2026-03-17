// Censon Lee Lemuel John Alejo, A0273436B
import request from "supertest";

import productModel from "../../../../models/productModel.js";
import {
  seedCategory,
  seedProducts,
  setupProductIntegrationSuite,
} from "./utils/integrationTestUtils.js";

const { app } = setupProductIntegrationSuite();

// ================= Tests =================
describe("productCountController integration", () => {
  test("returns the same total as the database", async () => {
    // Arrange
    const category = await seedCategory({
      name: "Accessories",
      slug: "accessories",
    });

    await seedProducts([
      { name: "Case", category, price: 20 },
      { name: "Charger", category, price: 30 },
      { name: "Cable", category, price: 10 },
      { name: "Stand", category, price: 40 },
    ]);

    const expectedTotal = await productModel.countDocuments({});

    // Act
    const response = await request(app).get("/api/v1/product/product-count");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      total: expectedTotal,
    });
  });
});
