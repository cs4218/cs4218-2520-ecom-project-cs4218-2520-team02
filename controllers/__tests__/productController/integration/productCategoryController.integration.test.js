// Censon Lee Lemuel John Alejo, A0273436B
import request from "supertest";

import {
  idsOf,
  seedCategory,
  seedProducts,
  setupProductIntegrationSuite,
} from "./utils/integrationTestUtils.js";

const { app } = setupProductIntegrationSuite();

// ================= Tests =================
describe("productCategoryController integration", () => {
  test("resolves the category by slug and returns only products from that category with populated category data", async () => {
    // Arrange
    const targetCategory = await seedCategory({
      name: "Cameras",
      slug: "cameras",
    });
    const otherCategory = await seedCategory({
      name: "Tripods",
      slug: "tripods",
    });

    const [cameraOne, cameraTwo, tripodOne] = await seedProducts([
      { name: "Camera One", category: targetCategory, price: 800 },
      { name: "Camera Two", category: targetCategory, price: 1200 },
      { name: "Tripod One", category: otherCategory, price: 150 },
    ]);

    // Act
    const response = await request(app).get(
      "/api/v1/product/product-category/cameras",
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.category).toMatchObject({
      _id: targetCategory._id.toString(),
      name: "Cameras",
      slug: "cameras",
    });
    expect(idsOf(response.body.products)).toEqual(idsOf([cameraOne, cameraTwo]));
    expect(idsOf(response.body.products)).not.toContain(
      tripodOne._id.toString(),
    );

    response.body.products.forEach((product) => {
      expect(product.category).toMatchObject({
        _id: targetCategory._id.toString(),
        name: "Cameras",
        slug: "cameras",
      });
    });
  });
});
