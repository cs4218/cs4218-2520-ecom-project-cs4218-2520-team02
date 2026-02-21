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

  it("[EP] initialises cart as empty array when localStorage has no cart key", () => {
    // Arrange - beforeEach clears localStorage

    // Act
    renderWithCartProvider();

    // Assert
    expect(screen.getByTestId("cart").textContent).toBe("[]");
  });

  it("[EP] loads cart from localStorage on mount when cart key is present", () => {
    // Arrange
    const storedCart = [
      { _id: "1", name: "Product A", price: 100 },
      { _id: "2", name: "Product B", price: 200 },
    ];
    localStorage.setItem("cart", JSON.stringify(storedCart));

    // Act
    renderWithCartProvider();

    // Assert
    expect(screen.getByTestId("cart").textContent).toBe(JSON.stringify(storedCart));
  });

  it("[EP] provides setCart to consumers and updates cart state correctly", () => {
    // Arrange
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

    // Act
    act(() => {
      screen.getByText("Update Cart").click();
    });

    // Assert
    expect(screen.getByTestId("cart").textContent).toBe(JSON.stringify([newItem]));
  });

  it("[EP] ignores unrelated localStorage keys and initialises cart as empty array", () => {
    // Arrange
    localStorage.setItem("someOtherKey", "someValue");

    // Act
    renderWithCartProvider();

    // Assert
    expect(screen.getByTestId("cart").textContent).toBe("[]");
  });

  it("[BVA] loads and renders a cart with exactly one item from localStorage", () => {
    // Arrange
    const singleItemCart = [{ _id: "1", name: "Product A", price: 100 }];
    localStorage.setItem("cart", JSON.stringify(singleItemCart));

    // Act
    renderWithCartProvider();

    // Assert
    expect(screen.getByTestId("cart").textContent).toBe(JSON.stringify(singleItemCart));
  });

  it("[EP] renders without crashing when localStorage cart value is malformed JSON", () => {
    // Arrange
    localStorage.setItem("cart", "not-valid-json");

    // Act & Assert 
    expect(() => renderWithCartProvider()).not.toThrow();
  });
});