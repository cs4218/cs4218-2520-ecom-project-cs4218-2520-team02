import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import mongoose from "mongoose";
import userModel from "../../../models/userModel";

export const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!;

export const TEST_PASSWORD = process.env.TEST_PASSWORD!;

export const TEST_ADMIN_NAME = "E2E Admin";
export const TEST_USER_NAME = "E2E User";

type User = {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  dob: string;
  answer: string;
};

export async function registerAndLogin(page: Page, user: User) {
  await page.goto("/register");

  await page.getByPlaceholder('Enter Your Name').fill(user.name);
  await page.getByPlaceholder("Enter Your Email").fill(user.email);
  await page.getByPlaceholder("Enter Your Password").fill(user.password);
  await page.getByPlaceholder("Enter Your Phone").fill(user.phone);
  await page.getByPlaceholder("Enter Your Address").fill(user.address);
  await page.getByPlaceholder("Enter Your DOB").fill(user.dob);
  await page.getByPlaceholder("What is Your Favorite Sport").fill(user.answer);

  await page.locator('button:has-text("REGISTER")').click();
  await page.waitForURL("/login");

  await page.getByPlaceholder('Enter Your Email').fill(user.email);
  await page.getByPlaceholder('Enter Your Password').fill(user.password);
  await page.locator('button:has-text("LOGIN")').click();

  await page.waitForURL("/");
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");

  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);

  await page.locator('button:has-text("LOGIN")').click();

  await page.waitForFunction(() => !!localStorage.getItem("auth"));
}

export async function loginAndGoto(
  page: Page,
  protectedPath: string,
  email: string,
  password: string,
) {
  await login(page, email, password);
  await page.goto(protectedPath);
  await expect(page).toHaveURL(protectedPath);
}

export async function logout(page: Page, userName: string) {
  await page.getByText(userName, { exact: true }).click();
  await page.getByText("Logout", { exact: true }).click();
  await page.waitForURL("/login", { timeout: 60000 });
}

export async function deleteUser(email: string) {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ecom_e2e");
  }

  await userModel.deleteOne({ email });
}
