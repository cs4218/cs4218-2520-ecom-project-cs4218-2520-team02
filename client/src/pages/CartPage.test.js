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
    </MemoryRouter>,
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

  return {
    __esModule: true,
    default: DropInMock, 
  };
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

  it("should render without crashing", () => {
    renderCartPage();

    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  it("should calculate total price correctly", () => {
    const cartItems = [
      { price: 10, description: "item1" },
      { price: 5, description: "item2" },
    ];
    useCart.mockReturnValue([cartItems, jest.fn()]);

    renderCartPage();

    const totalPrice = screen.getByText(/Total : \$15.00/i);
    expect(totalPrice).toBeInTheDocument();
  });

  it("should handle invalid price values in cart items", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const cartItems = [
      { price: 10, description: "item1" },
      { price: "invalid", description: "item2" },
    ];
    useCart.mockReturnValue([cartItems, jest.fn()]);

    renderCartPage();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid price at index 1:",
      "invalid",
    );
  });

  it("should handle invalid item structure in cart", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const cartItems = [
      { price: 10, description: "item1" },
      { invalidField: undefined, description: "item2" },
    ];
    useCart.mockReturnValue([cartItems, jest.fn()]);

    renderCartPage();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Cart item at index 1 is invalid:",
      { invalidField: undefined, description: "item2" },
    );
  });

  it("should remove item from cart correctly", () => {
    const cartItems = [
      { _id: "1", price: 10, description: "item1" },
      { _id: "2", price: 5, description: "item2" },
    ];

    const setCartMock = jest.fn();
    useCart.mockReturnValue([cartItems, setCartMock]);

    renderCartPage();

    const removeButtons = screen.getAllByText(/Remove/i);

    fireEvent.click(removeButtons[0]);

    expect(setCartMock).toHaveBeenCalledWith([
      { _id: "2", price: 5, description: "item2" },
    ]);
  });

  it("cart page should show user address if logged in", () => {
    // login user
    useAuth.mockReturnValue([
      {
        user: { name: "Test User", address: "123 Test St" },
        token: "test-token",
      },
      jest.fn(),
    ]);

    renderCartPage();

    expect(screen.getByText(/Current Address/i)).toBeInTheDocument();
    expect(screen.getByText(/123 Test St/i)).toBeInTheDocument();
  });

  it("cart page should prompt update if logged in but user does not have an address", () => {
    useAuth.mockReturnValue([
      { user: { name: "Test User" }, token: "test-token" },
      jest.fn(),
    ]);

    renderCartPage();

    fireEvent.click(screen.getAllByText(/Update Address/i)[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("should navigate to profile when logged in user with address clicks Update Address", () => {
    useAuth.mockReturnValue([
      { user: { name: "John", address: "123 Main St" }, token: "fake-token" },
      jest.fn(),
    ]);

    renderCartPage();

    fireEvent.click(screen.getByText(/Update Address/i));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("cart page should prompt login if not logged in and tries to checkout", () => {
    useAuth.mockReturnValue([{ user: null, token: null }, jest.fn()]);
    renderCartPage();
    fireEvent.click(screen.getByText(/Please Login to checkout/i));

    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
  });

  it("should show item count and login prompt when cart has items but user is not logged in", () => {
    useAuth.mockReturnValue([{ user: null, token: null }, jest.fn()]);
    useCart.mockReturnValue([mockCart, jest.fn()]);

    renderCartPage();

    expect(screen.getByText(/You have 2 items in your cart. Please login!/i)).toBeInTheDocument();
  });

  it("should show item count without login prompt when cart has items and user is logged in", () => {
    renderCartPage(); 

    expect(screen.getByText(/You have 2 items in your cart./i)).toBeInTheDocument();
    expect(screen.queryByText(/Please login!/i)).not.toBeInTheDocument();
  });

  it("should show empty cart message when cart is empty", () => {
    useCart.mockReturnValue([[], jest.fn()]);

    renderCartPage();

    expect(screen.getByText(/Your cart is empty./i)).toBeInTheDocument();
  });


  // ---------------------------
  // getToken tests
  // ---------------------------
  describe("getToken", () => {
    it("should fetch and set client token on mount when auth token exists", async () => {
      axios.get.mockResolvedValueOnce({
        data: { success: true, token: "braintree-client-token" },
      });

      renderCartPage();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/braintree/token",
        );
      });

      // DropIn should render once clientToken is set
      await waitFor(() => {
        expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
      });
    });

    it("should not crash if getToken API call fails", async () => {
      axios.get.mockRejectedValueOnce(new Error("Network Error"));

      renderCartPage();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/braintree/token",
        );
      });

      // DropIn should NOT render since clientToken was never set
      expect(screen.queryByTestId("braintree-dropin")).not.toBeInTheDocument();
    });

    it("should not set token if API returns success: false", async () => {
      axios.get.mockResolvedValueOnce({
        data: { success: false, token: null },
      });

      renderCartPage();

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

    it("should complete payment successfully", async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });
      renderCartPage();

      fireEvent.click(await screen.findByText("Make Payment"));

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

    it("should show loading state during payment processing", async () => {
      axios.post.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 100))
      );

      renderCartPage();
      fireEvent.click(await screen.findByText("Make Payment"));

      // Loading state appears
      expect(screen.getByText("Processing ....")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText("Processing ....")).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it("should handle payment failure gracefully", async () => {
      axios.post.mockRejectedValueOnce(new Error("Payment Failed"));
      renderCartPage();
      fireEvent.click(await screen.findByText("Make Payment"));
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Payment Failed. Please try again.");
      });
    });

    it("should disable Make Payment button when address is missing", async () => {
      useAuth.mockReturnValue([
        { token: "fake-token", user: { name: "John", address: "" } },
        jest.fn(),
      ]);
      renderCartPage();
      expect(await screen.findByText("Make Payment")).toBeDisabled();
    });
  });

});
