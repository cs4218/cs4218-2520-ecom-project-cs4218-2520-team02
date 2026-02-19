import CartPage from "./CartPage";
import axios from "axios";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";

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

jest.mock("braintree-web-drop-in-react", () => ({
  __esModule: true,
  default: ({ onInstance }) => {
    // Immediately call onInstance with a fake instance
    onInstance({
      requestPaymentMethod: jest
        .fn()
        .mockResolvedValue({ nonce: "fake-nonce" }),
    });
    return <div data-testid="braintree-dropin" />;
  },
}));

describe("CartPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockCart, jest.fn()]);
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
    // login user
    useAuth.mockReturnValue([
      { user: { name: "Test User" }, token: "test-token" },
      jest.fn(),
    ]);

    renderCartPage();

    expect(screen.getByText(/Update Address/i)).toBeInTheDocument();
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
});
