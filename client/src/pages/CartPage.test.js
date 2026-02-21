// Song Jia Hui A0259494L
import CartPage from "./CartPage";
import axios from "axios";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";
import toast from "react-hot-toast";

jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children, title }) => (
    <div data-testid="layout" title={title}>
      {children}
    </div>
  ),
}));

jest.mock("../context/auth", () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

jest.mock("../context/cart", () => ({
  __esModule: true,
  useCart: jest.fn(),
}));

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockSetCart = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

const renderCartPage = () =>
  render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>
  );

const mockCart = [
  { _id: "1", name: "Product A", description: "Desc A", price: 100 },
  { _id: "2", name: "Product B", description: "Desc B", price: 200 },
];

const mockAuth = {
  token: "fake-token",
  user: { name: "John", address: "123 Main St" },
};

jest.mock("braintree-web-drop-in-react", () => {
  const { useEffect } = require("react");
  const DropInMock = ({ onInstance }) => {
    useEffect(() => {
      onInstance({
        requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: "fake-nonce" }),
      });
    }, []);
    return <div data-testid="braintree-dropin" />;
  };
  return { __esModule: true, default: DropInMock };
});

describe("CartPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockCart, jest.fn()]);
    axios.get.mockResolvedValue({
      data: { success: true, token: "braintree-client-token" },
    });
  });

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("[EP] renders without crashing when auth and cart are valid", () => {
    // Arrange - beforeEach provides mockAuth and mockCart

    // Act
    renderCartPage();

    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  it("[EP] calculates and displays total price correctly for valid cart items", () => {
    // Arrange
    const cartItems = [
      { price: 10, description: "item1" },
      { price: 5, description: "item2" },
    ];
    useCart.mockReturnValue([cartItems, jest.fn()]);

    // Act
    renderCartPage();

    // Assert
    expect(screen.getByText(/Total : \$15.00/i)).toBeInTheDocument();
  });

  it("[EP] skips item and logs warning when cart item has a non-numeric price", () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const cartItems = [
      { price: 10, description: "item1" },
      { price: "invalid", description: "item2" },
    ];
    useCart.mockReturnValue([cartItems, jest.fn()]);

    // Act
    renderCartPage();

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid price at index 1:",
      "invalid"
    );
  });

  it("[EP] skips item and logs warning when cart item has no price field", () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const cartItems = [
      { price: 10, description: "item1" },
      { invalidField: undefined, description: "item2" },
    ];
    useCart.mockReturnValue([cartItems, jest.fn()]);

    // Act
    renderCartPage();

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      "Cart item at index 1 is invalid:",
      { invalidField: undefined, description: "item2" }
    );
  });

  it("[EP] removes the correct item from cart when Remove is clicked", () => {
    // Arrange
    const cartItems = [
      { _id: "1", price: 10, description: "item1" },
      { _id: "2", price: 5, description: "item2" },
    ];
    const setCartMock = jest.fn();
    useCart.mockReturnValue([cartItems, setCartMock]);

    // Act
    renderCartPage();
    fireEvent.click(screen.getAllByText(/Remove/i)[0]);

    // Assert
    expect(setCartMock).toHaveBeenCalledWith([
      { _id: "2", price: 5, description: "item2" },
    ]);
  });

  it("[EP] shows current address and Update Address button when user has an address", () => {
    // Arrange
    useAuth.mockReturnValue([
      { user: { name: "Test User", address: "123 Test St" }, token: "test-token" },
      jest.fn(),
    ]);

    // Act
    renderCartPage();

    // Assert
    expect(screen.getByText(/Current Address/i)).toBeInTheDocument();
    expect(screen.getByText(/123 Test St/i)).toBeInTheDocument();
  });

  it("[EP] navigates to profile when logged-in user without address clicks Update Address", () => {
    // Arrange
    useAuth.mockReturnValue([
      { user: { name: "Test User" }, token: "test-token" },
      jest.fn(),
    ]);

    // Act
    renderCartPage();
    fireEvent.click(screen.getAllByText(/Update Address/i)[0]);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("[EP] navigates to profile when logged-in user with address clicks Update Address", () => {
    // Arrange
    useAuth.mockReturnValue([
      { user: { name: "John", address: "123 Main St" }, token: "fake-token" },
      jest.fn(),
    ]);

    // Act
    renderCartPage();
    fireEvent.click(screen.getByText(/Update Address/i));

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("[EP] navigates to login with cart state when guest user clicks Please Login to checkout", () => {
    // Arrange
    useAuth.mockReturnValue([{ user: null, token: null }, jest.fn()]);

    // Act
    renderCartPage();
    fireEvent.click(screen.getByText(/Please Login to checkout/i));

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
  });

  it("[EP] shows item count with login prompt when cart has items but user is not logged in", () => {
    // Arrange
    useAuth.mockReturnValue([{ user: null, token: null }, jest.fn()]);
    useCart.mockReturnValue([mockCart, jest.fn()]);

    // Act
    renderCartPage();

    // Assert
    expect(screen.getByText(/You have 2 items in your cart. Please login!/i)).toBeInTheDocument();
  });

  it("[EP] shows item count without login prompt when cart has items and user is logged in", () => {
    // Arrange - beforeEach provides authenticated state and mockCart

    // Act
    renderCartPage();

    // Assert
    expect(screen.getByText(/You have 2 items in your cart./i)).toBeInTheDocument();
    expect(screen.queryByText(/Please login!/i)).not.toBeInTheDocument();
  });

  it("[BVA] shows empty cart message when cart has zero items", () => {
    // Arrange
    useCart.mockReturnValue([[], jest.fn()]);

    // Act
    renderCartPage();

    // Assert
    expect(screen.getByText(/Your cart is empty./i)).toBeInTheDocument();
  });

  // ---------------------------
  // getToken tests
  // ---------------------------
  describe("getToken", () => {

    it("[EP] fetches client token and renders DropIn when API returns success:true", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, token: "braintree-client-token" },
      });

      // Act
      renderCartPage();

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token");
      });
      await waitFor(() => {
        expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
      });
    });

    it("[EP] does not render DropIn and does not crash when getToken API call fails", async () => {
      // Arrange
      axios.get.mockRejectedValueOnce(new Error("Network Error"));

      // Act
      renderCartPage();

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token");
      });
      expect(screen.queryByTestId("braintree-dropin")).not.toBeInTheDocument();
    });

    it("[EP] does not render DropIn when API returns success:false", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: false, token: null },
      });

      // Act
      renderCartPage();

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      expect(screen.queryByTestId("braintree-dropin")).not.toBeInTheDocument();
    });
  });

  // ---------------------------
  // handlePayment tests
  // ---------------------------
  describe("handlePayment", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useNavigate.mockReturnValue(mockNavigate);
      useAuth.mockReturnValue([mockAuth, jest.fn()]);
      useCart.mockReturnValue([mockCart, mockSetCart]);
      axios.get.mockResolvedValue({
        data: { success: true, token: "braintree-client-token" },
      });
    });

    it("[EP] completes payment, clears cart, and navigates to orders on success", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      // Act
      renderCartPage();
      fireEvent.click(await screen.findByText("Make Payment"));

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/braintree/payment",
          { nonce: "fake-nonce", cart: mockCart }
        );
      });
      await waitFor(() => expect(mockSetCart).toHaveBeenCalledWith([]));
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders"));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Payment Completed Successfully "));
      expect(localStorage.getItem("cart")).toBeNull();
    });

    it("[EP] shows loading state on button while payment is being processed", async () => {
      // Arrange
      axios.post.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 100))
      );

      // Act
      renderCartPage();
      fireEvent.click(await screen.findByText("Make Payment"));

      // Assert - loading text visible during processing
      expect(screen.getByText("Processing ....")).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByText("Processing ....")).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it("[EP] shows error toast and does not navigate when payment POST fails", async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(new Error("Payment Failed"));

      // Act
      renderCartPage();
      fireEvent.click(await screen.findByText("Make Payment"));

      // Assert
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Payment Failed. Please try again.");
      });
    });

    it("[EP] disables Make Payment button when user address is missing", async () => {
      // Arrange
      useAuth.mockReturnValue([
        { token: "fake-token", user: { name: "John", address: "" } },
        jest.fn(),
      ]);

      // Act
      renderCartPage();

      // Assert
      expect(await screen.findByText("Make Payment")).toBeDisabled();
    });
  });
});