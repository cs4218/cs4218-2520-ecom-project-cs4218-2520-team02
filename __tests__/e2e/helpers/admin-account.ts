import mongoose from "mongoose";
import userModel from "../../../models/userModel.js";
import { hashPassword } from "../../../helpers/authHelper.js";

export const ADMIN_EMAIL = "admin@playwright.com";
export const ADMIN_PASSWORD = "AdminPass123!";
export const ADMIN_NAME = "E2E Admin";

async function ensureMongo() {
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error("Missing MONGO_URL");

  await mongoose.connect(uri);
}

export async function createAdminUser() {
  await ensureMongo();

  const hashed = await hashPassword(ADMIN_PASSWORD);

  const existing = await userModel.findOne({ email: ADMIN_EMAIL });
  if (!existing) {
    await userModel.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashed,
      phone: "98765432",
      address: { line1: "e2e address" },
      answer: "e2e",
      role: 1,
    });
    return;
  }
}

export async function deleteAdminUser() {
  await ensureMongo();
  await userModel.deleteOne({ email: ADMIN_EMAIL });
}

export async function closeMongo() {
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
}