// Song Jia Hui A0259494L
import React from "react";
import { render, screen, act, renderHook } from "@testing-library/react";
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

  it("[EP] renders without crashing when localStorage cart value is malformed JSON", () => {
    // Arrange
    localStorage.setItem("cart", "not-valid-json");

    // Act & Assert 
    expect(() => renderWithCartProvider()).not.toThrow();
  });

  it("[EP] should allow duplicate items in the cart", () => {
    // Arrange
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    const duplicateItem = { _id: "1", name: "Product 1", price: 100 };

    // Act
    act(() => {
      const [, setCart] = result.current;
      // Add the same item twice
      setCart([duplicateItem, duplicateItem]);
    });

    // Assert
    const [cart] = result.current;
    expect(cart.length).toBe(2);
    expect(cart[0]).toEqual(duplicateItem);
    expect(cart[1]).toEqual(duplicateItem);
  });

  // ========================================
  // BVA: Cart Size Boundaries
  // ========================================
  describe("[BVA] Cart Size Boundaries", () => {
    it("handles empty cart (0 items)", () => {
      // Arrange - beforeEach ensures cart is empty

      // Act
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const [cart] = result.current;

      // Assert
      expect(cart).toEqual([]);
      expect(cart.length).toBe(0);
    });

    it("handles single item cart (1 item)", () => {
      // Arrange
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const product = { _id: "1", name: "Product 1", price: 100 };

      // Act
      act(() => {
        const [, setCart] = result.current;
        setCart([product]);
      });
      const [cart] = result.current;

      // Assert
      expect(cart).toEqual([product]);
      expect(cart.length).toBe(1);
    });

    it("handles two items cart (2 items)", () => {
      // Arrange
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const product1 = { _id: "1", name: "Product 1", price: 100 };
      const product2 = { _id: "2", name: "Product 2", price: 200 };

      // Act
      act(() => {
        const [, setCart] = result.current;
        setCart([product1, product2]);
      });
      const [cart] = result.current;

      // Assert
      expect(cart).toEqual([product1, product2]);
      expect(cart.length).toBe(2);
    });

    it("[EP] handles large cart (100 items)", () => {
      // Arrange
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const manyProducts = Array.from({ length: 100 }, (_, i) => ({
        _id: `${i}`,
        name: `Product ${i}`,
        price: (i + 1) * 10,
      }));

      // Act
      act(() => {
        const [, setCart] = result.current;
        setCart(manyProducts);
      });
      const [cart] = result.current;

      // Assert
      expect(cart).toEqual(manyProducts);
      expect(cart.length).toBe(100);
    });
  });

  describe("[BVA] Item Addition/Removal Boundaries", () => {
    it("adds first item to empty cart", () => {
      // Arrange - beforeEach ensures cart is empty

      // Act
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const product = { _id: "1", name: "Product 1", price: 100 };
      act(() => {
        const [cart, setCart] = result.current;
        setCart([...cart, product]);
      });
      const [cart] = result.current;

      // Assert
      expect(cart).toEqual([product]);
      expect(cart.length).toBe(1);
    });

    it("removes last item from single-item cart", () => {
      // Arrange
      const mockCart = [{ _id: "1", name: "Product 1", price: 100 }];
      localStorage.setItem("cart", JSON.stringify(mockCart));
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

      // Act
      act(() => {
        const [, setCart] = result.current;
        setCart([]);
      });
      const [cart] = result.current;

      // Assert
      expect(cart.length).toBe(0);
    });

    it("removes one item from two-item cart", () => {
      // Arrange
      const mockCart = [
        { _id: "1", name: "Product 1", price: 100 },
        { _id: "2", name: "Product 2", price: 200 },
      ];
      localStorage.setItem("cart", JSON.stringify(mockCart));
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

      // Act
      act(() => {
        const [cart, setCart] = result.current;
        setCart(cart.filter((item) => item._id !== "1"));
      });
      const [cart] = result.current;

      // Assert
      expect(cart.length).toBe(1);
      expect(cart[0]._id).toBe("2");
    });
  });

  describe("[BVA] Price Boundaries", () => {
    it("handles zero price (minimum)", () => {
      // Arrange
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const product = { _id: "1", name: "Free Item", price: 0 };

      // Act
      act(() => {
        const [, setCart] = result.current;
        setCart([product]);
      });
      const [cart] = result.current;

      // Assert
      expect(cart[0].price).toBe(0);
    });

    it("handles very high price (maximum)", () => {
      // Arrange
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const product = { _id: "1", name: "Expensive Item", price: 999999.99 };

      // Act
      act(() => {
        const [, setCart] = result.current;
        setCart([product]);
      });
      const [cart] = result.current;

      // Assert
      expect(cart[0].price).toBe(999999.99);
    });
  });

  // ========================================
  // Pairwise: Cart State × Operation Combinations
  // ========================================
  describe("[Pairwise] Cart State x Operation Combinations", () => {
    const testCases = [
      {
        desc: "empty cart + add operation",
        initialCart: [],
        operation: (result) => {
          // Act
          act(() => {
            const [, setCart] = result.current;
            setCart([{ _id: "1", name: "Product", price: 100 }]);
          });
        },
        expectedLength: 1,
      },
      {
        desc: "empty cart + remove operation",
        initialCart: [],
        operation: (result) => {
          // Act
          act(() => {
            const [cart, setCart] = result.current;
            setCart(cart.filter((item) => item._id !== "999"));
          });
        },
        expectedLength: 0,
      },
      {
        desc: "single item cart + add operation",
        initialCart: [{ _id: "1", name: "Product 1", price: 100 }],
        operation: (result) => {
          // Act
          act(() => {
            const [cart, setCart] = result.current;
            setCart([...cart, { _id: "2", name: "Product 2", price: 200 }]);
          });
        },
        expectedLength: 2,
      },
      {
        desc: "single item cart + remove operation",
        initialCart: [{ _id: "1", name: "Product 1", price: 100 }],
        operation: (result) => {
          // Act
          act(() => {
            const [cart, setCart] = result.current;
            setCart(cart.filter((item) => item._id !== "1"));
          });
        },
        expectedLength: 0,
      },
      {
        desc: "multiple items cart + add operation",
        initialCart: [
          { _id: "1", name: "Product 1", price: 100 },
          { _id: "2", name: "Product 2", price: 200 },
        ],
        operation: (result) => {
          // Act
          act(() => {
            const [cart, setCart] = result.current;
            setCart([...cart, { _id: "3", name: "Product 3", price: 300 }]);
          });
        },
        expectedLength: 3,
      },
      {
        desc: "multiple items cart + clear operation",
        initialCart: [
          { _id: "1", name: "Product 1", price: 100 },
          { _id: "2", name: "Product 2", price: 200 },
        ],
        operation: (result) => {
          // Act
          act(() => {
            const [, setCart] = result.current;
            setCart([]);
          });
        },
        expectedLength: 0,
      },
    ];

    testCases.forEach(({ desc, initialCart, operation, expectedLength }) => {
      it(`handles ${desc}`, () => {
        // Arrange
        if (initialCart.length > 0) {
          localStorage.setItem("cart", JSON.stringify(initialCart));
        }

        const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

        // Act
        operation(result);

        // Assert
        const [cart] = result.current;
        expect(cart.length).toBe(expectedLength);
      });
    });
  });
});
