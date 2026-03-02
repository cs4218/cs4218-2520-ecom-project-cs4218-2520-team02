// Song Jia Hui A0259494L
import { test, expect } from "@playwright/test";
import { registerAndLogin, logout, login } from "../helpers/auth";
import {
  TEST_ADMIN_EMAIL,
  TEST_PASSWORD,
  TEST_ADMIN_NAME,
  TEST_USER_EMAIL,
  TEST_USER_NAME
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

test.describe("Order Flow for Users", () => {
  test.describe("Order Flow for authenticated users", () => {

    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER_EMAIL, TEST_PASSWORD);
    });

    test.afterEach(async ({ page }) => {
      await logout(page, TEST_USER_NAME);
    });

    test("should render orders page with an empty order", async ({ page }) => {
      // Arrange
      await page.route("**/api/v1/auth/orders", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.goto("/dashboard/user");

      // Act
      await page.getByRole("link", { name: "Orders" }).click();

      // Assert
      await expect(page).toHaveURL("/dashboard/user/orders");
      await expect(page.getByText(/All Orders/i)).toBeVisible();
      await expect(page.getByTestId("order-product")).toHaveCount(0);
    });

    test("user can view order details", async ({ page }) => {

      // Arrange

      await page.route("**/api/v1/auth/orders", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            orders: mockOrders,
          }),
        });
      });

      // Act
      await page.goto("/dashboard/user");
      await page.getByRole("link", { name: "Orders" }).click();

      // Assert
      await expect(
        page.getByText("NUS T-shirt", { exact: true }),
      ).toBeVisible();
      await page.goto("/");
    });
  });

  test.describe("Order Flow for admin users", () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_ADMIN_EMAIL, TEST_PASSWORD);
    });

    test.afterEach(async ({ page }) => {
      await logout(page, TEST_ADMIN_NAME);
    });

    test("admin should be able to see all the orders made by users", async ({
      page,
    }) => {
      // Arrange
      await page.route("**/api/v1/auth/all-orders", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            orders: mockOrders,
          }),
        });
      });

      // Act
      await page.goto("/dashboard/admin");

      await page.getByRole("link", { name: "Orders" }).click();

      // Assert
      await expect(page.getByText("Alice")).toBeVisible();
      await expect(page.getByText("Laptop", { exact: true })).toBeVisible();
      await expect(page.getByText(/Processing/i)).toBeVisible();
    });
  });

  test.describe("Order Flow for unauthenticated users", () => {
    test("unauthenticated user should be redirected to login", async ({
      page,
    }) => {
      // Act
      await page.goto("/dashboard/user/orders");

      // Assert
      await expect(page).toHaveURL("/");
    });
  });
});
