import React from "react";
import { render, screen, act } from "@testing-library/react";
import { CartProvider, useCart } from "./cart";
import "@testing-library/jest-dom";

const CartConsumer = () => {
  const [cart] = useCart();
  return <div data-testid="cart">{JSON.stringify(cart)}</div>;
};

const renderWithCartProvider = () => {
  return render(
    <CartProvider>
      <CartConsumer />
    </CartProvider>
  );
};

describe("CartContext", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should initialize cart as empty array when localStorage is empty", () => {
    renderWithCartProvider();
    expect(screen.getByTestId("cart").textContent).toBe("[]");
  });

  it("should load cart from localStorage on mount", () => {
    const storedCart = [
      { _id: "1", name: "Product A", price: 100 },
      { _id: "2", name: "Product B", price: 200 },
    ];
    localStorage.setItem("cart", JSON.stringify(storedCart));

    renderWithCartProvider();

    expect(screen.getByTestId("cart").textContent).toBe(JSON.stringify(storedCart));
  });

  it("should provide setCart to update the cart", () => {
    const newItem = { _id: "3", name: "Product C", price: 300 };

    const CartUpdater = () => {
      const [cart, setCart] = useCart();
      return (
        <>
          <div data-testid="cart">{JSON.stringify(cart)}</div>
          <button onClick={() => setCart([newItem])}>Update Cart</button>
        </>
      );
    };

    render(
      <CartProvider>
        <CartUpdater />
      </CartProvider>
    );

    act(() => {
      screen.getByText("Update Cart").click();
    });

    expect(screen.getByTestId("cart").textContent).toBe(JSON.stringify([newItem]));
  });

  it("should not load cart if localStorage has no cart key", () => {
    localStorage.setItem("someOtherKey", "someValue");

    renderWithCartProvider();

    expect(screen.getByTestId("cart").textContent).toBe("[]");
  });

});