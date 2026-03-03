// Song Jia Hui A0259494L
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import CartPage from "./CartPage";
import { AuthProvider } from "../context/auth";
import { CartProvider } from "../context/cart";
import { SearchProvider } from "../context/search";
import { Toaster } from "react-hot-toast";

// ====== Mocks ======
jest.mock("axios");

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

const mockedUser = {
  name: "Alice",
  email: "alice@example.com",
  address: "123 Main St",
};

const mockedUserNoAddress = {
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

// Helper component to expose current URL
const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

// ====== Render Routes =======
const renderCartPage = (initialAuth = null, initialCart = []) => {
  if (initialAuth) localStorage.setItem("auth", JSON.stringify(initialAuth));
  else localStorage.removeItem("auth");

  if (initialCart.length)
    localStorage.setItem("cart", JSON.stringify(initialCart));
  else localStorage.removeItem("cart");

  return render(
    <MemoryRouter initialEntries={["/cart"]}>
      <AuthProvider>
        <SearchProvider initialValue={{ keyword: "", results: [] }}>
          <CartProvider>
            {/* to keep toasts visible for testing */}
            <Toaster />
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

// ====== Tests ======
describe("CartPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    axios.get.mockResolvedValue({ data: { category: [] } });
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
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

  // ── Guest user ──────────────────────────────────────────────────────────────

  it("greets guest user and prompts login when cart has items", async () => {
    // Arrange
    axios.get.mockResolvedValue({ data: { success: false } });

    // Act
    renderCartPage(null, mockCartItems);

    // Assert
    expect(await screen.findByText("Hello Guest")).toBeInTheDocument();
    expect(screen.getByText(/Please login!/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /please login to checkout/i }),
    ).toBeInTheDocument();
  });

  it("navigates to login with cart state when guest clicks login button", async () => {
    // Arrange
    axios.get.mockResolvedValue({ data: { success: false } });

    // Act
    renderCartPage(null, mockCartItems);

    const loginBtn = await screen.findByRole("button", {
      name: /please login to checkout/i,
    });
    fireEvent.click(loginBtn);

    // Assert
    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
  });

  it("shows empty cart message for guest with no items", async () => {
    // Arrange
    axios.get.mockResolvedValue({ data: { success: false } });

    // Act
    renderCartPage(null, []);

    // Assert
    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument();
  });

  // ── Authenticated user ───────────────────────────────────────────────────────

  it("greets authenticated user by name", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    renderCartPage(initialAuth, mockCartItems);

    // Assert
    expect(await screen.findByText(/Hello\s+Alice/i)).toBeInTheDocument();
    expect(
      screen.getByText(/you have 2 items in your cart/i),
    ).toBeInTheDocument();
  });

  it("renders cart items with name, description and price", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    renderCartPage(initialAuth, mockCartItems);

    // Assert
    expect(await screen.findByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("A powerful laptop")).toBeInTheDocument();
    expect(screen.getByText("Price : 1200")).toBeInTheDocument();

    expect(screen.getByText("NUS T-shirt")).toBeInTheDocument();
    expect(screen.getByText("Plain NUS T-shirt for sale")).toBeInTheDocument();
    expect(screen.getByText("Price : 50")).toBeInTheDocument();
  });

  it("displays correct total price", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    renderCartPage(initialAuth, mockCartItems);

    // Assert - total sum of product prices
    expect(await screen.findByText(/Total : \$1,250\.00/i)).toBeInTheDocument();
  });

  it("removes item from cart when Remove button is clicked", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    renderCartPage(initialAuth, mockCartItems);

    // Assert
    expect(await screen.findByText("NUS T-shirt")).toBeInTheDocument();

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("NUS T-shirt")).not.toBeInTheDocument();
    });

    // Laptop still in cart
    expect(screen.getByText("Laptop")).toBeInTheDocument();

    // localStorage updated
    const stored = JSON.parse(localStorage.getItem("cart"));
    expect(stored).toHaveLength(1);
    expect(stored[0]._id).toBe("p2");
  });

  // ── Address handling ─────────────────────────────────────────────────────────

  it("shows current address and update button when address is set", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    renderCartPage(initialAuth, mockCartItems);

    // Assert
    expect(await screen.findByText("Current Address")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update address/i }),
    ).toBeInTheDocument();
  });

  it("navigates to profile when Update Address is clicked", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    renderCartPage(initialAuth, mockCartItems);

    const updateBtn = await screen.findByRole("button", {
      name: /update address/i,
    });
    fireEvent.click(updateBtn);

    // Assert
    expect(await screen.findByTestId("profile-page")).toBeInTheDocument();
  });

  it("shows Update Address button (no address shown) when user has no address", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUserNoAddress,
    };

    renderCartPage(initialAuth, mockCartItems);

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("Current Address")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /update address/i }),
    ).toBeInTheDocument();
  });

  it("navigates to profile when Update Address clicked and user has no address", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUserNoAddress,
    };

    renderCartPage(initialAuth, mockCartItems);

    const updateBtn = await screen.findByRole("button", {
      name: /update address/i,
    });
    fireEvent.click(updateBtn);

    // Assert
    expect(await screen.findByTestId("profile-page")).toBeInTheDocument();
  });

  // ── Braintree token ──────────────────────────────────────────────────────────

  it("fetches braintree token on mount and renders DropIn when token exists", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    renderCartPage(initialAuth, mockCartItems);

    // Assert
    expect(await screen.findByTestId("braintree-dropin")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /make payment/i }),
    ).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token");
  });

  it("logs error when braintree token fetch fails", async () => {
    // Arrange
    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.reject(new Error("Token fetch failed"));
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    renderCartPage(initialAuth, mockCartItems);

    // Assert
    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Failed to fetch Braintree token:",
        expect.any(Error),
      );
    });

    expect(screen.queryByTestId("dropin-mock")).not.toBeInTheDocument();
    consoleLogSpy.mockRestore();
  });

  it("does not render DropIn when token fetch returns success: false", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({ data: { success: false } });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    renderCartPage(initialAuth, mockCartItems);

    // Assert
    await waitFor(() => {
      expect(screen.queryByTestId("dropin-mock")).not.toBeInTheDocument();
    });
  });

  // ── Payment ──────────────────────────────────────────────────────────────────

  it("processes payment successfully and navigates to orders", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    axios.post.mockResolvedValue({ data: { success: true } });

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    renderCartPage(initialAuth, mockCartItems);

    const payBtn = await screen.findByRole("button", { name: /make payment/i });
    fireEvent.click(payBtn);

    // Assert
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/braintree/payment",
        { nonce: "fake-nonce", cart: mockCartItems },
      );
    });

    await waitFor(
      () => {
        expect(
          screen.getByText(/Payment Completed Successfully/i),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    expect(await screen.findByTestId("orders-page")).toBeInTheDocument();
    expect(localStorage.getItem("cart")).toBeNull();
  });

  it("shows error toast and logs error when payment fails", async () => {
    // Arrange
    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    axios.post.mockRejectedValue(new Error("Payment failed"));

    // Act
    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    renderCartPage(initialAuth, mockCartItems);

    await screen.findByTestId("braintree-dropin"); 
    const payBtn = await screen.findByRole("button", { name: /make payment/i });
    fireEvent.click(payBtn);

    // Assert
    const toasts = await screen.findAllByText(
      /payment failed. please try again/i,
    );
    expect(toasts.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleLogSpy.mockRestore();
  });

  it("skips invalid cart items with no price in total calculation", async () => {
    // Arrange
    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    const cartWithInvalidItem = [
      {
        _id: "p1",
        name: "Laptop",
        description: "A powerful laptop",
        price: 1200,
      },
      { _id: "p2", name: "Broken", description: "No price item" }, // price === undefined
    ];

    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    // Act
    renderCartPage(initialAuth, cartWithInvalidItem);

    // Assert
    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("invalid"),
        expect.anything(),
      );
    });

    // Total should only count valid item
    expect(await screen.findByText(/Total : \$1,200\.00/i)).toBeInTheDocument();

    consoleWarnSpy.mockRestore();
  });

  it("skips cart item with undefined price in total calculation", async () => {
    // Arrange
    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    const cartWithUndefinedPrice = [
      {
        _id: "p1",
        name: "Laptop",
        description: "A powerful laptop",
        price: 1200,
      },
      {
        _id: "p2",
        name: "Broken Item",
        description: "Item missing price",
        price: undefined,
      },
    ];

    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    // Act
    renderCartPage(initialAuth, cartWithUndefinedPrice);

    // Assert
    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("invalid"),
        expect.anything(),
      );
    });

    // Only the valid $1200 item is counted
    expect(await screen.findByText(/Total : \$1,200\.00/i)).toBeInTheDocument();

    consoleWarnSpy.mockRestore();
  });

  it("does not render DropIn when cart is empty but user is authenticated with token", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    // Act
    renderCartPage(initialAuth, []); // empty cart

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token");
    });

    expect(screen.queryByTestId("braintree-dropin")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /make payment/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it("skips cart item with NaN price in total calculation", async () => {
    // Arrange
    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({
          data: { success: true, token: "fake-client-token" },
        });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    const cartWithNaNPrice = [
      {
        _id: "p1",
        name: "Laptop",
        description: "A powerful laptop for work",
        price: 1200,
      },
      {
        _id: "p2",
        name: "Broken",
        description: "Item with bad price value",
        price: "abc",
      },
    ];

    const initialAuth = {
      token: "user-token",
      user: mockedUser,
    };

    // Act
    renderCartPage(initialAuth, cartWithNaNPrice);

    // Assert
    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Invalid price at index 1:",
        "abc",
      );
    });

    // Only the $1200 item contributes to total
    expect(await screen.findByText(/Total : \$1,200\.00/i)).toBeInTheDocument();

    consoleWarnSpy.mockRestore();
  });
});
