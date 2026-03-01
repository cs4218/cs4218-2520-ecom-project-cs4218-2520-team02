// Song Jia Hui A0259494L
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./Dashboard";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("axios");

const mockedUser = {
  name: "Alice Tan",
  email: "alice@example.com",
  address: "123 Main Street",
  password: "hashedpassword",
  phone: "12345678",
};

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

describe("User Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    axios.get.mockResolvedValue({ data: { category: [] } });
  });

  afterEach(() => {
    localStorage.clear();
  });

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("renders user name, email, contact and address when authenticated", async () => {
    // Arrange - set authenticated state with mocked user
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    // Act
    renderDashboard(initialAuth);

    // Assert
    const name = await screen.findAllByText("Alice Tan");

    expect(name[0]).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("123 Main Street")).toBeInTheDocument();
  });

  it("renders nothing for user fields when not authenticated", async () => {
    // Act - no auth state
    renderDashboard(null);

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("Alice Tan")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText("alice@example.com")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText("123 Main Street")).not.toBeInTheDocument();
    });
  });

  it("renders dashboard layout with correct layout, footer and header", async () => {
    // Arrange - set authenticated state with mocked user
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    // Act
    renderDashboard(initialAuth);

    // Assert
    await waitFor(() => {
      expect(document.title).toBe("Dashboard - Ecommerce App");
    });

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();

    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("renders user menu links", async () => {
    // Arrange - set authenticated state with mocked user
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    // Act
    renderDashboard(initialAuth);

    // Assert
    const allNames = await screen.findAllByText("Alice Tan");
    expect(allNames.length).toBeGreaterThan(0);

    expect(screen.getByRole("link", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /orders/i })).toBeInTheDocument();
  });

  it("renders partially when user is missing optional fields", async () => {
    // Arrange
    const initialAuth = {
      token: "user-token",
      user: {
        name: "Bob",
      },
    };

    // Act
    renderDashboard(initialAuth);

    // Assert
    const allNames = await screen.findAllByText("Bob");
    expect(allNames.length).toBeGreaterThan(0);

    // email and address render but are empty
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.length).toBe(3);
    expect(headings[0]).toHaveTextContent("Bob");
    expect(headings[1]).toHaveTextContent("");
    expect(headings[2]).toHaveTextContent("");
  });
});
