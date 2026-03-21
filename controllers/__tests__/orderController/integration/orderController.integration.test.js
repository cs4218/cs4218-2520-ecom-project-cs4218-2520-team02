// Song Jia Hui A0259494L
// Integration tests: orderController + authMiddleware + Express router + MongoDB
// Approach: Bottom-up integration - real Express app is constructed with the
// real auth router (which mounts requireSignIn, isAdmin, and the order
// controllers), connected to a real in-memory MongoDB instance via
// MongoMemoryServer. No controller, middleware, or model is mocked.

import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import JWT from "jsonwebtoken";
import authRoute from "../../../../routes/authRoute.js";
import orderModel from "../../../../models/orderModel.js";
import userModel from "../../../../models/userModel.js";
import productModel from "../../../../models/productModel.js";
import { jest } from "@jest/globals";
import {
  getOrdersController,
  getAllOrdersController,
  updateOrderStatusController,
} from "../../../orderController.js";

// ─── App setup ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use("/api/v1/auth", authRoute);

const setFakeUser = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId() };
  next();
};

const bareApp = express();
bareApp.use(express.json());

bareApp.get("/bare/orders-no-user", getOrdersController);
bareApp.get("/bare/orders", setFakeUser, getOrdersController);

bareApp.get("/bare/all-orders", getAllOrdersController);
bareApp.put("/bare/order-status/:orderId", updateOrderStatusController);
bareApp.put("/bare/order-status-no-id", updateOrderStatusController);

// ─── In-memory MongoDB ───────────────────────────────────────────────────────

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  process.env.JWT_SECRET = "test-secret";
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoServer.getUri());
  }
  await orderModel.deleteMany({});
  await userModel.deleteMany({});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates a real user document in MongoDB and returns a signed JWT.
 * The token is generated with the same JWT_SECRET so requireSignIn
 * can verify it. This tests the real middleware code path.
 */
const createUserAndToken = async (overrides = {}) => {
  const user = await userModel.create({
    name: "Test User",
    email: `user-${Date.now()}@example.com`,
    password: "hashedpassword",
    phone: "91234567",
    address: "123 Test Street",
    role: 0,
    answer: "test-answer",
    ...overrides,
  });

  const token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  return { user, token };
};

/**
 * Creates a real order document linked to a real buyer and product refs.
 */
