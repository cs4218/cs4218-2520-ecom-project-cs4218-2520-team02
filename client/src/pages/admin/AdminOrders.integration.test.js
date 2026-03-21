// Song Jia Hui A0259494L
// Integration tests: AdminOrders + AdminDashboard
// Approach: Top-down integration - components are rendered with real context providers
// (AuthProvider, CartProvider, SearchProvider) and real routing. Only the HTTP layer
// (axios) is mocked via jest.spyOn, preserving the real module (including default
// headers set by AuthProvider) while intercepting specific methods.

import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  findByText,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import { BrowserRouter } from "react-router-dom";
import AdminOrders from "./AdminOrders";
import AdminDashboard from "./AdminDashboard";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("../../components/Layout", () => {
  return function LayoutStub({ children }) {
    return <div data-testid="layout-stub">{children}</div>;
  };
});

jest.mock("../../components/AdminMenu", () => {
  return function AdminMenuStub() {
    return <div data-testid="admin-menu-stub" />;
  };
});

// ─── Constant declarations ──────────────────────────────────────────────────────

const adminUser = {
  name: "Admin Alice",
  email: "alice@admin.com",
  phone: "91234567",
  role: 1,
};

const mockOrders = [
  {
    _id: "order1",
    status: "Not Processed",
    buyer: { name: "Alice" },
    createdAt: new Date().toISOString(),
    payment: { success: true },
    products: [
      { _id: "p1", name: "Widget", description: "Nice widget", price: 9.99 },
    ],
  },
];

const mockMultipleOrders = [
  {
    _id: "order1",
    status: "Not Processed",
    buyer: { name: "Alice" },
    createdAt: new Date().toISOString(),
    payment: { success: true },
    products: [
      { _id: "p1", name: "Widget", description: "Nice widget", price: 9.99 },
      { _id: "p2", name: "Gadget", description: "Cool gadget", price: 19.99 },
    ],
  },
  {
    _id: "order2",
    status: "Shipped",
    buyer: { name: "Bob" },
    createdAt: new Date().toISOString(),
    payment: { success: false },
    products: [
      {
        _id: "p3",
        name: "Computer",
        description: "Useful computer",
        price: 4.99,
      },
    ],
  },
];

