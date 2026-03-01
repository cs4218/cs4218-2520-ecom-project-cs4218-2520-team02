// Censon Lee Lemuel John Alejo, A0273436B
import { test, expect, type Page } from "@playwright/test";
import {
  createAdminUser,
  deleteAdminUser,
  closeMongo,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_NAME,
} from "../helpers/admin-account";
import { loginAndGoto, logout } from "../helpers/auth";

// =============== Helpers ===============
function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

async function gotoCreateCategory(page: Page): Promise<void> {
  await loginAndGoto(page, "/dashboard/admin/create-category", ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page.getByText("Manage Category")).toBeVisible();
}

async function createCategory(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder("Enter new category").fill(name);
  await page.getByText("Submit", { exact: true }).click();
  await expect(page.getByText(`${name} is created`, { exact: true })).toBeVisible();
}

// =============== Tests ===============
test.describe("Admin Category CRUD", () => {
  test.beforeAll(async () => {
    await createAdminUser();
  });

  test.afterAll(async () => {
    await deleteAdminUser();
    await closeMongo();
  });

  test("create category", async ({ page }) => {
    await gotoCreateCategory(page);

    const name = uniqueName("Create");
    await createCategory(page, name);

    const row = page.locator("tr", { hasText: name });
    await row.getByText("Delete", { exact: true }).click();
    await expect(page.getByText("Category is deleted", { exact: true })).toBeVisible();

    await logout(page, ADMIN_NAME);
  });

  test("update category", async ({ page }) => {
    await gotoCreateCategory(page);

    const originalName = uniqueName("Original");
    await createCategory(page, originalName);

    const categoryRow = page.locator("tr", { hasText: originalName });
    await categoryRow.getByText("Edit", { exact: true }).click();

    const modal = page.locator(".ant-modal");
    await expect(modal).toBeVisible();

    const updatedName = uniqueName("Updated");
    const modalInput = modal.getByPlaceholder("Enter new category");
    await modalInput.clear();
    await modalInput.fill(updatedName);

    await modal.getByText("Submit", { exact: true }).click();

    await expect(page.getByText(`${updatedName} is updated`, { exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: updatedName })).toBeVisible();
    await expect(page.getByText(originalName, { exact: true })).toHaveCount(0);

    const updatedRow = page.locator("tr", { hasText: updatedName });
    await updatedRow.getByText("Delete", { exact: true }).click();
    await expect(page.getByText("Category is deleted", { exact: true })).toBeVisible();

    await logout(page, ADMIN_NAME);
  });

  test("delete category", async ({ page }) => {
    await gotoCreateCategory(page);

    const name = uniqueName("Delete");
    await createCategory(page, name);

    const row = page.locator("tr", { hasText: name });
    await row.getByText("Delete", { exact: true }).click();
    await expect(page.getByText("Category is deleted", { exact: true })).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);

    await logout(page, ADMIN_NAME);
  });
});