const createOrder = async (buyerId, overrides = {}) => {
  return orderModel.create({
    buyer: buyerId,
    products: [],
    payment: { success: true },
    status: "Not Processed",
    ...overrides,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: requireSignIn middleware integration
// ─────────────────────────────────────────────────────────────────────────────

describe("requireSignIn middleware - token validation", () => {
  it("rejects request with no Authorization header", async () => {
    const res = await request(app).get("/api/v1/auth/orders").expect(401);

    expect(res.body.success).toBe(false);
  });

  it("rejects request with malformed token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid token");
  });

  it("rejects request with malformed Bearer format", async () => {
    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", "notbearer xyz")
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it("accepts request with valid JWT and passes to controller", async () => {
    const { token } = await createUserAndToken();

    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.orders).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: isAdmin middleware integration
// ─────────────────────────────────────────────────────────────────────────────

describe("isAdmin middleware - role-based access control", () => {
  it("rejects non-admin user from all-orders route with 403", async () => {
    const { token } = await createUserAndToken({ role: 0 });

    const res = await request(app)
      .get("/api/v1/auth/all-orders")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Admin access required");
  });

  it("rejects non-admin user from order-status update route with 403", async () => {
    const { token } = await createUserAndToken({ role: 0 });
    const { user: admin } = await createUserAndToken({ role: 1 });
    const order = await createOrder(admin._id);

    const res = await request(app)
      .put(`/api/v1/auth/order-status/${order._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Shipped" })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Admin access required");
  });

  it("allows admin user through to getAllOrdersController", async () => {
    const { token } = await createUserAndToken({ role: 1 });

    const res = await request(app)
      .get("/api/v1/auth/all-orders")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.orders).toEqual([]);
  });

  it("rejects token for user not found in database", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const token = JWT.sign({ _id: fakeId }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const res = await request(app)
      .get("/api/v1/auth/all-orders")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User not found");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: getOrdersController - user order retrieval
// ─────────────────────────────────────────────────────────────────────────────

describe("getOrdersController - user order retrieval", () => {
  it("returns empty orders array when user has no orders", async () => {
    const { token } = await createUserAndToken();

    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.orders).toHaveLength(0);
  });

  it("returns only the authenticated user's orders", async () => {
    const { user: userA, token: tokenA } = await createUserAndToken();
    const { user: userB } = await createUserAndToken({
      email: "userb@example.com",
    });

    await createOrder(userA._id, { status: "Processing" });
    await createOrder(userA._id, { status: "Shipped" });
    await createOrder(userB._id, { status: "Delivered" });

    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.orders).toHaveLength(2);

    res.body.orders.forEach((order) => {
      expect(order.buyer._id.toString()).toBe(userA._id.toString());
    });
  });

  it("returns order with buyer name populated", async () => {
    const { user, token } = await createUserAndToken({ name: "Alice Tan" });
    await createOrder(user._id);

    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.orders[0].buyer.name).toBe("Alice Tan");
  });

  it("returns order with correct status and payment fields", async () => {
    const { user, token } = await createUserAndToken();
    await createOrder(user._id, {
      status: "Shipped",
      payment: { success: true, amount: 99 },
    });

    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.orders[0].status).toBe("Shipped");
    expect(res.body.orders[0].payment.success).toBe(true);
  });

  it("returns 401 when req.user is not set - line 7", async () => {
    const res = await request(bareApp).get("/bare/orders-no-user").expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Not signed in");
  });

  it("returns 500 when database throws - lines 23-24", async () => {
    await mongoose.disconnect();

    const res = await request(bareApp).get("/bare/orders").expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Error while getting orders");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: getAllOrdersController - admin order retrieval
// ─────────────────────────────────────────────────────────────────────────────

describe("getAllOrdersController - admin order retrieval", () => {
  it("returns all orders across all users sorted by createdAt descending", async () => {
    const { user: admin, token: adminToken } = await createUserAndToken({
      role: 1,
    });
    const { user: userA } = await createUserAndToken({
      email: "usera@example.com",
    });
    const { user: userB } = await createUserAndToken({
      email: "userb@example.com",
    });

    // Create orders with a small delay to ensure distinct createdAt values
    const orderA = await createOrder(userA._id, { status: "Processing" });
    await new Promise((r) => setTimeout(r, 10));
    const orderB = await createOrder(userB._id, { status: "Shipped" });

    const res = await request(app)
      .get("/api/v1/auth/all-orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.orders).toHaveLength(2);

    // Sorted descending - orderB (newer) comes first
    expect(res.body.orders[0]._id.toString()).toBe(orderB._id.toString());
    expect(res.body.orders[1]._id.toString()).toBe(orderA._id.toString());
  });

  it("returns empty array when no orders exist", async () => {
    const { token } = await createUserAndToken({ role: 1 });

    const res = await request(app)
      .get("/api/v1/auth/all-orders")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.orders).toHaveLength(0);
  });

  it("returns orders with buyer name populated for all users", async () => {
    const { token: adminToken } = await createUserAndToken({ role: 1 });
    const { user: buyer } = await createUserAndToken({
      name: "Bob Lee",
      email: "bob@example.com",
    });
    await createOrder(buyer._id);

    const res = await request(app)
      .get("/api/v1/auth/all-orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.orders[0].buyer.name).toBe("Bob Lee");
  });

  it("returns 500 when database throws - lines 47-48", async () => {
    await mongoose.disconnect();

    const res = await request(bareApp).get("/bare/all-orders").expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Error while getting orders");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: updateOrderStatusController - order status update
// ─────────────────────────────────────────────────────────────────────────────

describe("updateOrderStatusController - order status update", () => {
  it("updates order status and returns updated order", async () => {
    const { user: admin, token: adminToken } = await createUserAndToken({
      role: 1,
    });
    const { user: buyer } = await createUserAndToken({
      email: "buyer@example.com",
    });
    const order = await createOrder(buyer._id, { status: "Not Processed" });

    const res = await request(app)
      .put(`/api/v1/auth/order-status/${order._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Processing" })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Order status updated");
    expect(res.body.order.status).toBe("Processing");
    expect(res.body.order._id.toString()).toBe(order._id.toString());
  });

  it("persists status change to MongoDB", async () => {
    const { token: adminToken } = await createUserAndToken({ role: 1 });
    const { user: buyer } = await createUserAndToken({
      email: "buyer@example.com",
    });
    const order = await createOrder(buyer._id, { status: "Not Processed" });

    await request(app)
      .put(`/api/v1/auth/order-status/${order._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Shipped" })
      .expect(200);

    const updated = await orderModel.findById(order._id);
    expect(updated.status).toBe("Shipped");
  });

  it("returns 404 when order ID does not exist in MongoDB", async () => {
    const { token: adminToken } = await createUserAndToken({ role: 1 });
    const fakeOrderId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .put(`/api/v1/auth/order-status/${fakeOrderId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Shipped" })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Order not found");
  });

  it("returns 400 when status is missing from request body", async () => {
    const { token: adminToken } = await createUserAndToken({ role: 1 });
    const { user: buyer } = await createUserAndToken({
      email: "buyer@example.com",
    });
    const order = await createOrder(buyer._id);

    const res = await request(app)
      .put(`/api/v1/auth/order-status/${order._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Status is required");
  });

  it("updates through all valid status transitions", async () => {
    const { token: adminToken } = await createUserAndToken({ role: 1 });
    const { user: buyer } = await createUserAndToken({
      email: "buyer@example.com",
    });
    const order = await createOrder(buyer._id, { status: "Not Processed" });

    const statuses = ["Processing", "Shipped", "Delivered", "Cancelled"];

    for (const status of statuses) {
      const res = await request(app)
        .put(`/api/v1/auth/order-status/${order._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status })
        .expect(200);

      expect(res.body.order.status).toBe(status);
    }

    // Final state persisted correctly
    const final = await orderModel.findById(order._id);
    expect(final.status).toBe("Cancelled");
  });

  it("returns 400 when orderId is missing from params - line 63", async () => {
    const res = await request(bareApp)
      .put("/bare/order-status-no-id")
      .send({ status: "Shipped" })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Order ID is required");
  });

  it("returns 500 when database throws - lines 95-96", async () => {
    const { user: buyer } = await createUserAndToken({
      email: "buyer-500@example.com",
    });
    const order = await createOrder(buyer._id);

    await mongoose.disconnect();

    const res = await request(bareApp)
      .put(`/bare/order-status/${order._id}`)
      .send({ status: "Shipped" })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Error while updating order status");
  });
});
