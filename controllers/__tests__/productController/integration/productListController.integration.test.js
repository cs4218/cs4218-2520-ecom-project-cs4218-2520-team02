// Censon Lee Lemuel John Alejo, A0273436B
import request from "supertest";

import {
  expectNoPhoto,
  namesOf,
  seedCategory,
  seedProducts,
  setupProductIntegrationSuite,
} from "./utils/integrationTestUtils.js";

const { app } = setupProductIntegrationSuite();

// ================= Helpers =================
function buildPagedProducts(category) {
  return seedProducts([
    {
      name: "Product 1",
      category,
      price: 10,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    },
    {
      name: "Product 2",
      category,
      price: 20,
      createdAt: new Date("2024-01-02T00:00:00.000Z"),
    },
    {
      name: "Product 3",
      category,
      price: 30,
      createdAt: new Date("2024-01-03T00:00:00.000Z"),
    },
    {
      name: "Product 4",
      category,
      price: 40,
      createdAt: new Date("2024-01-04T00:00:00.000Z"),
    },
    {
      name: "Product 5",
      category,
      price: 50,
      createdAt: new Date("2024-01-05T00:00:00.000Z"),
    },
    {
      name: "Product 6",
      category,
      price: 60,
      createdAt: new Date("2024-01-06T00:00:00.000Z"),
    },
    {
      name: "Product 7",
      category,
      price: 70,
      createdAt: new Date("2024-01-07T00:00:00.000Z"),
    },
    {
      name: "Product 8",
      category,
      price: 80,
      createdAt: new Date("2024-01-08T00:00:00.000Z"),
    },
  ]);
}

// ================= Tests =================
describe("productListController integration", () => {
  test("returns page 1 with at most 6 products sorted by createdAt descending and without photo", async () => {
    // Arrange
    const category = await seedCategory({ name: "Paged", slug: "paged" });
    await buildPagedProducts(category);

    // Act
    const response = await request(app).get("/api/v1/product/product-list/1");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.products).toHaveLength(6);
    expect(namesOf(response.body.products)).toEqual([
      "Product 8",
      "Product 7",
      "Product 6",
      "Product 5",
      "Product 4",
      "Product 3",
    ]);
    expectNoPhoto(response.body.products);
  });

  test("returns page 2 with the remaining products only", async () => {
    // Arrange
    const category = await seedCategory({ name: "Paged", slug: "paged" });
    await buildPagedProducts(category);

    // Act
    const response = await request(app).get("/api/v1/product/product-list/2");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.products).toHaveLength(2);
    expect(namesOf(response.body.products)).toEqual(["Product 2", "Product 1"]);
    expectNoPhoto(response.body.products);
  });
});
