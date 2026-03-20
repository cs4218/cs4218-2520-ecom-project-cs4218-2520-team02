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
describe("productFiltersController integration", () => {
  test("filters by category only", async () => {
    // Arrange
    const phones = await seedCategory({ name: "Phones", slug: "phones" });
    const laptops = await seedCategory({ name: "Laptops", slug: "laptops" });

    const [phoneOne, phoneTwo, laptopOne] = await seedProducts([
      { name: "Phone One", category: phones, price: 100 },
      { name: "Phone Two", category: phones, price: 250 },
      { name: "Laptop One", category: laptops, price: 1200 },
    ]);

    // Act
    const response = await request(app)
      .post("/api/v1/product/product-filters")
      .send({
        checked: [phones._id.toString()],
        radio: [],
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(idsOf(response.body.products)).toEqual(idsOf([phoneOne, phoneTwo]));
    expect(idsOf(response.body.products)).not.toContain(laptopOne._id.toString());
  });

  test("filters by price only", async () => {
    // Arrange
    const category = await seedCategory({ name: "Audio", slug: "audio" });

    const [belowRange, inRangeLow, inRangeHigh, aboveRange] = await seedProducts([
      { name: "Audio 49", category, price: 49 },
      { name: "Audio 100", category, price: 100 },
      { name: "Audio 200", category, price: 200 },
      { name: "Audio 201", category, price: 201 },
    ]);

    // Act
    const response = await request(app)
      .post("/api/v1/product/product-filters")
      .send({
        checked: [],
        radio: [100, 200],
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(idsOf(response.body.products)).toEqual(
      idsOf([inRangeLow, inRangeHigh]),
    );
    expect(idsOf(response.body.products)).not.toContain(
      belowRange._id.toString(),
    );
    expect(idsOf(response.body.products)).not.toContain(
      aboveRange._id.toString(),
    );
  });

  test("filters by category and price together", async () => {
    // Arrange
    const books = await seedCategory({ name: "Books", slug: "books" });
    const games = await seedCategory({ name: "Games", slug: "games" });

    const [matchOne, outOfRange, wrongCategory, matchTwo] = await seedProducts([
      { name: "Book 120", category: books, price: 120 },
      { name: "Book 500", category: books, price: 500 },
      { name: "Game 150", category: games, price: 150 },
      { name: "Book 180", category: books, price: 180 },
    ]);

    // Act
    const response = await request(app)
      .post("/api/v1/product/product-filters")
      .send({
        checked: [books._id.toString()],
        radio: [100, 200],
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(idsOf(response.body.products)).toEqual(idsOf([matchOne, matchTwo]));
    expect(idsOf(response.body.products)).not.toContain(
      outOfRange._id.toString(),
    );
    expect(idsOf(response.body.products)).not.toContain(
      wrongCategory._id.toString(),
    );
  });

  test("normalizes a reversed price range", async () => {
    // Arrange
    const category = await seedCategory({ name: "Home", slug: "home" });

    const [belowRange, inRangeLow, inRangeMid, inRangeHigh, aboveRange] =
      await seedProducts([
        { name: "Home 79", category, price: 79 },
        { name: "Home 100", category, price: 100 },
        { name: "Home 150", category, price: 150 },
        { name: "Home 200", category, price: 200 },
        { name: "Home 201", category, price: 201 },
      ]);

    // Act
    const response = await request(app)
      .post("/api/v1/product/product-filters")
      .send({
        checked: [],
        radio: [200, 100],
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(idsOf(response.body.products)).toEqual(
      idsOf([inRangeLow, inRangeMid, inRangeHigh]),
    );
    expect(idsOf(response.body.products)).not.toContain(
      belowRange._id.toString(),
    );
    expect(idsOf(response.body.products)).not.toContain(
      aboveRange._id.toString(),
    );
  });
});
