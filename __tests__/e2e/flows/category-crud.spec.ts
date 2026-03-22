// Censon Lee Lemuel John Alejo, A0273436B
import { test, expect } from "@playwright/test";

import { TEST_ADMIN_NAME} from "../helpers/auth";
import { logout } from "../helpers/auth";
import { uniqueName, gotoCreateCategory, createCategory } from "../helpers/category";

// ================= Tests =================

test.describe("Admin Category CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await gotoCreateCategory(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page, TEST_ADMIN_NAME);
  });

  test("create category", async ({ page }) => {
    const name = uniqueName("Create");
    await createCategory(page, name);

    const row = page.locator("tr", { hasText: name });
    await row.getByText("Delete", { exact: true }).click();
    await expect(page.getByText("Category is deleted", { exact: true })).toBeVisible();
  });

  test("update category", async ({ page }) => {
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
  });

  test("delete category", async ({ page }) => {
    const name = uniqueName("Delete");
    await createCategory(page, name);

    const row = page.locator("tr", { hasText: name });
    await row.getByText("Delete", { exact: true }).click();
    await expect(page.getByText("Category is deleted", { exact: true })).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  });

});
