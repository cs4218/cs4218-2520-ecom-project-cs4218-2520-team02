// Censon Lee Lemuel John Alejo, A0273436B
import request from "supertest";

import {
  expectNoPhoto,
  idsOf,
  seedCategory,
  seedProducts,
  setupProductIntegrationSuite,
} from "./utils/integrationTestUtils.js";

const { app } = setupProductIntegrationSuite();

// ================= Tests =================
describe("searchProductController integration", () => {
  test("matches product names case-insensitively", async () => {
    // Arrange
    const category = await seedCategory({ name: "Computers", slug: "computers" });

    const [matchingOne, matchingTwo, nonMatching] = await seedProducts([
      {
        name: "Laptop Pro",
        category,
        description: "Portable workstation",
        price: 1200,
      },
      {
        name: "Ultra LAPTOP Stand",
        category,
        description: "Desk accessory",
        price: 100,
      },
      {
        name: "Desktop Tower",
        category,
        description: "Office desktop",
        price: 900,
      },
    ]);

    // Act
    const response = await request(app).get("/api/v1/product/search/lApToP");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(idsOf(response.body.results)).toEqual(
      idsOf([matchingOne, matchingTwo]),
    );
    expect(idsOf(response.body.results)).not.toContain(
      nonMatching._id.toString(),
    );
    expectNoPhoto(response.body.results);
  });

  test("matches product descriptions case-insensitively", async () => {
    // Arrange
    const category = await seedCategory({ name: "Gaming", slug: "gaming" });

    const [matchingOne, matchingTwo, nonMatching] = await seedProducts([
      {
        name: "Console A",
        category,
        description: "Includes immersive ray tracing support",
        price: 500,
      },
      {
        name: "Controller B",
        category,
        description: "RAY TRACING themed limited edition",
        price: 80,
      },
      {
        name: "Headset C",
        category,
        description: "Surround sound audio",
        price: 60,
      },
    ]);

    // Act
    const response = await request(app).get("/api/v1/product/search/rAy%20TrAcInG");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(idsOf(response.body.results)).toEqual(
      idsOf([matchingOne, matchingTwo]),
    );
    expect(idsOf(response.body.results)).not.toContain(
      nonMatching._id.toString(),
    );
    expectNoPhoto(response.body.results);
  });

  test("escapes regex special characters and matches literal text", async () => {
    // Arrange
    const category = await seedCategory({ name: "Books", slug: "books" });

    const [literalMatch, nonMatch] = await seedProducts([
      {
        name: "Regex Guide",
        category,
        description: "Contains the literal .* token in examples",
        price: 30,
      },
      {
        name: "Regex Overview",
        category,
        description: "Explains wildcard operators in general",
        price: 25,
      },
    ]);

    // Act
    const response = await request(app).get(
      `/api/v1/product/search/${encodeURIComponent(".*")}`,
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(idsOf(response.body.results)).toEqual(idsOf([literalMatch]));
    expect(idsOf(response.body.results)).not.toContain(nonMatch._id.toString());
    expectNoPhoto(response.body.results);
  });
});
