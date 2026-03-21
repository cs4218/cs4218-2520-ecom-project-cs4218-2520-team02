// Song Jia Hui A0259494L
// Integration tests: CartPage + Layout + AuthProvider + CartProvider
// Approach: Top-down integration - CartPage is rendered inside real context
// providers (AuthProvider, CartProvider, SearchProvider) and real routing
// (MemoryRouter). Layout is not stubbed - Header, Footer, and Helmet render
// as real components, enabling assertions on navbar, footer, and page title.

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import CartPage from "./CartPage";
import { AuthProvider } from "../context/auth";
import { CartProvider } from "../context/cart";
import { SearchProvider } from "../context/search";

jest.mock("braintree-web-drop-in-react", () => {
  const { useEffect } = require("react");
  const DropInMock = ({ onInstance }) => {
    useEffect(() => {
      onInstance({
        requestPaymentMethod: jest
          .fn()
          .mockResolvedValue({ nonce: "fake-nonce" }),
      });
    }, []);
    return <div data-testid="braintree-dropin" />;
  };
  return { __esModule: true, default: DropInMock };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockedUser = {
  _id: "user-1",
  name: "Alice",
  email: "alice@example.com",
  address: "123 Main St",
};

const mockedUserNoAddress = {
  _id: "user-1",
  name: "Alice",
  email: "alice@example.com",
};

const mockCartItems = [
  {
    _id: "p1",
    name: "NUS T-shirt",
    description: "Plain NUS T-shirt for sale",
    price: 1200,
  },
  {
    _id: "p2",
    name: "Laptop",
    description: "A powerful laptop",
    price: 50,
  },
];

const mockCategories = [
  { _id: "cat1", name: "Electronics", slug: "electronics" },
  { _id: "cat2", name: "Clothing", slug: "clothing" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

/**
 * Renders CartPage inside real providers and real router.
 */
const renderCartPage = (initialAuth = null, initialCart = []) => {
  if (initialAuth) localStorage.setItem("auth", JSON.stringify(initialAuth));
  else localStorage.removeItem("auth");

  const userId = initialAuth?.user?._id || "guest";
  if (initialCart.length)
    localStorage.setItem(`cart_${userId}`, JSON.stringify(initialCart));
  else localStorage.removeItem(`cart_${userId}`);

  return render(
    <MemoryRouter initialEntries={["/cart"]}>
      <AuthProvider>
        <SearchProvider initialValue={{ keyword: "", results: [] }}>
          <CartProvider>
            <Routes>
              <Route path="/cart" element={<CartPage />} />
              <Route path="/login" element={<div data-testid="login-page" />} />
              <Route
                path="/dashboard/user/profile"
                element={<div data-testid="profile-page" />}
              />
              <Route
                path="/dashboard/user/orders"
                element={<div data-testid="orders-page" />}
              />
            </Routes>
            <LocationDisplay />
          </CartProvider>
        </SearchProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

// ─── Spies ───────────────────────────────────────────────────────────────────

let axiosGetSpy;
let axiosPostSpy;

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  axiosGetSpy = jest.spyOn(axios, "get");
  axiosPostSpy = jest.spyOn(axios, "post");
});

afterEach(() => {
  axiosGetSpy.mockRestore();
  axiosPostSpy.mockRestore();
  localStorage.clear();
});

// ─── Shared mock factories ────────────────────────────────────────────────────

const mockAxiosGet = ({
  braintreeToken = { success: true, token: "fake-client-token" },
  categories = [],
  userAll = null,
} = {}) => {
  axiosGetSpy.mockImplementation((url) => {
    if (url === "/api/v1/product/braintree/token")
      return Promise.resolve({ data: braintreeToken });
    if (url === "/api/v1/category/get-category")
      return Promise.resolve({ data: { success: true, category: categories } });
    if (url === "/api/v1/user/all" && userAll !== null)
      return Promise.resolve({ data: userAll });
    return Promise.resolve({ data: {} });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: CartPage + Layout - real render chain
// ─────────────────────────────────────────────────────────────────────────────

describe("CartPage + Layout - real render chain", () => {
  it("renders correct page title, navbar and footer via real Layout", async () => {
    mockAxiosGet();

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    await waitFor(() => {
      expect(document.title).toBe("Ecommerce app - shop now");
    });

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();

    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("Layout Header fetches and renders categories in navbar dropdown", async () => {
    axiosGetSpy.mockResolvedValueOnce({
      data: {
        success: true,
        categories: mockCategories,
      },
    });

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    expect(await screen.findByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Clothing")).toBeInTheDocument();
  });

  it("CartPage content and Layout shell render simultaneously from same providers", async () => {
    mockAxiosGet();

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    expect(await screen.findByText("Alice")).toBeInTheDocument();

    expect(screen.getByText(/Hello\s+Alice/i)).toBeInTheDocument();

    expect(screen.getByText("About")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: CartPage + AuthProvider - guest vs authenticated rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("CartPage + AuthProvider - guest vs authenticated rendering", () => {
  it("greets guest and prompts login when cart has items", async () => {
    mockAxiosGet({ braintreeToken: { success: false } });

    renderCartPage(null, mockCartItems);

    expect(await screen.findByText("Hello Guest")).toBeInTheDocument();
    expect(screen.getByText(/Please login!/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /please login to checkout/i }),
    ).toBeInTheDocument();
  });

  it("navigates to login with cart state when guest clicks login button", async () => {
    mockAxiosGet({ braintreeToken: { success: false } });

    renderCartPage(null, mockCartItems);

    const loginBtn = await screen.findByRole("button", {
      name: /please login to checkout/i,
    });
    fireEvent.click(loginBtn);

    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
  });

  it("shows empty cart message for guest with no items", async () => {
    mockAxiosGet({ braintreeToken: { success: false } });

    renderCartPage(null, []);

    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it("greets authenticated user by name from shared AuthProvider", async () => {
    mockAxiosGet();

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    expect(await screen.findByText(/Hello\s+Alice/i)).toBeInTheDocument();
    expect(
      screen.getByText(/you have 2 items in your cart/i),
    ).toBeInTheDocument();
  });

  it("shows current address and update button when auth user has address", async () => {
    mockAxiosGet();

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    expect(await screen.findByText("Current Address")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update address/i }),
    ).toBeInTheDocument();
  });

  it("shows update address button but no address when auth user has no address", async () => {
    mockAxiosGet();

    renderCartPage(
      { token: "user-token", user: mockedUserNoAddress },
      mockCartItems,
    );

    await waitFor(() => {
      expect(screen.queryByText("Current Address")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /update address/i }),
    ).toBeInTheDocument();
  });

  it("navigates to profile when Update Address is clicked", async () => {
    mockAxiosGet();

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    const updateBtn = await screen.findByRole("button", {
      name: /update address/i,
    });
    fireEvent.click(updateBtn);

    expect(await screen.findByTestId("profile-page")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: CartPage + CartProvider - cart state integration
// ─────────────────────────────────────────────────────────────────────────────

describe("CartPage + CartProvider - cart state integration", () => {
  it("renders cart items from real CartProvider state", async () => {
    mockAxiosGet();

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    expect(await screen.findByText("NUS T-shirt")).toBeInTheDocument();
    expect(screen.getByText("Plain NUS T-shirt for sale")).toBeInTheDocument();
    expect(screen.getByText("Price : 1200")).toBeInTheDocument();

    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("A powerful laptop")).toBeInTheDocument();
    expect(screen.getByText("Price : 50")).toBeInTheDocument();
  });

  it("displays correct total from CartProvider cart state", async () => {
    mockAxiosGet();

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    expect(await screen.findByText(/Total : \$1,250\.00/i)).toBeInTheDocument();
  });

  it("removes item from CartProvider state and persists to localStorage", async () => {
    mockAxiosGet();

    const initialAuth = { token: "user-token", user: mockedUser };
    renderCartPage(initialAuth, mockCartItems);

    expect(await screen.findByText("NUS T-shirt")).toBeInTheDocument();

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("NUS T-shirt")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Laptop")).toBeInTheDocument();

    // CartProvider persisted update to localStorage under correct user key
    const stored = JSON.parse(localStorage.getItem(`cart_${mockedUser._id}`));
    expect(stored).toHaveLength(1);
    expect(stored[0]._id).toBe("p2");
  });

  it("skips item with invalid price in total and logs warning", async () => {
    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    mockAxiosGet();

    const cartWithNaNPrice = [
      {
        _id: "p1",
        name: "Laptop",
        description: "A powerful laptop",
        price: 1200,
      },
      { _id: "p2", name: "Broken", description: "Bad price", price: "abc" },
    ];

    renderCartPage({ token: "user-token", user: mockedUser }, cartWithNaNPrice);

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Invalid price at index 1:",
        "abc",
      );
    });

    expect(await screen.findByText(/Total : \$1,200\.00/i)).toBeInTheDocument();
    consoleWarnSpy.mockRestore();
  });

  it("skips item with undefined price in total and logs warning", async () => {
    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    mockAxiosGet();

    const cartWithMissingPrice = [
      {
        _id: "p1",
        name: "Laptop",
        description: "A powerful laptop",
        price: 1200,
      },
      { _id: "p2", name: "Broken", description: "No price" },
    ];

    renderCartPage(
      { token: "user-token", user: mockedUser },
      cartWithMissingPrice,
    );

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("invalid"),
        expect.anything(),
      );
    });

    expect(await screen.findByText(/Total : \$1,200\.00/i)).toBeInTheDocument();
    consoleWarnSpy.mockRestore();
  });

  it("shows empty cart message when CartProvider has no items", async () => {
    mockAxiosGet();

    renderCartPage({ token: "user-token", user: mockedUser }, []);

    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: CartPage + Braintree - payment token and DropIn integration
// ─────────────────────────────────────────────────────────────────────────────

describe("CartPage + Braintree - payment token and DropIn integration", () => {
  it("fetches token on mount and renders DropIn when token is valid", async () => {
    mockAxiosGet();

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    expect(await screen.findByTestId("braintree-dropin")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /make payment/i }),
    ).toBeInTheDocument();
    expect(axiosGetSpy).toHaveBeenCalledWith("/api/v1/product/braintree/token");
  });

  it("does not render DropIn when token fetch returns success: false", async () => {
    mockAxiosGet({ braintreeToken: { success: false } });

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token",
      );
    });

    expect(screen.queryByTestId("braintree-dropin")).not.toBeInTheDocument();
  });

  it("logs error when token fetch fails with network error", async () => {
    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    axiosGetSpy.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token")
        return Promise.reject(new Error("Token fetch failed"));
      if (url === "/api/v1/category/get-category")
        return Promise.resolve({ data: { category: [] } });
      return Promise.resolve({ data: {} });
    });

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Failed to fetch Braintree token:",
        expect.any(Error),
      );
    });

    expect(screen.queryByTestId("braintree-dropin")).not.toBeInTheDocument();
    consoleLogSpy.mockRestore();
  });

  it("does not render DropIn when cart is empty even with valid token", async () => {
    mockAxiosGet();

    renderCartPage({ token: "user-token", user: mockedUser }, []);

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token",
      );
    });

    expect(screen.queryByTestId("braintree-dropin")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /make payment/i }),
    ).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: CartPage - payment flow integration
// ─────────────────────────────────────────────────────────────────────────────

describe("CartPage - payment flow integration", () => {
  it("processes payment and navigates to orders on success", async () => {
    mockAxiosGet();
    axiosPostSpy.mockResolvedValue({ data: { success: true } });

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    const payBtn = await screen.findByRole("button", { name: /make payment/i });
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(axiosPostSpy).toHaveBeenCalledWith(
        "/api/v1/product/braintree/payment",
        { nonce: "fake-nonce", cart: mockCartItems },
      );
    });

    // Assert navigation
    expect(await screen.findByTestId("orders-page")).toBeInTheDocument();

    // Assert cart cleared from localStorage
    expect(localStorage.getItem(`cart_${mockedUser._id}`)).toBeNull();
  });

  it("shows error toast and logs error when payment POST fails", async () => {
    mockAxiosGet();
    axiosPostSpy.mockRejectedValue(new Error("Payment failed"));

    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    renderCartPage({ token: "user-token", user: mockedUser }, mockCartItems);

    await screen.findByTestId("braintree-dropin");
    const payBtn = await screen.findByRole("button", { name: /make payment/i });
    fireEvent.click(payBtn);

    const toasts = await screen.findAllByText(
      /payment failed. please try again/i,
    );
    expect(toasts.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleLogSpy.mockRestore();
  });
});
