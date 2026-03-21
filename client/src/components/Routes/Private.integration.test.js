// Song Jia Hui A0259494L
// Integration tests: PrivateRoute + Dashboard
// Approach: Top-down integration - PrivateRoute and Dashboard are rendered together
// inside real context providers (AuthProvider, CartProvider, SearchProvider) and
// real routing (MemoryRouter). Only the HTTP layer (axios) is intercepted via
// jest.spyOn, preserving the real axios module including default headers set by
// AuthProvider.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PrivateRoute from "./Private";
import Dashboard from "../../pages/user/Dashboard";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("../../components/Layout", () => {
  return function LayoutStub({ children }) {
    return <div data-testid="layout-stub">{children}</div>;
  };
});

jest.mock("../../components/UserMenu", () => {
  return function UserMenuStub() {
    return <div data-testid="user-menu-stub" />;
  };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const validUser = {
  name: "Jane Doe",
  email: "jane@example.com",
  address: "123 Main Street",
  role: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Renders PrivateRoute wrapping Dashboard inside real providers and router.
 */
const renderFlow = (initialAuth) => {
  if (initialAuth) localStorage.setItem("auth", JSON.stringify(initialAuth));
  else localStorage.removeItem("auth");

  return render(
    <MemoryRouter initialEntries={["/dashboard/user"]}>
      <AuthProvider>
        <SearchProvider initialValue={{ keyword: "", results: [] }}>
          <CartProvider>
            <Routes>
              <Route element={<PrivateRoute />}>
                <Route path="/dashboard/user" element={<Dashboard />} />
              </Route>
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
});

afterEach(() => {
  axiosGetSpy.mockRestore();
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: PrivateRoute + Dashboard - full auth-gating flow
// ─────────────────────────────────────────────────────────────────────────────

describe("PrivateRoute + Dashboard - full auth-gating flow", () => {
  it("valid token passes auth check and Dashboard renders user fields from shared context", async () => {
    // PrivateRoute calls axios with the token from AuthProvider,
    // then Outlet renders Dashboard which reads the same AuthProvider for user fields.
    axiosGetSpy.mockResolvedValue({ data: { ok: true } });

    renderFlow({ user: validUser, token: "user-token" });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("123 Main Street")).toBeInTheDocument();

    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it("Dashboard fields are empty when auth user has no profile data", async () => {
    // Edge case: token is valid but user object has no name/email/address.
    axiosGetSpy.mockResolvedValue({ data: { ok: true } });
    const emptyUser = { name: "", email: "", address: "", role: 0 };

    renderFlow({ user: emptyUser, token: "user-token" });

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    expect(await screen.findByTestId("layout-stub")).toBeInTheDocument();

    // Fields are blank - Dashboard reads from the same AuthProvider
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
  });

  it("failed auth check blocks Dashboard and keeps spinner visible", async () => {
    axiosGetSpy.mockRejectedValue(new Error("Unauthorized"));

    renderFlow({ user: validUser, token: "bad-token" });

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("no token skips auth check and blocks Dashboard entirely", async () => {
    renderFlow(null);

    await waitFor(() => {
      expect(axiosGetSpy).not.toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: PrivateRoute - auth-gating in isolation
// ─────────────────────────────────────────────────────────────────────────────

const ProtectedStub = () => <div>Protected Content</div>;

const renderPrivateRouteOnly = (initialAuth) => {
  if (initialAuth) localStorage.setItem("auth", JSON.stringify(initialAuth));
  else localStorage.removeItem("auth");

  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <AuthProvider>
        <SearchProvider initialValue={{ keyword: "", results: [] }}>
          <CartProvider>
            <Routes>
              <Route element={<PrivateRoute />}>
                <Route path="/protected" element={<ProtectedStub />} />
              </Route>
            </Routes>
          </CartProvider>
        </SearchProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe("PrivateRoute - auth-gating behaviour", () => {
  it("renders protected content when auth check succeeds", async () => {
    axiosGetSpy.mockResolvedValue({ data: { ok: true } });

    renderPrivateRouteOnly({ user: { role: 0 }, token: "user-token" });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    expect(await screen.findByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/auth/user-auth");
  });

  it("keeps spinner and hides protected content when auth check throws", async () => {
    axiosGetSpy.mockRejectedValue(new Error("Network Error"));

    renderPrivateRouteOnly({ user: { role: 0 }, token: "invalid-token" });

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("skips auth check and shows spinner when no token is present", async () => {
    renderPrivateRouteOnly(null);

    await waitFor(() => {
      expect(axiosGetSpy).not.toHaveBeenCalled();
    });

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
