import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!;

export const TEST_PASSWORD = process.env.TEST_PASSWORD!;

export const TEST_ADMIN_NAME = "E2E Admin";
export const TEST_USER_NAME = "E2E User";

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