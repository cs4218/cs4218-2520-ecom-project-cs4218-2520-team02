// Song Jia Hui A0259494L
// Integration tests: Dashboard + Layout + UserMenu
// Approach: Top-down integration - Dashboard is rendered inside real context
// providers (AuthProvider, SearchProvider, CartProvider) and real routing.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./Dashboard";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockedUser = {
  name: "Alice Tan",
  email: "alice@example.com",
  address: "123 Main Street",
  password: "hashedpassword",
  phone: "12345678",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Renders Dashboard directly (no PrivateRoute wrapper) inside real providers.
 */
const renderDashboard = (initialAuth = null) => {
  if (initialAuth) localStorage.setItem("auth", JSON.stringify(initialAuth));
  else localStorage.removeItem("auth");

  return render(
    <MemoryRouter initialEntries={["/dashboard/user"]}>
      <AuthProvider>
        <SearchProvider initialValue={{ keyword: "", results: [] }}>
          <CartProvider>
            <Routes>
              <Route path="/dashboard/user" element={<Dashboard />} />
            </Routes>
          </CartProvider>
        </SearchProvider>
      </AuthProvider>
    </MemoryRouter>,
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
  axiosGetSpy = jest.spyOn(axios, "get");
  axiosGetSpy.mockResolvedValue({ data: { success: true, categories: [] } });
});

afterEach(() => {
  axiosGetSpy.mockRestore();
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Dashboard + AuthProvider - user field rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("Dashboard + AuthProvider - user field rendering", () => {
  it("renders user name, email and address from shared auth context", async () => {
    renderDashboard({ token: "user-token", user: mockedUser });

    const name = await screen.findAllByText("Alice Tan");
    expect(name[0]).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("123 Main Street")).toBeInTheDocument();
  });

  it("renders empty user fields when no auth state is present", async () => {
    renderDashboard(null);

    await waitFor(() => {
      expect(screen.queryByText("Alice Tan")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("alice@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("123 Main Street")).not.toBeInTheDocument();
  });

  it("renders only available fields when user object is incomplete", async () => {
    renderDashboard({ token: "user-token", user: { name: "Bob" } });

    const allNames = await screen.findAllByText("Bob");
    expect(allNames.length).toBeGreaterThan(0);

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(3);
    expect(headings[0]).toHaveTextContent("Bob");
    expect(headings[1]).toHaveTextContent("");
    expect(headings[2]).toHaveTextContent("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Dashboard + Layout - real render chain
// ─────────────────────────────────────────────────────────────────────────────

describe("Dashboard + Layout - real render chain", () => {
  it("renders correct page title, navbar and footer via real Layout", async () => {
    renderDashboard({ token: "user-token", user: mockedUser });

    await waitFor(() => {
      expect(document.title).toBe("Dashboard - Ecommerce App");
    });

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();

    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("Layout's header fetches categories and renders them when available", async () => {
    const mockCategories = [
      { _id: "cat1", name: "Electronics", slug: "electronics" },
      { _id: "cat2", name: "Clothing", slug: "clothing" },
    ];

    axiosGetSpy.mockResolvedValueOnce({
      data: {
        success: true,
        categories: mockCategories,
      },
    });

    renderDashboard({ token: "user-token", user: mockedUser });

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // Categories rendered in Layout's navbar dropdown - not Dashboard
    expect(await screen.findByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Clothing")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Dashboard + UserMenu - nav link integration
// ─────────────────────────────────────────────────────────────────────────────

describe("Dashboard + UserMenu - nav link integration", () => {
  it("renders Profile and Orders nav links via real UserMenu", async () => {
    renderDashboard({ token: "user-token", user: mockedUser });

    expect(
      await screen.findByRole("link", { name: /profile/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /orders/i })).toBeInTheDocument();
  });

  it("user name appears in both Dashboard card and UserMenu from same auth context", async () => {

    renderDashboard({ token: "user-token", user: mockedUser });

    const allNames = await screen.findAllByText("Alice Tan");
    expect(allNames.length).toBeGreaterThan(1);
  });
});