const failedPaymentOrder = [
  {
    _id: "order2",
    status: "Processing",
    buyer: { name: "Bob" },
    createdAt: new Date().toISOString(),
    payment: { success: false },
    products: [
      { _id: "p2", name: "Gadget", description: "Cool gadget", price: 19.99 },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const Wrapper = ({ children, initialAuth } = {}) => {
  if (initialAuth) localStorage.setItem("auth", JSON.stringify(initialAuth));
  else localStorage.removeItem("auth");

  return (
    <BrowserRouter>
      <AuthProvider>
        <SearchProvider initialValue={{ keyword: "", results: [] }}>
          <CartProvider>{children}</CartProvider>
        </SearchProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

let axiosGetSpy;
let axiosPutSpy;

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
  axiosPutSpy = jest.spyOn(axios, "put");
});

afterEach(() => {
  axiosGetSpy.mockRestore();
  axiosPutSpy.mockRestore();
});

const mockAdminAxios = (orders = mockOrders) => {
  axiosGetSpy.mockImplementation((url) => {
    if (url === "/api/v1/auth/admin-auth")
      return Promise.resolve({ data: { ok: true } });
    if (url === "/api/v1/auth/all-orders")
      return Promise.resolve({ data: { success: true, orders } });
    return Promise.resolve({ data: {} });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: AdminOrders + AdminDashboard — shared AuthContext integration
// ─────────────────────────────────────────────────────────────────────────────

describe("AdminOrders + AdminDashboard - shared AuthContext integration", () => {
  it("shared auth token populates AdminDashboard fields and triggers AdminOrders fetch", async () => {
    mockAdminAxios();

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminDashboard />
        <AdminOrders />
      </Wrapper>,
    );

    expect(
      await screen.findByText(/Admin Name : Admin Alice/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Admin Email : alice@admin\.com/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Admin Contact : 91234567/i)).toBeInTheDocument();

    expect(await screen.findByText("All Orders")).toBeInTheDocument();
    expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/auth/all-orders");
  });

  it("absent auth token prevents order fetch and leaves dashboard user fields empty", async () => {
    axiosGetSpy.mockResolvedValue({ data: {} });

    render(
      <Wrapper initialAuth={null}>
        <AdminDashboard />
        <AdminOrders />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(axiosGetSpy).not.toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });

    expect(screen.getByText(/Admin Name :/i)).toBeInTheDocument();
    expect(screen.queryByText(/Admin Alice/i)).not.toBeInTheDocument();
  });

  it("AdminDashboard displays correct user while AdminOrders shows their orders", async () => {
    mockAdminAxios();

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminDashboard />
        <AdminOrders />
      </Wrapper>,
    );

    expect(
      await screen.findByText(/Admin Name : Admin Alice/i),
    ).toBeInTheDocument();
    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Widget")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: AdminOrders — fetching and rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("AdminOrders - fetching and rendering", () => {
  it("fetches and renders orders when admin is authenticated", async () => {
    mockAdminAxios();

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminOrders />
      </Wrapper>,
    );

    expect(await screen.findByText(/All Orders/i)).toBeInTheDocument();
    expect(await screen.findByText(/Alice/i)).toBeInTheDocument();
    expect(screen.getByText("Widget")).toBeInTheDocument();
    expect(screen.getByText(/Price : 9.99/)).toBeInTheDocument();
    expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    expect(screen.getAllByText("Success")).toHaveLength(1);
  });

  it("renders multiple orders with correct buyer names and product counts", async () => {
    mockAdminAxios(mockMultipleOrders);

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminOrders />
      </Wrapper>,
    );

    expect(await screen.findByText(/Alice/i)).toBeInTheDocument();
    expect(await screen.findByText(/Bob/i)).toBeInTheDocument();

    const quantities = screen.getAllByRole("cell", { name: /^[0-9]+$/ });
    const quantityValues = quantities.map((el) => el.textContent);
    expect(quantityValues).toContain("2");
    expect(quantityValues).toContain("1");
  });

  it("renders empty orders list when API returns no orders", async () => {
    mockAdminAxios([]);

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminOrders />
      </Wrapper>,
    );

    expect(await screen.findByText(/All Orders/i)).toBeInTheDocument();
    expect(screen.queryByText(/Alice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bob/i)).not.toBeInTheDocument();
  });

  it('renders "Failed" and "Success" for mixed payment statuses', async () => {
    mockAdminAxios(mockMultipleOrders);

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminOrders />
      </Wrapper>,
    );

    expect(await screen.findByText(/Bob/i)).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it('renders only "Failed" when all payments are unsuccessful', async () => {
    mockAdminAxios(failedPaymentOrder);

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminOrders />
      </Wrapper>,
    );

    expect(await screen.findByText(/Bob/i)).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.queryByText("Success")).not.toBeInTheDocument();
  });

  it("does not fetch orders when no auth token is present", async () => {
    axiosGetSpy.mockResolvedValue({ data: {} });

    render(
      <Wrapper initialAuth={null}>
        <AdminOrders />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(axiosGetSpy).not.toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: AdminOrders — error handling
// ─────────────────────────────────────────────────────────────────────────────

describe("AdminOrders - error handling", () => {
  it("logs error when fetching orders fails with a network error", async () => {
    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth")
        return Promise.resolve({ data: { ok: true } });
      if (url === "/api/v1/auth/all-orders")
        return Promise.reject(new Error("Network Error"));
      return Promise.resolve({ data: {} });
    });

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminOrders />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleLogSpy.mockRestore();
  });

  it("logs failure message when API returns success: false with a message", async () => {
    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth")
        return Promise.resolve({ data: { ok: true } });
      if (url === "/api/v1/auth/all-orders")
        return Promise.resolve({
          data: { success: false, message: "Unauthorized" },
        });
      return Promise.resolve({ data: {} });
    });

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminOrders />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Failed to fetch orders: ",
        "Unauthorized",
      );
    });

    consoleLogSpy.mockRestore();
  });

  it("logs fallback message when API returns success: false with no message", async () => {
    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth")
        return Promise.resolve({ data: { ok: true } });
      if (url === "/api/v1/auth/all-orders")
        return Promise.resolve({ data: { success: false } });
      return Promise.resolve({ data: {} });
    });

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminOrders />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Failed to fetch orders: ",
        "Unknown error",
      );
    });

    consoleLogSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: AdminOrders — status change interaction
// ─────────────────────────────────────────────────────────────────────────────

describe("AdminOrders - status change interaction", () => {
  it("calls order-status API and re-fetches orders on status change", async () => {
    mockAdminAxios();
    axiosPutSpy.mockResolvedValue({ data: { success: true } });

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminOrders />
      </Wrapper>,
    );

    await screen.findByText("All Orders");
    await screen.findByText("Alice");

    axiosGetSpy.mockClear();
    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/auth/all-orders")
        return Promise.resolve({ data: { success: true, orders: mockOrders } });
      return Promise.resolve({ data: {} });
    });

    const selects = screen.getAllByRole("combobox");
    fireEvent.mouseDown(selects[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Processing").length).toBeGreaterThan(1);
    });

    const processingOptions = screen.getAllByText("Processing");
    fireEvent.click(processingOptions[processingOptions.length - 1]);

    await waitFor(() => {
      expect(axiosPutSpy).toHaveBeenCalledWith(
        "/api/v1/auth/order-status/order1",
        { status: "Processing" },
      );
    });

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });
  });

  it("logs error and preserves rendered orders when PUT request fails", async () => {
    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    mockAdminAxios();
    axiosPutSpy.mockRejectedValue(new Error("Update failed"));

    render(
      <Wrapper initialAuth={{ user: adminUser, token: "admin-token" }}>
        <AdminOrders />
      </Wrapper>,
    );

    await screen.findByText("All Orders");
    await screen.findByText("Alice");

    const selects = screen.getAllByRole("combobox");
    fireEvent.mouseDown(selects[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Shipped").length).toBeGreaterThan(0);
    });

    const shippedOptions = screen.getAllByText("Shipped");
    fireEvent.click(shippedOptions[shippedOptions.length - 1]);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    expect(screen.getByText("Alice")).toBeInTheDocument();
    consoleLogSpy.mockRestore();
  });
});
