// Jovin Ang Yusheng, A0273460H
import { test, expect } from "@playwright/test";
import { logout, TEST_ADMIN_NAME } from "../helpers/auth";
import {
  createCategory,
  deleteCategory,
  uniqueName,
  navigateToCategory,
} from "../helpers/category";
import {
  createProduct,
  deleteProduct,
  gotoProductsList,
  openProductFromList,
} from "../helpers/product";

test.describe("Category to Product Browsing Flow", () => {
  test.describe("With active category and product", () => {
    let categoryName: string;
    let productName: string;

    test.beforeEach(async ({ page }) => {
      categoryName = uniqueName("Cat");
      productName = uniqueName("Prod");
      await createCategory(page, categoryName);
      await createProduct(page, categoryName, productName);
      await logout(page, TEST_ADMIN_NAME);
    });

    test.afterEach(async ({ page }) => {
      // Cleanup Product
      await gotoProductsList(page);
      await openProductFromList(page, productName);
      await deleteProduct(page);
      await logout(page, TEST_ADMIN_NAME);

      // Cleanup Category
      await deleteCategory(page, categoryName);
      await logout(page, TEST_ADMIN_NAME);
    });

    test("should display products for the category", async ({
      page,
    }) => {
      await navigateToCategory(page, categoryName);

      await expect(page.locator("h6.text-center")).toContainText(
        /1 result found/
      );

      const products = page.locator(".card");
      expect(await products.count()).toBeGreaterThan(0);

      const firstCard = products.first();
      await expect(firstCard.locator(".card-title").first()).toHaveText(
        productName
      );
      await expect(firstCard.locator(".card-price")).not.toHaveText("");
    });

    test("should navigate to product details", async ({
      page,
    }) => {
      await navigateToCategory(page, categoryName);

      await expect(page.locator("h6.text-center")).toContainText(
        /1 result found/
      );

      const firstCard = page.locator(".card").first();
      const productPrice = (
        await firstCard.locator(".card-price").textContent()
      )!.trim();

      await firstCard.locator(".btn-info").click();

      const detailsInfo = page.locator(".product-details-info");
      await expect(
        page.getByRole("heading", { name: "Product Details" })
      ).toBeVisible();
      await expect(
        detailsInfo.locator(`text=Name : ${productName}`)
      ).toBeVisible();
      await expect(
        detailsInfo.locator(`text=Price :${productPrice}`)
      ).toBeVisible();
      await expect(page.locator(".product-details img")).toBeVisible();
    });

    test("should add a product to the cart", async ({
      page,
    }) => {
      await navigateToCategory(page, categoryName);

      await expect(page.locator("h6.text-center")).toContainText(
        /1 result found/
      );

      const firstCard = page.locator(".card").first();
      const productPrice = (
        await firstCard.locator(".card-price").textContent()
      )!
        .trim()
        .replace(/^\$/, "");

      await firstCard.getByRole("button", { name: "ADD TO CART" }).click();

      const toast = page.getByText("Item Added to cart");
      await expect(toast).toBeVisible();

      await page.goto("/cart");

      const cartItems = page.locator(".cart-page .row.card");
      await expect(cartItems).toHaveCount(1);

      const cartItem = cartItems.first();
      await expect(cartItem.locator("p").first()).toHaveText(productName);
      // await expect(cartItem.locator("img")).toHaveAttribute("alt", productName); // Image alt behavior might vary on create
      await expect(cartItem.locator("p").nth(2)).toHaveText(
        `Price : ${productPrice}`
      );
    });
  });

  test.describe("With empty category", () => {
    let categoryName: string;

    test.beforeEach(async ({ page }) => {
      categoryName = uniqueName("EmptyCat");
      await createCategory(page, categoryName);
      await logout(page, TEST_ADMIN_NAME);
    });

    test.afterEach(async ({ page }) => {
      await deleteCategory(page, categoryName);
      await logout(page, TEST_ADMIN_NAME);
    });

    test("should show 0 results", async ({
      page,
    }) => {
      await navigateToCategory(page, categoryName);

      await expect(page.locator("h6.text-center")).toHaveText("0 result found ");
      await expect(page.locator(".card")).toHaveCount(0);
    });
  });
});
