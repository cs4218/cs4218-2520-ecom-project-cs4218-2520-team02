import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

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