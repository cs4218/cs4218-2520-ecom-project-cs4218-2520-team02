// Jovin Ang Yusheng, A0273460H
import { test, expect } from "@playwright/test";
import {
  login,
  logout,
  deleteUserByEmail,
  TEST_USER_EMAIL,
  TEST_USER_NAME,
  TEST_PASSWORD,
} from "../helpers/auth";

function fillRegisterForm(
  page: import("@playwright/test").Page,
  overrides: Record<string, string> = {}
) {
  const fields = {
    name: "Auth E2E User",
    email: `e2e-auth-${Date.now()}@test.com`,
    password: "Test1234!",
    phone: "91234567",
    address: "123 Test Street",
    dob: "2000-01-01",
    answer: "Soccer",
    ...overrides,
  };

  return (async () => {
    await page.getByPlaceholder("Enter Your Name").fill(fields.name);
    await page.getByPlaceholder("Enter Your Email").fill(fields.email);
    await page.getByPlaceholder("Enter Your Password").fill(fields.password);
    await page.getByPlaceholder("Enter Your Phone").fill(fields.phone);
    await page.getByPlaceholder("Enter Your Address").fill(fields.address);
    await page.getByPlaceholder("Enter Your DOB").fill(fields.dob);
    await page
      .getByPlaceholder("What Is Your Favorite Sport")
      .fill(fields.answer);
    return fields;
  })();
}

test.describe("Authentication Flow", () => {

  test("register, login, and access protected route with session persistence", async ({
    page,
  }) => {
    const uniqueEmail = `e2e-auth-${Date.now()}@test.com`;
    const password = "Test1234!";
    const name = "Auth Happy User";

    await page.goto("/register");
    await fillRegisterForm(page, {
      name,
      email: uniqueEmail,
      password,
    });
    await page.getByRole('button', { name: 'REGISTER' }).click();

    await expect(
      page.getByText("Register Successfully, please login")
    ).toBeVisible();
    await page.waitForURL("/login");

    await page.getByPlaceholder("Enter Your Email").fill(uniqueEmail);
    await page.getByPlaceholder("Enter Your Password").fill(password);
    await page.getByRole('button', { name: 'LOGIN' }).click();
    await page.waitForFunction(() => !!localStorage.getItem("auth"));

    await page.goto("/dashboard/user");
    await expect(page.locator(".card").getByText(name)).toBeVisible();
    await expect(page.locator(".card").getByText(uniqueEmail)).toBeVisible();

    await page.reload();
    await expect(page.locator(".card").getByText(name)).toBeVisible();
    await expect(page.locator(".card").getByText(uniqueEmail)).toBeVisible();

    await deleteUserByEmail(uniqueEmail);
  });

  test("register fails with a duplicate email", async ({ page }) => {
    await page.goto("/register");
    await fillRegisterForm(page, { email: TEST_USER_EMAIL });
    await page.getByRole('button', { name: 'REGISTER' }).click();

    await expect(
      page.getByText("Already Register please login")
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("register shows client-side validation for short password", async ({
    page,
  }) => {
    await page.goto("/register");
    await fillRegisterForm(page, { password: "short" });
    await page.getByRole('button', { name: 'REGISTER' }).click();

    await expect(
      page.getByText("Password must be at least 8 characters long")
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("login fails with wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Enter Your Email").fill(TEST_USER_EMAIL);
    await page
      .getByPlaceholder("Enter Your Password")
      .fill("definitelywrong123");
    await page.getByRole('button', { name: 'LOGIN' }).click();

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login shows client-side validation for invalid email format", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Enter Your Email").fill("test@test");
    await page
      .getByPlaceholder("Enter Your Password")
      .fill("somepassword123");
    await page.getByRole('button', { name: 'LOGIN' }).click();

    await expect(page.getByText("Email is invalid")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected away from user dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard/user");

    await expect(page.getByText(/redirecting to you in/i)).toBeVisible();
    await page.waitForURL("/", { timeout: 10000 });
  });

  test("unauthenticated user is redirected away from admin dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard/admin");

    await expect(page.getByText(/redirecting to you in/i)).toBeVisible();
    await page.waitForURL("/login", { timeout: 10000 });
  });

  test("non-admin user is redirected away from admin routes", async ({
    page,
  }) => {
    await login(page, TEST_USER_EMAIL, TEST_PASSWORD);

    await page.goto("/dashboard/admin");

    await expect(page.getByText(/redirecting to you in/i)).toBeVisible();
    await page.waitForURL("/login", { timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "Admin Panel" })
    ).not.toBeVisible();
  });

  test("logout redirects to login and blocks subsequent protected access", async ({
    page,
  }) => {
    await login(page, TEST_USER_EMAIL, TEST_PASSWORD);

    await page.goto("/dashboard/user");
    await expect(page.getByRole('heading', { name: TEST_USER_NAME })).toBeVisible();

    await logout(page, TEST_USER_NAME);
    await expect(page).toHaveURL("/login");

    await page.goto("/dashboard/user");
    await expect(page.getByText(/redirecting to you in/i)).toBeVisible();
    await page.waitForURL("/", { timeout: 10000 });
  });

  test("shows error toast when register API request fails", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/register", (route) => route.abort());

    await page.goto("/register");
    await fillRegisterForm(page);
    await page.getByRole('button', { name: 'REGISTER' }).click();

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("shows error toast when login API request fails", async ({ page }) => {
    await page.route("**/api/v1/auth/login", (route) => route.abort());

    await page.goto("/login");
    await page.getByPlaceholder("Enter Your Email").fill("test@example.com");
    await page.getByPlaceholder("Enter Your Password").fill("Test1234!");
    await page.getByRole('button', { name: 'LOGIN' }).click();

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
