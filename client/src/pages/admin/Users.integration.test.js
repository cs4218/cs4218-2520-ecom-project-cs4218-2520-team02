// Song Jia Hui A0259494L
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
import { afterEach } from "node:test";

// ====== Mocks =====
jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));
jest.mock("../../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

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

// ====== Render Routes =====
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

// ====== Tests =====
describe("Users Page", () => {
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

  it("renders page title and admin menu", async () => {
    // Arrange - mock empty users
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/user/all") {
        return Promise.resolve({ data: { success: true, users: [] } });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "admin-token",
      user: { role: 1, name: "Admin" },
    };
    renderUsers(initialAuth);

    // Assert
    expect(await screen.findByText("All Users")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create category/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create product/i }),
    ).toBeInTheDocument();
  });

  it("shows loading state then renders users table", async () => {
    // Arrange - mock users
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/user/all") {
        return Promise.resolve({ data: { success: true, users: mockUsers } });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "admin-token",
      user: { role: 1, name: "Admin" },
    };
    renderUsers(initialAuth);

    // Assert - loading state shown initially
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Table appears after data loads
    expect(await screen.findByTestId("user-list-table")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("renders all users with correct details", async () => {
    // Arrange - mock users
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/user/all") {
        return Promise.resolve({ data: { success: true, users: mockUsers } });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "admin-token",
      user: { role: 1, name: "Admin" },
    };
    renderUsers(initialAuth);

    // Assert - all user details rendered correctly
    expect(await screen.findByText("Alice Tan")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("91234567")).toBeInTheDocument();
    expect(screen.getByText("123 Main Street")).toBeInTheDocument();

    expect(screen.getByText("Bob Lee")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("98765432")).toBeInTheDocument();
    expect(screen.getByText("456 Elm Avenue")).toBeInTheDocument();
  });

  it("renders empty table when no users exist", async () => {
    // Arrange - mock empty users
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/user/all") {
        return Promise.resolve({ data: { success: true, users: [] } });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "admin-token",
      user: { role: 1, name: "Admin" },
    };
    renderUsers(initialAuth);

    // Assert - table renders but no user rows
    expect(await screen.findByTestId("user-list-table")).toBeInTheDocument();

    // Table headers present but no data rows
    expect(
      screen.getByRole("columnheader", { name: /name/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /email/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Alice Tan")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob Lee")).not.toBeInTheDocument();
  });

  it("shows error toast when API returns success: false", async () => {
    // Arrange - mock API failure response
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/user/all") {
        return Promise.resolve({ data: { success: false } });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "admin-token",
      user: { role: 1, name: "Admin" },
    };
    renderUsers(initialAuth);

    // Assert - error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to fetch users");
    });

    // Table still renders (loading done) but no users shown
    expect(await screen.findByTestId("user-list-table")).toBeInTheDocument();
    expect(screen.queryByText("Alice Tan")).not.toBeInTheDocument();
  });

  it("shows error toast and logs error on network failure", async () => {
    // Arrange - mock network error
    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/user/all") {
        return Promise.reject(new Error("Network Error"));
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "admin-token",
      user: { role: 1, name: "Admin" },
    };
    renderUsers(initialAuth);

    // Assert - error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    // Table renders (finally block ran) but no users
    expect(await screen.findByTestId("user-list-table")).toBeInTheDocument();
    expect(screen.queryByText("Alice Tan")).not.toBeInTheDocument();

    consoleLogSpy.mockRestore();
  });
});
