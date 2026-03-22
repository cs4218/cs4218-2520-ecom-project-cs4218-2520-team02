// Gavin Sin Fu Chen, A0273285X
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";

import AdminDashboard from "./AdminDashboard";
import AdminRoute from "../../components/Routes/AdminRoute";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("axios");

jest.mock("../../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

const renderAdminDashboard = () => {
  render(
    <MemoryRouter initialEntries={["/dashboard/admin"]}>
      <AuthProvider>
        <SearchProvider>
          <CartProvider>
            <Routes>
              <Route path="/dashboard" element={<AdminRoute />}>
                <Route path="admin" element={<AdminDashboard />} />
              </Route>
            </Routes>
          </CartProvider>
        </SearchProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

function seedLocalStorage({ auth = null } = {}) {
  if (auth) {
    localStorage.setItem("auth", JSON.stringify(auth));
  }
}

const adminUser = {
  _id: "123",
  name: "Admin User",
  email: "admin@example.com",
  phone: "1234567890",
  role: 1,
};

const sampleUser = {
  _id: "124",
  name: "Test User",
  email: "test@example.com",
  phone: "1234567890",
  role: 0,
};

describe("Admin Dashboard Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    axios.get.mockResolvedValue({});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders admin dashboard when admin auth succeeds", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
    });
    seedLocalStorage({ auth: { user: adminUser, token: "valid-token" } });
    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    });

    expect(screen.getByText("Admin Name : Admin User")).toBeInTheDocument();
    expect(
      screen.getByText("Admin Email : admin@example.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("Admin Contact : 1234567890")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Create Category" }),
    ).toHaveAttribute("href", "/dashboard/admin/create-category");

    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "href",
      "/dashboard/admin/users",
    );
  });

  it("should be redirected if login user is not admin", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: false } });
      }
    });
    seedLocalStorage({ auth: { user: sampleUser, token: "valid-token" } });
    renderAdminDashboard();

    expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
  });
});
