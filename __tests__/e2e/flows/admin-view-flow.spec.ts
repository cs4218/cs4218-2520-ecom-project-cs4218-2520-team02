// Song Jia Hui A0259494L
import { test, expect } from "@playwright/test";
import { registerAndLogin, logout, login } from "../helpers/auth";
import {
  TEST_ADMIN_EMAIL,
  TEST_PASSWORD,
  TEST_ADMIN_NAME,
} from "../helpers/auth";

const mockOrders = [
  {
    _id: "order123",
    status: "Processing",
    buyer: { name: "alice" },
    createAt: new Date().toISOString(),
    payment: { success: true },
    products: [
      {
        _id: "pdt1",
        name: "NUS T-shirt",
        description: "Plain NUS T-shirt for sale",
        price: 10,
      },
      {
        _id: "pdt2",
        name: "Laptop",
        description: "A powerful laptop",
        price: 20,
      },
    ],
  },
];

test.describe("Admin View", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_EMAIL, TEST_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    await logout(page, TEST_ADMIN_NAME);
  });

  test("admin can view all orders when there are no orders in the database", async ({
    page,
  }) => {
    // Arrange
    await page.route("**/api/v1/auth/all-orders", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, orders: [] }),
      });
    });

    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Orders" }).click();

    // Assert
    await expect(
      page.getByRole("heading", { name: "All Orders" }),
    ).toBeVisible();
    await expect(page.getByTestId("order-product")).toHaveCount(0);
  });

  test("admin can view all orders when there are orders in the database", async ({
    page,
  }) => {
    // Arrange - mock the payment endpoint to simulate a successful order save
    await page.route("**/api/v1/product/braintree/payment", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Payment completed successfully.",
          transaction: { success: true },
          orderId: "order123",
        }),
      });
    });

    // Mock all-orders to return the saved order
    await page.route("**/api/v1/auth/all-orders", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, orders: mockOrders }),
      });
    });

    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Orders" }).click();

    // Assert
    await expect(
      page.getByRole("heading", { name: "All Orders" }),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "#" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Status" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Buyer" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "date" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Payment" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Quantity" }),
    ).toBeVisible();
    await expect(page.getByText("alice", { exact: false })).toBeVisible();
    await expect(page.getByText("NUS T-shirt", { exact: true })).toBeVisible();
    await expect(page.getByText("Laptop", { exact: true })).toBeVisible();
    await expect(page.getByText(/Processing/i)).toBeVisible();
    await expect(page.getByText(/Success/i)).toBeVisible();
  });

  test("admin can update order status successfully", async ({ page }) => {
    // Arrange
    await page.route("**/api/v1/auth/all-orders", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, orders: mockOrders }),
      });
    });

    await page.route("**/api/v1/auth/order-status/order123", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Orders" }).click();
    await expect(page.getByText(/Processing/i)).toBeVisible();

    await page.getByText("Processing").click();
    await page.getByTitle("Shipped").locator("div").click();

    // Assert
    await expect(
      page.locator('span.ant-select-selection-item[title="Shipped"]'),
    ).toBeVisible();
  });

  test("admin can navigate to update product from all products list", async ({
    page,
  }) => {
    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Products" }).click();

    // Assert
    await expect(
      page.getByRole("heading", { name: "All Products List" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Novel Novel A bestselling" }).click();
    await expect(
      page.getByRole("heading", { name: "Update Product" }),
    ).toBeVisible();
    await expect(
      page
        .locator("div")
        .filter({ hasText: /^Book$/ })
        .first(),
    ).toBeVisible();
    await expect(page.getByText("Upload Photo")).toBeVisible();
    await expect(
      page.locator("div").filter({ hasText: /^UPDATE PRODUCT$/ }),
    ).toBeVisible();
    await expect(
      page.locator("div").filter({ hasText: /^DELETE PRODUCT$/ }),
    ).toBeVisible();
  });

  test("admin can view all users created", async ({ page }) => {
    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Users" }).click();

    // Assert
    await expect(
      page.getByRole("heading", { name: "All Users" }),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Phone" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Address" })).toBeVisible();
  });

  test("admin can navigate to create category", async ({ page }) => {
    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Create Category" }).click();

    // Assert
    await expect(
      page.getByRole("heading", { name: "Manage Category" }),
    ).toBeVisible();
  });

  test("admin can navigate to create product", async ({ page }) => {
    // Act
    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: "Create Product" }).click();

    // Assert
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
      page
        .locator("div")
        .filter({ hasText: /^Select shipping$/ })
        .nth(2),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "CREATE PRODUCT" }),
    ).toBeVisible();
  });
});
