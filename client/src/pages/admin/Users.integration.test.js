// Song Jia Hui A0259494L
// Integration tests: Users + UserList + AdminMenu + Layout
// Approach: Top-down integration - the Users page is rendered inside real
// context providers (AuthProvider, SearchProvider, CartProvider) and real
// routing. 

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import { BrowserRouter } from "react-router-dom";
import Users from "./Users";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import toast from "react-hot-toast";

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const adminUser = { role: 1, name: "Admin" };

const mockUsers = [
  {
    _id: "u1",
    name: "Alice Tan",
    email: "alice@example.com",
    phone: "91234567",
    address: "123 Main Street",
  },
  {
    _id: "u2",
    name: "Bob Lee",
    email: "bob@example.com",
    phone: "98765432",
    address: "456 Elm Avenue",
  },
];

const mockCategories = [
  { _id: "cat1", name: "Electronics", slug: "electronics" },
  { _id: "cat2", name: "Clothing", slug: "clothing" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderUsers = (initialAuth = null) => {
  if (initialAuth) localStorage.setItem("auth", JSON.stringify(initialAuth));
  else localStorage.removeItem("auth");

  return render(
    <BrowserRouter>
      <AuthProvider>
        <SearchProvider initialValue={{ keyword: "", results: [] }}>
          <CartProvider>
            <Users />
          </CartProvider>
        </SearchProvider>
      </AuthProvider>
    </BrowserRouter>,
  );
};

// ─── Spies ───────────────────────────────────────────────────────────────────

let axiosGetSpy;

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  axiosGetSpy = jest.spyOn(axios, "get");
});

afterEach(() => {
  axiosGetSpy.mockRestore();
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Users + AdminMenu 
// ─────────────────────────────────────────────────────────────────────────────

describe("Users + AdminMenu - real nav link integration", () => {
  it("renders Admin Panel heading and all AdminMenu nav links", async () => {
    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/user/all")
        return Promise.resolve({ data: { success: true, users: [] } });
      if (url === "/api/v1/category/get-category")
        return Promise.resolve({ data: { category: [] } });
      return Promise.resolve({ data: {} });
    });

    renderUsers({ token: "admin-token", user: adminUser });

    expect(await screen.findByText("Admin Panel")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create category/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create product/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /^products$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^orders$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^users$/i })).toBeInTheDocument();
  });

  it("renders page heading alongside AdminMenu confirming Users + AdminMenu layout", async () => {
    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/user/all")
        return Promise.resolve({ data: { success: true, users: [] } });
      if (url === "/api/v1/category/get-category")
        return Promise.resolve({ data: { success: true, category: [] } });
      return Promise.resolve({ data: {} });
    });

    renderUsers({ token: "admin-token", user: adminUser });

    expect(await screen.findByText("All Users")).toBeInTheDocument();
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Users + UserList - data fetching and rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("Users + UserList - data fetching and rendering", () => {
  it("shows loading state then renders user table after fetch completes", async () => {
    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/user/all")
        return Promise.resolve({ data: { success: true, users: mockUsers } });
      if (url === "/api/v1/category/get-category")
        return Promise.resolve({ data: { category: [] } });
      return Promise.resolve({ data: {} });
    });

    renderUsers({ token: "admin-token", user: adminUser });

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    expect(await screen.findByTestId("user-list-table")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();

    expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/user/all");
  });

  it("renders all user fields correctly in UserList table", async () => {
    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/user/all")
        return Promise.resolve({ data: { success: true, users: mockUsers } });
      if (url === "/api/v1/category/get-category")
        return Promise.resolve({ data: { category: [] } });
      return Promise.resolve({ data: {} });
    });

    renderUsers({ token: "admin-token", user: adminUser });

    expect(await screen.findByText("Alice Tan")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("91234567")).toBeInTheDocument();
    expect(screen.getByText("123 Main Street")).toBeInTheDocument();

    expect(screen.getByText("Bob Lee")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("98765432")).toBeInTheDocument();
    expect(screen.getByText("456 Elm Avenue")).toBeInTheDocument();
  });

  it("renders empty table with headers but no rows when API returns no users", async () => {
    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/user/all")
        return Promise.resolve({ data: { success: true, users: [] } });
      if (url === "/api/v1/category/get-category")
        return Promise.resolve({ data: { category: [] } });
      return Promise.resolve({ data: {} });
    });

    renderUsers({ token: "admin-token", user: adminUser });

    expect(await screen.findByTestId("user-list-table")).toBeInTheDocument();

    expect(
      screen.getByRole("columnheader", { name: /name/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /email/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Alice Tan")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob Lee")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Users + UserList - error handling
// ─────────────────────────────────────────────────────────────────────────────

describe("Users + UserList - error handling", () => {
  it("fires error toast and renders empty table when API returns success: false", async () => {
    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/user/all")
        return Promise.resolve({ data: { success: false } });
      if (url === "/api/v1/category/get-category")
        return Promise.resolve({ data: { category: [] } });
      return Promise.resolve({ data: {} });
    });

    renderUsers({ token: "admin-token", user: adminUser });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to fetch users");
    });

    // finally block in UserList sets loading=false - table still renders
    expect(await screen.findByTestId("user-list-table")).toBeInTheDocument();
    expect(screen.queryByText("Alice Tan")).not.toBeInTheDocument();
  });

  it("fires error toast and logs error on network failure", async () => {
    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/user/all")
        return Promise.reject(new Error("Network Error"));
      if (url === "/api/v1/category/get-category")
        return Promise.resolve({ data: { category: [] } });
      return Promise.resolve({ data: {} });
    });

    renderUsers({ token: "admin-token", user: adminUser });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    expect(await screen.findByTestId("user-list-table")).toBeInTheDocument();
    expect(screen.queryByText("Alice Tan")).not.toBeInTheDocument();

    consoleLogSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: Users + Layout - real render chain
// ─────────────────────────────────────────────────────────────────────────────

describe("Users + Layout - real render chain", () => {
  it("renders correct page title, navbar and footer via real Layout", async () => {
    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/user/all")
        return Promise.resolve({ data: { success: true, users: [] } });
      if (url === "/api/v1/category/get-category")
        return Promise.resolve({ data: { success: true, category: [] } });
      return Promise.resolve({ data: {} });
    });

    renderUsers({ token: "admin-token", user: adminUser });

    await waitFor(() => {
      expect(document.title).toBe("Dashboard - All Users");
    });

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();

    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("Layout header fetches and renders categories in navbar dropdown", async () => {
    axiosGetSpy.mockResolvedValueOnce({
      data: {
        success: true,
        categories: mockCategories,
      },
    });

    renderUsers({ token: "admin-token", user: adminUser });

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    expect(await screen.findByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Clothing")).toBeInTheDocument();
  });
});
