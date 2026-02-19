import CartPage from "./CartPage";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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

const renderCartPage = () =>
  render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>,
  );

describe("CartPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue([{ user: null, token: null }, jest.fn()]);
    useCart.mockReturnValue([[], jest.fn()]);
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

});
