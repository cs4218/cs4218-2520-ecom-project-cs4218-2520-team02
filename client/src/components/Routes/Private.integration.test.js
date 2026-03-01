// Song Jia Hui A0259494L
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import { Route, Routes } from "react-router-dom";
import PrivateRoute from "./Private";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import { MemoryRouter } from "react-router-dom";

jest.mock("axios");

const UserDashboard = () => <div>User Dashboard (Protected Content)</div>;
const Login = () => <div>Login Page</div>;

const renderPrivateRoute = (initialAuth) => {
  if (initialAuth) localStorage.setItem("auth", JSON.stringify(initialAuth));
  else localStorage.removeItem("auth");

  return render(
    <MemoryRouter initialEntries={["/dashboard/user"]}>
      <AuthProvider>
        <SearchProvider initialValue={{ keyword: "", results: [] }}>
          <CartProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<PrivateRoute />}>
                <Route path="/dashboard/user" element={<UserDashboard />} />
              </Route>
            </Routes>
          </CartProvider>
        </SearchProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe("PrivateRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
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

  it("renders protected content when auth check succeeds", async () => {
    // Arrange
    axios.get.mockResolvedValue({ data: { ok: true } });

    // Act
    const initialAuth = { user: { role: 0 }, token: "user-token" };
    renderPrivateRoute(initialAuth);

    // Assert - spinner should show immediately
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Protected content appears
    expect(
      await screen.findByText("User Dashboard (Protected Content)"),
    ).toBeInTheDocument();

    // Spinner disappears
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();

    expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
  });

  it("renders spinner and redirects when auth check fails (network error)", async () => {
    // Arrange
    axios.get.mockRejectedValue(new Error("Unauthorized"));

    // Act
    const initialAuth = { user: { role: 0 }, token: "invalid-token" };
    renderPrivateRoute(initialAuth);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    expect(
      screen.queryByText("User Dashboard (Protected Content)"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders spinner without calling auth check when no token present", async () => {
    // Arrange - no token in localStorage

    // Act
    renderPrivateRoute(null);

    // Assert

    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    expect(
      screen.queryByText("User Dashboard (Protected Content)"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("invalid token case: renders spinner and does not show protected content", async () => {
    // Arrange
    axios.get.mockResolvedValue({ data: { ok: false } });

    // Act
    const initialAuth = { user: { role: 0 }, token: "invalid-token" };
    renderPrivateRoute(initialAuth);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    expect(
      screen.queryByText("User Dashboard (Protected Content)"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
