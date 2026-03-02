import { expect, type Page } from "@playwright/test";
import { loginAndGoto, TEST_ADMIN_EMAIL, TEST_PASSWORD } from "./auth";

export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

export async function gotoCreateCategory(page: Page): Promise<void> {
  await loginAndGoto(page, "/dashboard/admin/create-category", TEST_ADMIN_EMAIL, TEST_PASSWORD);
  await expect(page.getByText("Manage Category")).toBeVisible();
}

export async function createCategory(page: Page, name: string): Promise<void> {
  await gotoCreateCategory(page);
  await page.getByPlaceholder("Enter new category").fill(name);
  await page.getByText("Submit", { exact: true }).click();
  await expect(page.getByText(`${name} is created`, { exact: true })).toBeVisible();
}

export async function deleteCategory(page: Page, categoryName: string): Promise<void> {
  await gotoCreateCategory(page);
  const row = page.locator("tr", { hasText: categoryName });
  await row.getByText("Delete", { exact: true }).click();
  await expect(page.getByText("Category is deleted", { exact: true })).toBeVisible();
  await expect(page.locator("tr", { hasText: categoryName })).toHaveCount(0);
}