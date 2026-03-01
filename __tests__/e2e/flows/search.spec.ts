// Censon Lee Lemuel John Alejo, A0273436B
import {test, expect} from "@playwright/test";

// =============== Tests ===============
test.describe("Search", () => {
  test('should show intended results', async ({ page }) => { 
    await page.goto("/")

    const searchInput = page.getByTestId("search-input")
    await searchInput.fill("phone");
    await page.getByTestId("search-button").click()

    const search_page_text = page.getByText("Search Results")
    await expect(search_page_text).toBeVisible();

    // At least one card exists
    const firstCardTitle = page.locator(".card .card-title").first();
    await expect(firstCardTitle).toBeVisible();
    await expect(firstCardTitle).toContainText(/phone/i);
  });

  test('should show no results if none', async ({page}) => {
        await page.goto("/")

    const searchInput = page.getByTestId("search-input")
    await searchInput.fill("someRandomThing");
    await page.getByTestId("search-button").click()

    const search_page_text = page.getByText("Search Results")
    await expect(search_page_text).toBeVisible();

    const search_no_products_text = page.getByText("No Products Found")
    await expect(search_no_products_text).toBeVisible();
    
    // No cards should be rendered
    await expect(page.locator(".card .card-title")).toHaveCount(0);
  })
});
