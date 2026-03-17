// Censon Lee Lemuel John Alejo, A0273436B
import request from "supertest";

import {
  seedCategory,
  seedProducts,
  setupProductIntegrationSuite,
} from "./utils/integrationTestUtils.js";

const { app } = setupProductIntegrationSuite();

// ================= Tests =================
describe("relatedProductController integration", () => {
  test("returns at most 3 same-category products, excludes pid, excludes photo, and populates category", async () => {
    // Arrange
    const phones = await seedCategory({ name: "Phones", slug: "phones" });
    const laptops = await seedCategory({ name: "Laptops", slug: "laptops" });

    const [target, siblingOne, siblingTwo, siblingThree, siblingFour, outsider] =
      await seedProducts([
        { name: "Phone Target", category: phones, price: 500 },
        { name: "Phone One", category: phones, price: 400 },
        { name: "Phone Two", category: phones, price: 450 },
        { name: "Phone Three", category: phones, price: 550 },
        { name: "Phone Four", category: phones, price: 600 },
        { name: "Laptop One", category: laptops, price: 1500 },
      ]);

    const siblingIds = [
      siblingOne._id.toString(),
      siblingTwo._id.toString(),
      siblingThree._id.toString(),
      siblingFour._id.toString(),
    ];

    // Act
    const response = await request(app).get(
      `/api/v1/product/related-product/${target._id.toString()}/${phones._id.toString()}`,
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.products).toHaveLength(3);

    response.body.products.forEach((product) => {
      expect(siblingIds).toContain(product._id);
      expect(product._id).not.toBe(target._id.toString());
      expect(product._id).not.toBe(outsider._id.toString());
      expect(product).not.toHaveProperty("photo");
      expect(product.category).toMatchObject({
        _id: phones._id.toString(),
        name: "Phones",
        slug: "phones",
      });
    });
  });
});
