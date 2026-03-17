import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  jest,
} from "@jest/globals";

import productRouter from "../../../../../routes/productRoutes.js";
import categoryModel from "../../../../../models/categoryModel.js";
import productModel from "../../../../../models/productModel.js";

let mongoServer;
let categoryCounter = 0;
let productCounter = 0;

function slugifyValue(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createProductApiTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/product", productRouter);
  return app;
}

export function setupProductIntegrationSuite() {
  const app = createProductApiTestApp();
  let logSpy;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(async () => {
    categoryCounter = 0;
    productCounter = 0;

    const collections = Object.values(mongoose.connection.collections);
    await Promise.all(collections.map((collection) => collection.deleteMany({})));

    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
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
      mongoServer = undefined;
    }
  });

  return { app };
}

export async function seedCategory(overrides = {}) {
  categoryCounter += 1;

  const name = overrides.name ?? `Category ${categoryCounter}`;
  const slug = overrides.slug ?? slugifyValue(name);

  return categoryModel.create({
    name,
    slug,
    ...overrides,
  });
}

export async function seedProduct(overrides = {}) {
  productCounter += 1;

  const category = overrides.category ?? (await seedCategory());
  const categoryId = category?._id ?? category;

  const name = overrides.name ?? `Product ${productCounter}`;
  const slug = overrides.slug ?? slugifyValue(name);
  const createdAt =
    overrides.createdAt ?? new Date(Date.UTC(2024, 0, productCounter));
  const updatedAt = overrides.updatedAt ?? createdAt;

  const doc = {
    _id: overrides._id ?? new mongoose.Types.ObjectId(),
    name,
    slug,
    description: overrides.description ?? `Description ${productCounter}`,
    price: overrides.price ?? productCounter * 10,
    category: categoryId,
    quantity: overrides.quantity ?? 1,
    shipping: overrides.shipping ?? false,
    photo: overrides.photo ?? {
      data: Buffer.from(`photo-${productCounter}`),
      contentType: "image/png",
    },
    createdAt,
    updatedAt,
  };

  await productModel.collection.insertOne(doc);
  return productModel.findById(doc._id);
}

export async function seedProducts(definitions) {
  const products = [];

  for (const definition of definitions) {
    products.push(await seedProduct(definition));
  }

  return products;
}

export function idsOf(items) {
  return items.map((item) => item._id.toString()).sort();
}

export function namesOf(items) {
  return items.map((item) => item.name);
}

export function expectNoPhoto(items) {
  items.forEach((item) => {
    expect(item).not.toHaveProperty("photo");
  });
}
