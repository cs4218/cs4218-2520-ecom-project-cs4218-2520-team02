// Censon Lee Lemuel John Alejo, A0273436B
import { test, expect } from "@playwright/test";
import { logout, TEST_ADMIN_NAME } from "../helpers/auth";
import { uniqueName, createCategory, deleteCategory } from "../helpers/category";
import {
  gotoProductsList,
  createProduct,
  openProductFromList,
  updateProduct,
  deleteProduct,
} from "../helpers/product";

test.describe("Admin Product CRUD", () => {
  test.afterEach(async ({ page }) => {
    await logout(page, TEST_ADMIN_NAME);
  });

  test("create product", async ({ page }) => {
    const categoryName = uniqueName("Cat");
    const productName = uniqueName("Prod");

    await createCategory(page, categoryName);
    await createProduct(page, categoryName, productName);

    await gotoProductsList(page);
    await openProductFromList(page, productName);
    await deleteProduct(page);
    await expect(page.getByText(productName, { exact: true })).toHaveCount(0);

    await deleteCategory(page, categoryName);
  });

  test("update product", async ({ page }) => {
    const categoryName = uniqueName("Cat");
    const productName = uniqueName("Prod");
    const updatedName = uniqueName("ProdUpdated");

    await createCategory(page, categoryName);
    await createProduct(page, categoryName, productName);

    await gotoProductsList(page);
    await openProductFromList(page, productName);
    await updateProduct(page, updatedName);

    await gotoProductsList(page);
    await page.reload();
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(productName, { exact: true })).toHaveCount(0);

    await openProductFromList(page, updatedName);
    await deleteProduct(page);
    await expect(page.getByText(updatedName, { exact: true })).toHaveCount(0);

    await deleteCategory(page, categoryName);
  });

  test("delete product", async ({ page }) => {
    const categoryName = uniqueName("Cat");
    const productName = uniqueName("Prod");

    await createCategory(page, categoryName);
    await createProduct(page, categoryName, productName);

    await gotoProductsList(page);
    await openProductFromList(page, productName);
    await deleteProduct(page);
    await expect(page.getByText(productName, { exact: true })).toHaveCount(0);

    await deleteCategory(page, categoryName);
  });
});