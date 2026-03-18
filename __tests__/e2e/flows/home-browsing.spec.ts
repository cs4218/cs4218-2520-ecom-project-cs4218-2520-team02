// Yap Zhao Yi, A0277540B
import { test, expect } from "@playwright/test";

test.describe("Home Page Browsing Flow", () => {
  test("should be able to filter products by category", async ({
    page,
  }) => {

    // Arrange
    await page.goto("/");
    await page.waitForSelector(".card");
    const products = page.locator(".card");

    // Act
    // 1. Count initial number of products
    const initialCount = await products.count();

    // 2. Apply category filter to products
    await page.locator(".filters .ant-checkbox-input").first().check();

    // 3. Wait for product list to update
    await expect(products).not.toHaveCount(initialCount);

    // 4. Count the number of filtered products
    const filteredCount = await products.count();

    // Assert
    expect(initialCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(initialCount);
  });

  test("should be able to filter products by price", async ({
    page,
  }) => {

    // Arrange
    await page.goto("/");
    await page.waitForSelector(".card");
    
    const products = page.locator(".card");
    const initialCount = await products.count();

    // Act
    // 1. Extract min and max prices from label text
    const firstRadio = page.locator(".filters .ant-radio-input").first();
    const value = await firstRadio.getAttribute("value");
    const [minPrice, maxPrice] = value!.split(",").map(Number);

    // 2. Apply price filter to products
    await firstRadio.check();

    // 3. Wait for product list to update
    await expect(products).not.toHaveCount(initialCount);

    // 4. Count the number of filtered products
    const filteredCount = await products.count();

    // Assert
    expect(initialCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(initialCount);
    for (let i = 0; i < filteredCount; i++) {
      const priceText = await products.nth(i).locator("h5.card-price").textContent();
      const price = parseFloat(priceText!.replace(/[^0-9.]/g, ""));
      expect(price).toBeGreaterThanOrEqual(minPrice);
      expect(price).toBeLessThanOrEqual(maxPrice);
    }
  });

  test("should reset filters correctly", async ({
    page,
  }) => {

    // Arrange
    await page.goto("/");
    const products = page.locator(".card");

    // Act
    // 1. Count initial number of products
    await page.waitForSelector(".card");
    const initialCount = await page.locator(".card").count();

    // 2. Apply category filter to products
    await page.locator(".filters .ant-checkbox-input").first().check();
    
    // 3. Apply price filter to products
    await page.locator(".filters .ant-radio-input").first().check();

    // 4. Wait for product list to update
    await expect(products).not.toHaveCount(initialCount);
    const filteredCount = await page.locator(".card").count();

    // 5. Reset filters
    await page.getByRole("button", { name: "RESET FILTERS" }).click();

    // 6. Wait for product list to update
    await expect(products).toHaveCount(initialCount); // Repeated in assert for clarity

    // 7. Recount the number of items in product list
    const finalCount = await page.locator(".card").count();

    // Assert
    expect(initialCount).toBeGreaterThan(0);
    expect(finalCount).toEqual(initialCount);
  });

  test("should be able to filter products by price and category", async ({
    page,
  }) => {

    // Arrange
    await page.goto("/");
    await page.waitForSelector(".card");
    
    const products = page.locator(".card");
    const initialCount = await products.count();

    // Act
    // 1. Extract min and max prices from label text
    const firstRadio = page.locator(".filters .ant-radio-input").first();
    const value = await firstRadio.getAttribute("value");
    const [minPrice, maxPrice] = value!.split(",").map(Number);

    // 2. Apply price filter to products
    await firstRadio.check();

    // 3. Apply category filter to products
    await page.locator(".filters .ant-checkbox-input").first().check();

    // 4. Wait for product list to update
    await expect(products).not.toHaveCount(initialCount);

    // 5. Count the number of filtered products
    const filteredCount = await products.count();

    // Assert
    expect(initialCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(initialCount);
    for (let i = 0; i < filteredCount; i++) {
      const priceText = await products.nth(i).locator("h5.card-price").textContent();
      const price = parseFloat(priceText!.replace(/[^0-9.]/g, ""));
      expect(price).toBeGreaterThanOrEqual(minPrice);
      expect(price).toBeLessThanOrEqual(maxPrice);
    }
  });

  test("should load more products when clicking the load more button", async ({
    page,
  }) => {

    // Arrange
    await page.goto("/");
    await page.waitForSelector(".card");
    
    const products = page.locator(".card");
    const initialCount = await products.count();
    const loadMoreButton = page.getByRole("button", { name: /Load More/i });

    // The button may not exist if all products are already loaded.
    if (await loadMoreButton.isVisible()) {

      // Act
      // 1. Click the load more button
      await loadMoreButton.click();
      await expect(page.getByText("Loading ...")).toBeVisible();
      await expect(page.getByText("Loading ...")).not.toBeVisible();
      
      // 2. Count the number of products
      const newCount = await products.count();

      // Assert
      expect(newCount).toBeGreaterThan(initialCount);

    } else {
      console.log("Load more button currently not visible, skipping test.");
    }
  });

  test("should reset pagination correctly", async ({
    page,
  }) => {

    // Arrange
    await page.goto("/");
    await page.waitForSelector(".card");
    
    const products = page.locator(".card");
    const initialCount = await products.count();
    const loadMoreButton = page.getByRole("button", { name: /Load More/i });

    // The button may not exist if all products are already loaded.
    if (await loadMoreButton.isVisible()) {

      // Act
      // 1. Click the load more button
      await loadMoreButton.click();
      await expect(page.getByText("Loading ...")).toBeVisible();
      await expect(page.getByText("Loading ...")).not.toBeVisible();
      
      // 2. Reset filters
      await page.getByRole("button", { name: "RESET FILTERS" }).click();

      // 3. Wait for product list to update
      await expect(products).toHaveCount(initialCount); // Repeated in assert for clarity

      // 4. Recount the number of items in product list
      const finalCount = await page.locator(".card").count();

      // Assert
      expect(finalCount).toEqual(initialCount);

    } else {
      console.log("Load more button currently not visible, skipping test.");
    }
  });
});