// Jovin Ang Yusheng, A0273460H
import { test, expect } from "@playwright/test";
import { logout, TEST_ADMIN_NAME } from "../helpers/auth";
import { createCategory, deleteCategory, uniqueName } from "../helpers/category";

test.describe("Category to Product Browsing Flow", () => {
  test("should navigate to a category from the navbar and view products", async ({
    page,
  }) => {
    await page.goto("/");

    const categoriesDropdown = page.locator(".nav-link.dropdown-toggle", {
      hasText: "Categories",
    });
    await categoriesDropdown.click();

    const dropdownMenu = page.locator(".dropdown-menu").filter({
      has: page.getByText("All Categories"),
    });
    await expect(dropdownMenu).toBeVisible();

    const categoryLinks = dropdownMenu.locator(".dropdown-item").filter({
      hasNotText: "All Categories",
    });
    const categoryCount = await categoryLinks.count();
    expect(categoryCount).toBeGreaterThan(0);

    const firstCategoryName = (await categoryLinks.first().textContent())!.trim();
    await categoryLinks.first().click();

    await expect(
      page.getByRole("heading", { name: `Category - ${firstCategoryName}` })
    ).toBeVisible();

    await expect(page.locator("h6.text-center")).toContainText(/\d+ result found/);

    const products = page.locator(".card");
    const productCount = await products.count();
    expect(productCount).toBeGreaterThan(0);

    const firstCard = products.first();
    await expect(firstCard.locator(".card-title").first()).not.toHaveText("");
    await expect(firstCard.locator(".card-price")).not.toHaveText("");
  });

  test("should navigate to product details from a category page", async ({
    page,
  }) => {
    await page.goto("/");

    const categoriesDropdown = page.locator(".nav-link.dropdown-toggle", {
      hasText: "Categories",
    });
    await categoriesDropdown.click();

    const dropdownMenu = page.locator(".dropdown-menu").filter({
      has: page.getByText("All Categories"),
    });
    await expect(dropdownMenu).toBeVisible();

    const categoryLinks = dropdownMenu.locator(".dropdown-item").filter({
      hasNotText: "All Categories",
    });
    await categoryLinks.first().click();

    await expect(page.locator("h6.text-center")).toContainText(/\d+ result found/);

    const firstCard = page.locator(".card").first();
    const productName = (
      await firstCard.locator(".card-title").first().textContent()
    )!.trim();
    const productPrice = (
      await firstCard.locator(".card-price").textContent()
    )!.trim();

    await firstCard.locator(".btn-info").click();

    const detailsInfo = page.locator(".product-details-info");
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible();
    await expect(detailsInfo.locator(`text=Name : ${productName}`)).toBeVisible();
    await expect(
      detailsInfo.locator(`text=Price :${productPrice}`)
    ).toBeVisible();
    await expect(
      page.locator(`.product-details img[alt="${productName}"]`)
    ).toBeVisible();
  });

  test("should add a product to the cart from a category page", async ({
    page,
  }) => {
    await page.goto("/");

    const categoriesDropdown = page.locator(".nav-link.dropdown-toggle", {
      hasText: "Categories",
    });
    await categoriesDropdown.click();

    const dropdownMenu = page.locator(".dropdown-menu").filter({
      has: page.getByText("All Categories"),
    });
    await expect(dropdownMenu).toBeVisible();

    const categoryLinks = dropdownMenu.locator(".dropdown-item").filter({
      hasNotText: "All Categories",
    });
    await categoryLinks.first().click();

    await expect(page.locator("h6.text-center")).toContainText(/\d+ result found/);

    const firstCard = page.locator(".card").first();
    const productName = (
      await firstCard.locator(".card-title").first().textContent()
    )!.trim();
    const productPrice = (
      await firstCard.locator(".card-price").textContent()
    )!.trim().replace(/^\$/, "");

    await firstCard.getByRole("button", { name: "ADD TO CART" }).click();

    const toast = page.getByText("Item Added to cart");
    await expect(toast).toBeVisible();

    await page.goto("/cart");

    const cartItems = page.locator(".cart-page .row.card");
    await expect(cartItems).toHaveCount(1);

    const cartItem = cartItems.first();
    await expect(cartItem.locator("p").first()).toHaveText(productName);
    await expect(cartItem.locator("img")).toHaveAttribute("alt", productName);
    await expect(cartItem.locator("p").nth(2)).toHaveText(
      `Price : ${productPrice}`
    );
  });

  test("should show 0 results for a category with no products", async ({
    page,
  }) => {
    const emptyCategory = uniqueName("EmptyCat");
    await createCategory(page, emptyCategory);
    await logout(page, TEST_ADMIN_NAME);

    await page.goto("/");

    const categoriesDropdown = page.locator(".nav-link.dropdown-toggle", {
      hasText: "Categories",
    });
    await categoriesDropdown.click();

    const dropdownMenu = page.locator(".dropdown-menu").filter({
      has: page.getByText("All Categories"),
    });
    await expect(dropdownMenu).toBeVisible();

    await dropdownMenu
      .locator(".dropdown-item", { hasText: emptyCategory })
      .click();

    await expect(
      page.getByRole("heading", { name: `Category - ${emptyCategory}` })
    ).toBeVisible();
    await expect(page.locator("h6.text-center")).toHaveText("0 result found ");
    await expect(page.locator(".card")).toHaveCount(0);

    await deleteCategory(page, emptyCategory);
    await logout(page, TEST_ADMIN_NAME);
  });
});
