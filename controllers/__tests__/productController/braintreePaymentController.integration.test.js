// Yap Zhao Yi, A0277540B
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import slugify from "slugify";

import productModel from "../../../models/productModel.js";
import categoryModel from "../../../models/categoryModel.js";
import orderModel from "../../../models/orderModel.js";

// Mocks
const mockTransactionSale = jest.fn();
await jest.unstable_mockModule("braintree", () => ({
  default: {
    BraintreeGateway: jest.fn(function () {
      this.transaction = { sale: mockTransactionSale };
    }),
    Environment: { Sandbox: "sandbox" },
  },
}));

const { braintreePaymentController } = await import("../../../controllers/productController.js");

const mockAuthMiddleware = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId().toString() };
  next();
};

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  slugify.extend({ ".": "-" });

  app.post("/braintree/payment", mockAuthMiddleware, braintreePaymentController);
  return app;
};

// Note: validation branches are already covered by unit tests
describe("BraintreePaymentController Integration Test", () => {
  let app;
  let testCategory;
  let cart;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = createTestApp();
  });

  beforeEach(async () => {
    
    jest.clearAllMocks();
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
    await orderModel.deleteMany({});

    testCategory = await categoryModel.create({ name: "CategoryA", slug: "categorya" });

    const p1 = await productModel.create({
      name: "ProductA",
      price: 1,
      quantity: 5,
      category: testCategory._id,
      description: "ProductA Description",
      slug: slugify("ProductA"),
    });
    const p2 = await productModel.create({
      name: "ProductB",
      price: 10,
      quantity: 8,
      category: testCategory._id,
      description: "ProductB Description",
      slug: slugify("ProductB"),
    });

    cart = [p1.toObject(), p2.toObject()];

    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should process payment and create an order", async () => {
    
    // Arrange
    const nonce = "fake-nonce";
    const mockResult = { success: true, transaction: { id: "txn123", amount: "85.00" } };
    mockTransactionSale.mockImplementation((options, cb) => cb(null, mockResult));

    // Act
    const res = await request(app).post("/braintree/payment").send({ nonce, cart });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transaction).toEqual(mockResult);
    expect(res.body.orderId).toBeDefined();

    const savedOrder = await orderModel.findById(res.body.orderId);
    expect(savedOrder).not.toBeNull();
    expect(savedOrder.products.length).toBe(2);
    expect(savedOrder.payment.transaction.id).toBe("txn123");
  });

  it("should return 500 and not create order on payment failure", async () => {
    
    // Arrange
    const nonce = "bad-nonce";
    const errorResult = { success: false, message: "Internal server error while processing transaction." };
    mockTransactionSale.mockImplementation((options, cb) => cb(errorResult, null));

    // Act
    const res = await request(app).post("/braintree/payment").send({ nonce, cart });

    // Assert
    expect(res.status).toBe(500);
    expect(res.body).toEqual(errorResult);

    const orders = await orderModel.find();
    expect(orders.length).toBe(0);
  });
});