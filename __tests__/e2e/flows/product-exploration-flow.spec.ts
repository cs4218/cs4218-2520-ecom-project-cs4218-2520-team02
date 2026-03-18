// Yap Zhao Yi, A0277540B
import { test, expect } from '@playwright/test';

test.describe("Product Exploration Flow", () => {

  test("should be able to navigate to product details page from homepage", async ({ 
    page 
  }) => {
    
    // Arrange
    await page.goto("/");

    // Act
    // 1. Click first product button
    await page.locator('.btn-info').first().click();

    // Assert
    await expect(page.getByRole('heading', { name: 'Product Details' })).toBeVisible();
    
  });

  test('should display matching product information to that in homepage', async ({ page }) => {

    // Arrange
    await page.goto("/");

    const productName = (await page.locator('.card-title').first().textContent())!.trim();
    const productPrice = (await page.locator('.card-price').first().textContent())!.trim();
    const productImageAlt = productName; // image alt text matches name

    // Act
    // 1. Click first product button
    await page.locator('.btn-info').first().click();

    // Assert
    await expect(page.getByRole('heading', { name: 'Product Details' })).toBeVisible();
    
    const mainSection = page.locator('.product-details-info');
    const imageSection = page.locator('.product-details');
    await expect(mainSection.locator('text=Description :')).toBeVisible();
    await expect(mainSection.locator(`text=Name : ${productName}`)).toBeVisible();
    await expect(imageSection.locator(`img[alt="${productImageAlt}"]`)).toBeVisible();
    await expect(mainSection.locator(`text=Price :${productPrice}`)).toBeVisible();
  });

  test('should be able to navigate to a related product with the matching information', async ({ page }) => {
    
    // Arrange
    await page.goto("/");
    
    await page.locator('.btn-info').first().click();

    const relatedContainer = page.locator('.similar-products .d-flex');
    const relatedProductCard = relatedContainer.locator('.card').first();
    const relatedProductName = (await relatedProductCard.locator('.card-name-price > .card-title').first().textContent())?.trim();
    const relatedProductPrice = (await relatedProductCard.locator('.card-price').textContent())?.trim();
    const relatedProductImageAlt = relatedProductName;
    console.log(relatedProductImageAlt)

    // Act
    // 1. Click "More Details" on related product
    await relatedProductCard.locator('text=More Details').click();

    const productName = (await page.locator('.card-title').first().textContent())?.trim();

    // Assert
    const mainSection = page.locator('.product-details-info');
    const imageSection = page.locator('.product-details');
    await expect(mainSection.locator(`text=Name : ${relatedProductName}`)).toBeVisible();
    await expect(imageSection.locator(`img[alt="${relatedProductImageAlt}"]`)).toBeVisible();
    await expect(mainSection.locator(`text=Price :${relatedProductPrice}`)).toBeVisible();
  });

  test('should be add product to cart from product details', async ({ page }) => {
    
    // Arrange
    await page.goto("/");

    const firstProductCard = page.locator('.card').first();
    const productName = (await firstProductCard.locator('.card-title').first().textContent())!.trim();
    const productPrice = (await firstProductCard.locator('.card-price').textContent())!.trim().replace(/^\$/, '');
    const productImageAlt = productName; // image alt text matches name
    await firstProductCard.locator('.btn-info').click();

    const mainSection = page.locator('.product-details-info');
    await expect(mainSection.locator(`text=Name : ${productName}`)).toBeVisible();

    // Act
    // 1. Add product to cart
    await mainSection.locator('text=ADD TO CART').click();

    // 2. Navigate to cart page
    await page.goto("/cart");

    // Assert
    const cartItem = page.locator('.cart-page .row.card').first();

    const imageDiv = cartItem.locator('div').first();
    const image = imageDiv.locator('img');

    const nameElement = cartItem.locator('div').nth(1).locator('p').first();
    const priceElement = cartItem.locator('div').nth(1).locator('p').nth(2);

    await expect(nameElement).toHaveText(productName);
    await expect(image).toHaveAttribute('alt', productImageAlt);
    await expect(priceElement).toHaveText(`Price : ${productPrice}`);
  });
});