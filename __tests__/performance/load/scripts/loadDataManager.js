// Jovin Ang Yusheng, A0273460H
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { hashPassword } from "../../../../helpers/authHelper.js";
import orderModel from "../../../../models/orderModel.js";
import productModel from "../../../../models/productModel.js";
import userModel from "../../../../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../../");

dotenv.config({ path: path.resolve(projectRoot, ".env") });

function getPoolSize(flow) {
  const flowKey = `${flow.toUpperCase()}_USER_POOL_SIZE`;
  const rawValue = process.env[flowKey] || process.env.LOAD_USER_POOL_SIZE || "8";
  const parsed = Number(rawValue);

  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error(`Invalid user pool size "${rawValue}" for flow ${flow}.`);
  }

  return parsed;
}

function getSeedPassword() {
  return process.env.LOAD_SEEDED_USER_PASSWORD || "Load1234!";
}

function buildLoadEmail(runId, flow, index) {
  return `load-${runId}-${flow}-seed-${index + 1}@example.com`;
}

function buildLoadPrefix(runId) {
  return `load-${runId}-`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLoadEmailMatcher(runId) {
  if (!runId) {
    return { $regex: /^load-/ };
  }

  const prefix = buildLoadPrefix(runId);
  return { $regex: new RegExp(`^${escapeRegex(prefix)}`) };
}

function buildUserPool(flow, runId, count) {
  return Array.from({ length: count }, (_, index) => ({
    label: `${flow}-user-${index + 1}`,
    email: buildLoadEmail(runId, flow, index),
    password: getSeedPassword(),
    name: `Load ${flow} User ${index + 1}`,
  }));
}

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error("MONGO_URL is required to seed load-test data.");
  }

  await mongoose.connect(mongoUrl);
}

async function ensureUsersExist(userPool) {
  const hashedPassword = await hashPassword(getSeedPassword());

  for (const user of userPool) {
    await userModel.updateOne(
      { email: user.email },
      {
        $set: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          phone: "91234567",
          address: "123 Load Street",
          answer: "Soccer",
          role: 0,
        },
      },
      { upsert: true }
    );
  }

  return userModel.find({ email: { $in: userPool.map((user) => user.email) } });
}

async function ensureOrderHistory(users) {
  const products = await productModel.find({}).select("_id").limit(3);

  if (products.length === 0) {
    throw new Error("At least one product is required to seed order-history load users.");
  }

  const productIds = products.map((product) => product._id);

  for (const user of users) {
    await orderModel.create({
      products: productIds,
      payment: {
        success: true,
        transaction: {
          id: `load-order-${user._id.toString()}`,
        },
      },
      buyer: user._id,
      status: "Delivered",
    });
  }
}

export async function prepareLoadData(flow, runId) {
  const seededFlows = new Set(["auth.login", "orders", "payment"]);
  if (!seededFlows.has(flow)) {
    return {
      runId,
      userPool: [],
      seededUserCount: 0,
    };
  }

  await connectToDatabase();
  await cleanupLoadData();

  const userPool = buildUserPool(flow, runId, getPoolSize(flow));
  const users = await ensureUsersExist(userPool);

  if (flow === "orders") {
    await ensureOrderHistory(users);
  }

  return {
    runId,
    userPool,
    seededUserCount: users.length,
  };
}

export async function cleanupLoadData(runId) {
  await connectToDatabase();

  const users = await userModel.find({ email: buildLoadEmailMatcher(runId) }).select("_id email");
  const userIds = users.map((user) => user._id);
  let deletedOrders = 0;
  let deletedUsers = 0;

  if (userIds.length > 0) {
    const orderResult = await orderModel.deleteMany({ buyer: { $in: userIds } });
    const userResult = await userModel.deleteMany({ _id: { $in: userIds } });
    deletedOrders = orderResult.deletedCount || 0;
    deletedUsers = userResult.deletedCount || 0;
  }

  return {
    deletedUsers,
    deletedOrders,
  };
}

export async function disconnectLoadDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function getProjectRoot() {
  return projectRoot;
}
