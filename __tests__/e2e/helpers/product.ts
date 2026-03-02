import { expect, type Page } from "@playwright/test";
import { loginAndGoto, TEST_ADMIN_EMAIL, TEST_PASSWORD } from "./auth";

export async function gotoCreateProduct(page: Page): Promise<void> {
  await loginAndGoto(page, "/dashboard/admin/create-product", TEST_ADMIN_EMAIL, TEST_PASSWORD);
  await expect(page.locator("h1:has-text('Create Product')")).toBeVisible();
}

export async function gotoProductsList(page: Page): Promise<void> {
  await loginAndGoto(page, "/dashboard/admin/products", TEST_ADMIN_EMAIL, TEST_PASSWORD);
  await expect(page.locator("h1:has-text('All Products List')")).toBeVisible();
}

export async function selectAntdOption(
  page: Page,
  placeholderText: string,
  optionText: string
): Promise<void> {
  const select = page.locator(".ant-select").filter({
    has: page.getByText(placeholderText, { exact: true }),
  }).first();

  await select.scrollIntoViewIfNeeded();
  await select.locator(".ant-select-selector").click({ force: true });

  const option = page.locator(".ant-select-item-option", { hasText: optionText }).first();
  await option.waitFor({ state: "visible", timeout: 15000 });
  await option.click();
}

export async function uploadTinyPng(page: Page): Promise<void> {
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6q7v0AAAAASUVORK5CYII=";

  await page.locator('input[type="file"][name="photo"]').setInputFiles({
    name: "test.png",
    mimeType: "image/png",
    buffer: Buffer.from(pngBase64, "base64"),
  });
}

export async function createProduct(
  page: Page,
  categoryName: string,
  productName: string
): Promise<void> {
  await gotoCreateProduct(page);

  await selectAntdOption(page, "Select a category", categoryName);
  await uploadTinyPng(page);

  await page.getByPlaceholder("Enter product name").fill(productName);
  await page.getByPlaceholder("Enter product description").fill("E2E description");
  await page.getByPlaceholder("Enter product price").fill("10");
  await page.getByPlaceholder("Enter product quantity").fill("3");
  await selectAntdOption(page, "Select shipping", "Yes");

  await page.getByText("CREATE PRODUCT", { exact: true }).click();

  await expect(page.getByText("Product Created Successfully", { exact: true })).toBeVisible();
  await page.waitForURL("/dashboard/admin/products", { timeout: 60000 });
  await expect(page.locator("h1:has-text('All Products List')")).toBeVisible();
  await expect(page.getByText(productName, { exact: true })).toBeVisible({ timeout: 15000 });
}

export async function openProductFromList(page: Page, productName: string): Promise<void> {
  await expect(page.locator("h1:has-text('All Products List')")).toBeVisible();
  await page.getByText(productName, { exact: true }).click();
  await expect(page.locator("h1:has-text('Update Product')")).toBeVisible();
  await expect(page.getByPlaceholder("Enter product name")).not.toHaveValue("", { timeout: 10000 });
}

export async function updateProduct(page: Page, updatedName: string): Promise<void> {
  await expect(page.locator("h1:has-text('Update Product')")).toBeVisible();

  const putPromise = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/v1/product/update-product/") &&
      resp.request().method() === "PUT"
  );

  await page.getByPlaceholder("Enter product name").fill(updatedName);
  await page.getByPlaceholder("Enter product description").fill("Updated E2E description");
  await page.getByPlaceholder("Enter product price").fill("12");
  await page.getByPlaceholder("Enter product quantity").fill("5");

  await page.getByText("UPDATE PRODUCT", { exact: true }).click();

  await putPromise;
  await page.waitForURL("/dashboard/admin/products", { timeout: 60000 });
  await expect(page.getByText("Product Updated Successfully", { exact: true })).toBeVisible({
    timeout: 10000,
  });
}

export async function deleteProduct(page: Page): Promise<void> {
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });

  await page.getByText("DELETE PRODUCT", { exact: true }).click();

  await page.waitForURL("/dashboard/admin/products", { timeout: 60000 });
  await expect(page.getByText("Product Deleted Successfully", { exact: true })).toBeVisible({
    timeout: 10000,
  });
}