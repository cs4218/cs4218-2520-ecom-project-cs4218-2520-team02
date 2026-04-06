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
  const rawValue = process.env[flowKey] || process.env.STRESS_USER_POOL_SIZE || "8";
  const parsed = Number(rawValue);

  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error(`Invalid user pool size "${rawValue}" for flow ${flow}.`);
  }

  return parsed;
}

function getSeedPassword() {
  return process.env.STRESS_SEEDED_USER_PASSWORD || "Stress1234!";
}

function buildStressEmail(runId, flow, index) {
  return `stress-${runId}-${flow}-seed-${index + 1}@example.com`;
}

function buildStressPrefix(runId) {
  return `stress-${runId}-`;
}

function buildUserPool(flow, runId, count) {
  return Array.from({ length: count }, (_, index) => ({
    label: `${flow}-user-${index + 1}`,
    email: buildStressEmail(runId, flow, index),
    password: getSeedPassword(),
    name: `Stress ${flow} User ${index + 1}`,
  }));
}

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error("MONGO_URL is required to seed stress-test data.");
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
          address: "123 Stress Street",
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
    throw new Error("At least one product is required to seed order-history stress users.");
  }

  const productIds = products.map((product) => product._id);

  for (const user of users) {
    await orderModel.create({
      products: productIds,
      payment: {
        success: true,
        transaction: {
          id: `stress-order-${user._id.toString()}`,
        },
      },
      buyer: user._id,
      status: "Delivered",
    });
  }
}

export async function prepareStressData(flow, runId) {
  const seededFlows = new Set(["auth", "orders", "payment"]);
  if (!seededFlows.has(flow)) {
    return {
      runId,
      userPool: [],
    };
  }

  await connectToDatabase();

  const userPool = buildUserPool(flow, runId, getPoolSize(flow));
  const users = await ensureUsersExist(userPool);

  if (flow === "orders") {
    await ensureOrderHistory(users);
  }

  return {
    runId,
    userPool,
  };
}

export async function cleanupStressData(runId) {
  await connectToDatabase();

  const prefix = buildStressPrefix(runId);
  const emailPattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  const users = await userModel.find({ email: emailPattern }).select("_id");
  const userIds = users.map((user) => user._id);

  if (userIds.length > 0) {
    await orderModel.deleteMany({ buyer: { $in: userIds } });
    await userModel.deleteMany({ _id: { $in: userIds } });
  }
}

export async function disconnectStressDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function getProjectRoot() {
  return projectRoot;
}
