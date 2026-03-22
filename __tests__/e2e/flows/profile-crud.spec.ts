// Gavin Sin Fu Chen, A0273285X
import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";
import { TEST_USER_NAME, TEST_PASSWORD, logout, loginAndGoto, TEST_USER_EMAIL } from "../helpers/auth";

async function gotoProfilePage(page: Page): Promise<void> {
    await loginAndGoto(page, "/dashboard/user/profile", TEST_USER_EMAIL, TEST_PASSWORD);
    await expect(page.getByText("USER PROFILE")).toBeVisible();
}

test.describe("Profile CRUD", () => {
    test.beforeEach(async ({ page }) => {
        await gotoProfilePage(page);
    });

    test.afterEach(async ({ page }) => {
        await logout(page, TEST_USER_NAME);
    });

    test("user can view profile details", async ({
        page,
    }) => {
        await expect(page.getByText("USER PROFILE")).toBeVisible();
        await expect(page.getByPlaceholder("Enter Your Email")).toBeVisible();
        await expect(page.getByPlaceholder("Enter Your Email")).toHaveValue("playwright_user@test.com");
    });

    test("user can update profile details", async ({
        page,
    }) => {
        await expect(page.getByText("USER PROFILE")).toBeVisible();

        const nameInput = page.getByPlaceholder("Enter Your Name");
        const phoneInput = page.getByPlaceholder("Enter Your Phone");
        const addressInput = page.getByPlaceholder("Enter Your Address");
        await nameInput.fill("E2E User");
        await phoneInput.fill("1234567890");
        await addressInput.fill("123 Updated St");
        await page.getByText("UPDATE").click();

        await expect(page.getByText(/Profile updated successfully/i)).toBeVisible();
        await expect(nameInput).toHaveValue("E2E User");
        await expect(phoneInput).toHaveValue("1234567890");
        await expect(addressInput).toHaveValue("123 Updated St");
    });
})
