// Song Jia Hui A0259494L
import { test, expect } from "@playwright/test";
import { logout, login, loginAndGoto, ensureUserAddress } from "../helpers/auth";
import {
  TEST_ADMIN_EMAIL,
  TEST_PASSWORD,
  TEST_ADMIN_NAME,
  TEST_USER_EMAIL,
  TEST_USER_NAME,
} from "../helpers/auth";

test.describe("Order Flow for Users", () => {
  test.describe("Order Flow for authenticated users", () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER_EMAIL, TEST_PASSWORD);
    });

    test.afterEach(async ({ page }) => {
      await logout(page, TEST_USER_NAME);
    });

    test("should render orders page with no orders initially", async ({
      page,
    }) => {
      // Act
      await page.goto("/dashboard/user/orders");

      // Assert
      await expect(page).toHaveURL("/dashboard/user/orders");
      await expect(page.getByText(/All Orders/i)).toBeVisible();
      await expect(page.getByTestId("order-product")).toHaveCount(0);
    });

    test("user can navigate to orders page from user dashboard", async ({
      page,
    }) => {
      // Act
      await page.goto("/dashboard/user");
      await page.getByRole("link", { name: "Orders" }).click();

      // Assert
      await expect(page).toHaveURL("/dashboard/user/orders");
      await expect(page.getByText(/All Orders/i)).toBeVisible();
    });

    test("user can complete a purchase and view it in orders", async ({
      page,
    }) => {
      // Arrange
      await ensureUserAddress(page);
      await page.goto("/");

      const firstProductCard = page.locator(".card").first();
      await firstProductCard.getByRole("button", { name: "ADD TO CART" }).click();
      await expect(page.getByText("Item Added to cart")).toBeVisible();

      await page.goto("/cart");

      const tokenResponsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/product/braintree/token") && resp.ok()
      );
      const tokenResponse = await tokenResponsePromise;
      expect(tokenResponse.ok()).toBeTruthy();

      const payingWithCardButton = page.getByRole("button", { name: "Paying with Card" });
      await payingWithCardButton.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
      if (await payingWithCardButton.isVisible()) {
        await payingWithCardButton.click();
      }

      await expect(
        page.locator('iframe[name="braintree-hosted-field-number"]')
      ).toBeVisible({ timeout: 15000 });

      await expect(
        page.getByRole("button", { name: "Make Payment" })
      ).toBeEnabled({ timeout: 15000 });

      // Act
      const cardNumberFrame = page.frameLocator(
        'iframe[name="braintree-hosted-field-number"]'
      );
      await cardNumberFrame
        .getByLabel("Credit Card Number")
        .fill("4111111111111111");

      const expirationDateFrame = page.frameLocator(
        'iframe[name="braintree-hosted-field-expirationDate"]'
      );
      await expirationDateFrame.getByLabel("Expiration Date").fill("1229");

      const cvvFrame = page.frameLocator(
        'iframe[name="braintree-hosted-field-cvv"]'
      );
      await cvvFrame.getByLabel("CVV").fill("123");

      await page.getByRole("button", { name: "Make Payment" }).click();

      // Assert
      await expect(page).toHaveURL("/dashboard/user/orders");
      await expect(
        page.getByText("Payment Completed Successfully")
      ).toBeVisible();
    });

    test("user can view their profile from the dashboard", async ({ page }) => {
      // Act
      await page.goto("/dashboard/user");
      await page.getByRole("link", { name: "Profile" }).click();

      // Assert
      await expect(page).toHaveURL("/dashboard/user/profile");
      await expect(
        page.getByRole("heading", { name: /user profile/i })
      ).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(
        TEST_USER_NAME
      );
      await expect(page.getByPlaceholder("Enter Your Email")).toHaveValue(
        TEST_USER_EMAIL
      );
    });
  });

  test.describe("Order Flow for admin users", () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_ADMIN_EMAIL, TEST_PASSWORD);
    });

    test.afterEach(async ({ page }) => {
      await logout(page, TEST_ADMIN_NAME);
    });

    test("admin should be able to see all orders made by users", async ({
      page,
    }) => {
      // Act
      await page.goto("/dashboard/admin");
      await page.getByRole("link", { name: "Orders" }).click();

      // Assert
      await expect(page).toHaveURL("/dashboard/admin/orders");
      await expect(page.getByText(/All Orders/i)).toBeVisible();
    });

    test("admin can update an order status", async ({ page }) => {
      // Arrange
      const ordersResponsePromise = page.waitForResponse(
        (resp) => resp.url().includes("/api/v1/auth/all-orders") && resp.ok()
      );
      await page.goto("/dashboard/admin/orders");
      await ordersResponsePromise;

      const firstStatusDropdown = page.locator(".ant-select-selector").first();

      // Only proceed if there is at least one order
      const orderCount = await firstStatusDropdown.count();
      test.skip(orderCount === 0, "No orders to update");

      const currentStatus = await firstStatusDropdown.textContent();

      // Act - change to a different status
      const newStatus = currentStatus?.includes("Processing") ? "Shipped" : "Processing";
      await firstStatusDropdown.click();
      await page.getByTitle(newStatus).locator("div").click();

      // Assert
      await expect(
        page.locator(`span.ant-select-selection-item[title="${newStatus}"]`).first()
      ).toBeVisible();
    });

    test("admin can navigate to orders from admin dashboard", async ({
      page,
    }) => {
      // Act
      await page.goto("/dashboard/admin");
      await page.getByRole("link", { name: "Orders" }).click();

      // Assert
      await expect(page).toHaveURL("/dashboard/admin/orders");
    });
  });

  test.describe("Order Flow for unauthenticated users", () => {
    test("unauthenticated user should be redirected away from user orders page", async ({
      page,
    }) => {
      // Act
      await page.goto("/dashboard/user/orders");

      // Assert
      await expect(page).toHaveURL("/");
    });

    test("unauthenticated user should be redirected away from admin orders page", async ({
      page,
    }) => {
      // Act
      await page.goto("/dashboard/admin/orders");

      // Assert
      await expect(page).not.toHaveURL("/dashboard/admin/orders");
    });

    test("unauthenticated user cannot access user dashboard", async ({
      page,
    }) => {
      // Act
      await page.goto("/dashboard/user");

      // Assert
      await expect(page).toHaveURL("/");
    });
  });
});
