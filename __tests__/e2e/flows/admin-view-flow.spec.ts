// Song Jia Hui A0259494L
import { test, expect } from "@playwright/test";
import { logout, login } from "../helpers/auth";
import {
  TEST_ADMIN_EMAIL,
  TEST_PASSWORD,
  TEST_ADMIN_NAME,
  TEST_USER_EMAIL,
  TEST_USER_NAME,
} from "../helpers/auth";

test.describe("Admin View", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_EMAIL, TEST_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    await logout(page, TEST_ADMIN_NAME);
  });

  // --- Orders ---

  test("admin can navigate to orders page from admin dashboard", async ({
    page,
  }) => {
    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Orders" }).click();

    // Assert
    await expect(page).toHaveURL("/dashboard/admin/orders");
    await expect(
      page.getByRole("heading", { name: "All Orders" }),
    ).toBeVisible();
  });

  test("admin can view all orders with correct table headers", async ({
    page,
  }) => {
    // Act
    await page.goto("/dashboard/admin/orders");

    // Assert 
    const firstTable = page.locator("table").first();
    await expect(
      page.getByRole("heading", { name: "All Orders" }),
    ).toBeVisible();
    await expect(
      firstTable.getByRole("columnheader", { name: "#" }),
    ).toBeVisible();
    await expect(
      firstTable.getByRole("columnheader", { name: "Status" }),
    ).toBeVisible();
    await expect(
      firstTable.getByRole("columnheader", { name: "Buyer" }),
    ).toBeVisible();
    await expect(
      firstTable.getByRole("columnheader", { name: "date" }),
    ).toBeVisible();
    await expect(
      firstTable.getByRole("columnheader", { name: "Payment" }),
    ).toBeVisible();
    await expect(
      firstTable.getByRole("columnheader", { name: "Quantity" }),
    ).toBeVisible();
  });

  test("admin can see real orders placed by E2E User", async ({ page }) => {
    // Act
    const ordersResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/v1/auth/all-orders") && resp.ok()
    );
    await page.goto("/dashboard/admin/orders");
    await ordersResponsePromise;

    // Assert - real order placed by E2E User exists in DB
    await expect(
      page.getByText("E2E User", { exact: false }).first(),
    ).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("admin can update order status of an existing order", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/dashboard/admin/orders");
    const firstStatusDropdown = page.locator(".ant-select-selector").first();
    await expect(firstStatusDropdown).toBeVisible();

    const currentStatus = await firstStatusDropdown.textContent();
    const newStatus = currentStatus?.includes("Processing")
      ? "Shipped"
      : "Processing";

    // Act
    await firstStatusDropdown.click();
    await page.getByTitle(newStatus).locator("div").click();

    // Assert
    await expect(
      page
        .locator(`span.ant-select-selection-item[title="${newStatus}"]`)
        .first(),
    ).toBeVisible();
  });

  // --- Products ---

  test("admin can view all products list", async ({ page }) => {
    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Products" }).click();

    // Assert
    await expect(page).toHaveURL("/dashboard/admin/products");
    await expect(
      page.getByRole("heading", { name: "All Products List" }),
    ).toBeVisible();
    await expect(page.locator(".card").first()).toBeVisible();
  });

  test("admin can navigate to update product from all products list", async ({
    page,
  }) => {
    // Act
    await page.goto("/dashboard/admin/products");
    await page.locator(".card").first().click();

    // Assert
    await expect(
      page.getByRole("heading", { name: "Update Product" }),
    ).toBeVisible();
    await expect(page.getByText("Upload Photo")).toBeVisible();
    await expect(
      page.locator("div").filter({ hasText: /^UPDATE PRODUCT$/ }),
    ).toBeVisible();
    await expect(
      page.locator("div").filter({ hasText: /^DELETE PRODUCT$/ }),
    ).toBeVisible();
  });

  test("admin can navigate to create product page and see all fields", async ({
    page,
  }) => {
    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Create Product" }).click();

    // Assert
    await expect(page).toHaveURL("/dashboard/admin/create-product");
    await expect(
      page.getByRole("heading", { name: "Create Product" }),
    ).toBeVisible();
    await expect(
      page
        .locator("div")
        .filter({ hasText: /^Select a category$/ })
        .first(),
    ).toBeVisible();
    await expect(page.getByText("Upload Photo")).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Enter product name" }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Enter product description" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Enter product price")).toBeVisible();
    await expect(page.getByPlaceholder("Enter product quantity")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "CREATE PRODUCT" }),
    ).toBeVisible();
  });

  // --- Users ---

  test("admin can view all users with correct table columns", async ({
    page,
  }) => {
    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Users" }).click();

    // Assert
    await expect(page).toHaveURL("/dashboard/admin/users");
    await expect(
      page.getByRole("heading", { name: "All Users" }),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Phone" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Address" })).toBeVisible();
    await expect(
      page.getByRole("cell", { name: TEST_USER_NAME }),
    ).toBeVisible();
  });

  test("admin can see E2E User's details in the users table", async ({
    page,
  }) => {
    // Act
    await page.goto("/dashboard/admin/users");

    // Assert
    await expect(
      page.getByRole("cell", { name: TEST_USER_NAME }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: TEST_USER_EMAIL }),
    ).toBeVisible();
  });

  // --- Categories ---

  test("admin can navigate to manage category page", async ({ page }) => {
    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Create Category" }).click();

    // Assert
    await expect(page).toHaveURL("/dashboard/admin/create-category");
    await expect(
      page.getByRole("heading", { name: "Manage Category" }),
    ).toBeVisible();
  });
  test("admin can create a new category", async ({ page }) => {
    // Arrange
    const categoryName = `E2E Category ${Date.now()}`;
    await page.goto("/dashboard/admin/create-category");

    // Act
    await page.getByPlaceholder("Enter new category").fill(categoryName);
    await page.getByRole("button", { name: /submit/i }).click();

    // Assert
    await expect(page.getByRole("cell", { name: categoryName })).toBeVisible();

    // Cleanup
    const row = page.locator("tr", { hasText: categoryName });
    await row.getByText("Delete", { exact: true }).click();
    await expect(
      page.getByText("Category is deleted", { exact: true }),
    ).toBeVisible();
  });

  test("admin can delete a newly created category", async ({ page }) => {
    // Arrange - create a category first so we have something to delete
    const categoryName = `E2E Delete ${Date.now()}`;
    await page.goto("/dashboard/admin/create-category");
    await page.getByPlaceholder("Enter new category").fill(categoryName);
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(page.getByRole("cell", { name: categoryName })).toBeVisible();

    // Act
    const row = page.locator("tr", { hasText: categoryName });
    await row.getByText("Delete", { exact: true }).click();

    // Assert
    await expect(
      page.getByText("Category is deleted", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(categoryName, { exact: true })).toHaveCount(0);
  });
});
