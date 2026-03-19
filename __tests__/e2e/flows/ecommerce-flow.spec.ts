// Yap Zhao Yi, A0277540B
import { test, expect, type Page } from '@playwright/test';
import {logout, login } from "../helpers/auth";
import {
  TEST_PASSWORD,
  TEST_USER_EMAIL,
  TEST_USER_NAME,
} from "../helpers/auth";

// Prefill cart
// Note: uses non-existant products to reduce time taken for adding products
const SEEDED_CART = [
  { _id: "1", name: "Product A", price: 10, description: "desc" },
  { _id: "2", name: "Product B", price: 20, description: "desc" },
];

test.describe("E-Commerce Flow", () => {

  test("should load home page and display products successfully", async ({ page }) => {

    // Act
    await page.goto("/");

    // Assert
    await expect(page).toHaveTitle("ALL Products - Best offers ");
    await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
    await expect(page.locator(".card").first()).toBeVisible();

  });

  test('should be able to add products to cart from home page', async ({ page }) => {
  
    // Arrange
    await page.goto("/");

    const firstProductCard = page.locator('.card').first();
    const firstProductName = (await firstProductCard.locator('.card-title').first().textContent())!.trim();
    const firstProductPrice = (await firstProductCard.locator('.card-price').textContent())!.trim().replace(/^\$/, '');
    const firstProductImageAlt = firstProductName; // image alt text matches name

    const secondProductCard = page.locator('.card').nth(1);
    const secondProductName = (await secondProductCard.locator('.card-title').first().textContent())!.trim();
    const secondProductPrice = (await secondProductCard.locator('.card-price').textContent())!.trim().replace(/^\$/, '');
    const secondProductImageAlt = secondProductName; // image alt text matches name

    const toast = page.getByText("Item Added to cart");

    // Act
    // 1. Add first product to cart
    await firstProductCard.getByRole("button", { name: "ADD TO CART" }).click();

    // 2. Wait for success toast message
    await expect(toast).toBeVisible();
    await expect(toast).not.toBeVisible();

    // 3. Add second product to cart
    await secondProductCard.getByRole("button", { name: "ADD TO CART" }).click();

    // 4. Wait for success toast message
    await expect(toast).toBeVisible();
    await expect(toast).not.toBeVisible();

    // 5. Add first product to cart
    await firstProductCard.getByRole("button", { name: "ADD TO CART" }).click();

    // 6. Wait for success toast message
    await expect(toast).toBeVisible();
    await expect(toast).not.toBeVisible();

    // 3. Navigate to cart page
    await page.goto("/cart");

    // Assert
    const cartItems = page.locator('.cart-page .row.card');
    await expect(cartItems).toHaveCount(3);
    
    const firstMatches = cartItems.filter({has: page.locator('p').filter({ hasText: firstProductName })});
    await expect(firstMatches).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      const item = firstMatches.nth(i);
      const price = item.locator('p').nth(2);
      await expect(price).toHaveText(`Price : ${firstProductPrice}`);

      const image = item.locator('img');
      await expect(image).toHaveAttribute('alt', firstProductImageAlt);
    }

    const secondMatches = cartItems.filter({has: page.locator('p').filter({ hasText: secondProductName })});
    const secondProduct = secondMatches.first()
    await expect(secondMatches).toHaveCount(1);
    const secondPrice = secondProduct.locator('p').nth(2);
    await expect(secondPrice).toHaveText(`Price : ${secondProductPrice}`);
    const image = secondMatches.locator('img');
    await expect(image).toHaveAttribute('alt', secondProductImageAlt);
    
    const expectedTotal = (Number(firstProductPrice) * 2 + Number(secondProductPrice)).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
    await expect(page.locator('.cart-summary')).toContainText(expectedTotal);
  });

  test('should be able remove products from cart', async ({ page }) => {

    // Arrange
    // Prefill cart as guest
    await page.addInitScript(
      ({cart}) => {
        localStorage.setItem(`cart_guest`, JSON.stringify(cart));
      },
      {cart: SEEDED_CART }
    );

    await page.goto("/cart");

    const cartItems = page.locator('.cart-page .row.card');
    const totalElement = page.getByText(/Total : /i);
    await expect(cartItems).toHaveCount(2);
    
    const initialTotal = (await totalElement.textContent())!.trim();

    // Act
    // 1. Remove first item
    await cartItems.first().getByRole('button', { name: 'Remove' }).click();
    await expect(cartItems).toHaveCount(1); // Repeated in assert just for clarity

    const firstRemoveCount = await cartItems.count()
    const firstRemoveTotal = (await totalElement.textContent())!.trim();

    const remainingItem = cartItems.first();

    // 2. Remove second item
    await remainingItem.getByRole('button', { name: /remove/i }).click();
    await expect(cartItems).toHaveCount(0); // Repeated in assert just for clarity

    const secondRemoveCount = await cartItems.count()
    const secondRemoveTotal = (await totalElement.textContent())!.trim();

    // Assert
    expect(initialTotal).toBe("Total : $30.00");
    expect(firstRemoveTotal).toBe("Total : $20.00");
    expect(secondRemoveTotal).toBe("Total : $0.00");

    expect(firstRemoveCount).toBe(1);
    expect(secondRemoveCount).toBe(0);

    await expect(page.getByText("Your Cart Is Empty")).toBeVisible();

  });

  test('should not be able to check out as guest', async ({ page }) => {
  
    // Act
    // 1. Go to cart page
    await page.goto("/cart");

    // Assert
    await expect(page.getByRole("heading", { name: /Hello Guest/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Please Login to checkout" })).toBeVisible();
  });

  test('should be able to log in to check out from guest cart page', async ({ page }) => {
    
    // Arrange
    // Prefill cart
    await page.addInitScript(
      ({cart}) => {
        localStorage.setItem(`cart_guest`, JSON.stringify(cart));
      },
      {cart: SEEDED_CART }
    );

    await page.goto("/cart");

    const cartItems = page.locator('.cart-page .row.card');

    // Act
    // 1. Log in
    await login(page, TEST_USER_EMAIL, TEST_PASSWORD);
    
    // 2. Go to cart page
    await page.goto("/cart");

    // Assert
    await expect(cartItems).toHaveCount(2);
    await expect(page.locator('.cart-page h1.text-center.bg-light').filter({ hasText: `Hello ${TEST_USER_NAME}` })).toBeVisible();
    await expect(page.getByRole("button", { name: "Make Payment" })).toBeVisible();

    // Clean up
    await logout(page, TEST_USER_NAME);
  });

  test('should be able to check out when logged in as user', async ({ page }) => {

    // Arrange
    // Pre-login with cart
    await login(page, TEST_USER_EMAIL, TEST_PASSWORD);
    const storedAuth = await page.evaluate(() => JSON.parse(localStorage.getItem("auth") || "null"));
    const userId = storedAuth?.user?._id;
    await page.addInitScript(
      ({ uid, cart }) => {
        localStorage.setItem(`cart_${uid}`, JSON.stringify(cart));
      },
      { uid: userId, cart: SEEDED_CART }
    );

    const storedUserName = storedAuth?.user?.name || TEST_USER_NAME;

    // Act
    // 1. Go to cart page
    await page.goto("/cart");

    // Assert
    const cartItems = page.locator('.cart-page .row.card');

    await expect(cartItems).toHaveCount(2);
    await expect(page.locator('.cart-page h1.text-center.bg-light').filter({ hasText: `Hello ${storedUserName}` })).toBeVisible();
    await expect(page.getByRole("button", { name: "Make Payment" })).toBeVisible();

    // Clean up
    await logout(page, storedUserName);
  });

  test('should be able to complete a payment successfully', async ({ page }) => {
    
    // Arrange
    // Pre-login
    await login(page, TEST_USER_EMAIL, TEST_PASSWORD);
    await page.goto("/");

    const firstProductCard = page.locator('.card').first();
    await firstProductCard.getByRole("button", { name: "ADD TO CART" }).click();

    await page.goto("/cart");

    const tokenResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/product/braintree/token") && resp.ok()
    );
    
    // Ensure braintree works
    const tokenResponse = await tokenResponsePromise;
    expect(tokenResponse.ok()).toBeTruthy();

    await expect(
      page.getByRole("button", { name: "Make Payment" })
    ).toBeEnabled();

    // Act
    // 1. Click paying with card
    await page.getByRole("button", { name: "Paying with Card" }).click();
    await expect(page.getByText("Card Number")).toBeVisible();

    // 2. Fill in credit card
    const cardNumberFrame = page.frameLocator('iframe[name="braintree-hosted-field-number"]');
    await cardNumberFrame.getByLabel("Credit Card Number").fill("4111111111111111"); // Braintree test card number

    // 3. Fill in credit card expiration
    const expirationDateFrame = page.frameLocator('iframe[name="braintree-hosted-field-expirationDate"]');
    await expirationDateFrame.getByLabel("Expiration Date").fill("1229");

    // 4. Fill in credit card CVV
    const cvvFrame = page.frameLocator('iframe[name="braintree-hosted-field-cvv"]');
    await cvvFrame.getByLabel("CVV").fill("123");

    // 5. Click the Make Payment button
    const makePaymentButton = page.getByRole("button", { name: "Make Payment" });
    await makePaymentButton.click();

    // Assert
    await expect(page).toHaveURL("/dashboard/user/orders");
    await expect(page.getByText("Payment Completed Successfully")).toBeVisible();
  });

  test('should provide an error toast if an invalid credit card number was provided', async ({ page }) => {
  
    // Arrange
    // Pre-login
    await login(page, TEST_USER_EMAIL, TEST_PASSWORD);
    await page.goto("/");

    const firstProductCard = page.locator('.card').first();
    await firstProductCard.getByRole("button", { name: "ADD TO CART" }).click();

    await page.goto("/cart");
    
    const tokenResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/product/braintree/token") && resp.ok()
    );
    
    // Ensure braintree works
    const tokenResponse = await tokenResponsePromise;
    expect(tokenResponse.ok()).toBeTruthy();

    await expect(
      page.getByRole("button", { name: "Make Payment" })
    ).toBeEnabled();

    // Act
    // 1. Click paying with card
    await page.getByRole("button", { name: "Paying with Card" }).click();
    await expect(page.getByText("Card Number")).toBeVisible();

    // 2. Fill in credit card
    const cardNumberFrame = page.frameLocator('iframe[name="braintree-hosted-field-number"]');
    await cardNumberFrame.getByLabel("Credit Card Number").fill("1231231231231231"); // Braintree test invalid card number

    // 3. Fill in credit card expiration
    const expirationDateFrame = page.frameLocator('iframe[name="braintree-hosted-field-expirationDate"]');
    await expirationDateFrame.getByLabel("Expiration Date").fill("0126");

    // 4. Fill in credit card CVV
    const cvvFrame = page.frameLocator('iframe[name="braintree-hosted-field-cvv"]');
    await cvvFrame.getByLabel("CVV").fill("123");

    // 5. Click the Make Payment button
    const makePaymentButton = page.getByRole("button", { name: "Make Payment" });
    await makePaymentButton.click();

    // Assert
    await expect(page.getByText("This card number is not valid.")).toBeVisible();
    await expect(page.getByText("Please check your information and try again.")).toBeVisible();
    await expect(page).toHaveURL("/cart");
  });
});
