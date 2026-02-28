/* eslint-disable testing-library/no-wait-for-multiple-assertions */
// Censon Lee Lemuel John Alejo, A0273436B
import React from "react";
import { render, fireEvent, waitFor, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

import HomePage from "../HomePage";
import { AuthProvider } from "../../context/auth";
import { SearchProvider } from "../../context/search";
import { CartProvider, useCart } from "../../context/cart";

// =============== Mocks ===============
jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
  Toaster: () => null,
}));

// HomePage uses Prices module; keep it deterministic for test environment.
jest.mock("../../components/Prices", () => ({
  Prices: [
    { _id: "p0", name: "$0 to 19", array: [0, 19] },
    { _id: "p1", name: "$20 to 49", array: [20, 49] },
  ],
}));

// Real Layout includes Header which depends on these.
jest.mock("../../hooks/useCategory", () => jest.fn(() => []));
jest.mock("../../components/Form/SearchInput", () => () => (
  <div data-testid="search-input" />
));

// =============== Test environment shims ===============
Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener() {},
      removeListener() {},
    };
  };

const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

// =============== Mock data ===============
const mockCategories = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Clothing" },
];

const p1 = {
  _id: "p1",
  name: "Laptop",
  price: 999.99,
  description: "A powerful laptop",
  slug: "laptop",
};

const p2 = {
  _id: "p2",
  name: "NUS T-shirt",
  price: 19.99,
  description: "Plain NUS T-shirt for sale",
  slug: "nus t-shirt",
};

const p3 = {
  _id: "p3",
  name: "Book",
  price: 9.99,
  description: "A short book",
  slug: "book",
};

// =============== Probes ===============
const CartProbe = () => {
  const [cart] = useCart();
  return <div data-testid="cart-len">{cart.length}</div>;
};

// =============== Helpers ===============
const renderHomeRoute = () =>
  render(
    <AuthProvider>
      <SearchProvider>
        <CartProvider>
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <HomePage />
                    <CartProbe />
                  </>
                }
              />
              <Route path="/product/:slug" element={<div>ProductDetailsPage</div>} />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </SearchProvider>
    </AuthProvider>,
  );

const setupAxios = ({
  categories = mockCategories,
  page1Products = [p1, p2],
  page2Products = [p3],
  total = 3,
  productFiltersImpl = null,
} = {}) => {
  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({ data: { success: true, categories } });
    }
    if (url === "/api/v1/product/product-count") {
      return Promise.resolve({ data: { total } });
    }
    if (url === "/api/v1/product/product-list/1") {
      return Promise.resolve({ data: { products: page1Products } });
    }
    if (url === "/api/v1/product/product-list/2") {
      return Promise.resolve({ data: { products: page2Products } });
    }
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });

  if (productFiltersImpl) {
    axios.post.mockImplementation(productFiltersImpl);
  } else {
    axios.post.mockResolvedValue({ data: { products: page1Products } });
  }
};

const waitForPage1 = async () => {
  await screen.findByText("All Products");
  await screen.findByText("Laptop");
  await screen.findByText("NUS T-shirt");
};

// =============== Tests ===============
describe("HomePage integration", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
    window.localStorage.getItem.mockReturnValue(null);
    setupAxios();
  });

  afterEach(() => {
    restoreConsole();
    cleanup();
  });

  describe("Initial load (EP)", () => {
    it("should fetch categories, products, and count, then render products", async () => {
      // Arrange & Act
      renderHomeRoute();

      // Assert
      await waitForPage1();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-count");
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
      });
    });
  });

  describe("Navigation (EP)", () => {
    it("More Details navigates to /product/:slug and renders ProductDetailsPage", async () => {
      // Arrange
      renderHomeRoute();
      await waitForPage1();

      // Act
      fireEvent.click((await screen.findAllByText("More Details"))[0]);

      // Assert
      expect(await screen.findByText("ProductDetailsPage")).toBeInTheDocument();
    });
  });

  describe("Pagination boundaries (BVA)", () => {
    it("hides Load more when products.length meets total (On Boundary total)", async () => {
      // Arrange
      setupAxios({ total: 2, page1Products: [p1, p2], page2Products: [] });

      // Act
      renderHomeRoute();

      // Assert
      await waitForPage1();
      expect(screen.queryByText(/Load more/i)).not.toBeInTheDocument();
    });

    it("after Load more reaches total, Load more disappears (On Boundary total after page2)", async () => {
      // Arrange
      setupAxios({ total: 3, page1Products: [p1, p2], page2Products: [p3] });

      // Act
      renderHomeRoute();
      await waitForPage1();
      fireEvent.click(await screen.findByText(/Load more/i));

      // Assert
      expect(await screen.findByText("Book")).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.queryByText(/Load more/i)).not.toBeInTheDocument(),
      );
    });
  });

  describe("Cart provider seam (EP)", () => {
    it("ADD TO CART persists item to localStorage and updates CartProvider state", async () => {
      // Arrange
      renderHomeRoute();
      await waitForPage1();
      expect(screen.getByTestId("cart-len")).toHaveTextContent("0");

      // Act
      fireEvent.click((await screen.findAllByText("ADD TO CART"))[0]);

      // Assert
      await waitFor(() => expect(window.localStorage.setItem).toHaveBeenCalledTimes(1));
      expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
      await waitFor(() => expect(screen.getByTestId("cart-len")).toHaveTextContent("1"));
    });
  });

  describe("Filters seam (EP)", () => {
    it("category + price combined posts payload and updates product list in UI", async () => {
      // Arrange
      setupAxios({
        total: 3,
        page1Products: [p1, p2],
        productFiltersImpl: (url, payload) => {
          if (url !== "/api/v1/product/product-filters") {
            return Promise.reject(new Error(`Unhandled POST ${url}`));
          }
          // Return distinct results so the final combined selection produces a visible change.
          if (payload?.checked?.length === 1 && Array.isArray(payload?.radio) && payload.radio.length === 0) {
            return Promise.resolve({ data: { products: [p1] } }); // category only
          }
          if (payload?.checked?.length === 1 && Array.isArray(payload?.radio) && payload.radio.length === 2) {
            return Promise.resolve({ data: { products: [p2] } }); // category + price
          }
          return Promise.resolve({ data: { products: [p1, p2] } });
        },
      });

      // Act
      renderHomeRoute();
      await waitForPage1();

      fireEvent.click(await screen.findByLabelText("Electronics"));
      fireEvent.click(await screen.findByLabelText("$0 to 19"));

      // Assert
      await waitFor(() =>
        expect(axios.post).toHaveBeenLastCalledWith(
          "/api/v1/product/product-filters",
          { checked: ["1"], radio: [0, 19] },
        ),
      );

      await waitFor(() => {
        expect(screen.getByText("NUS T-shirt")).toBeInTheDocument();
        expect(screen.queryByText("Laptop")).not.toBeInTheDocument();
      });
    });
  });

  describe("Reset Filters (EP)", () => {
    it("RESET FILTERS clears selections and restores default product list (page 1)", async () => {
      // Arrange
      setupAxios({
        total: 3,
        page1Products: [p1, p2],
        page2Products: [p3],
        productFiltersImpl: (url) =>
          Promise.resolve({ data: { products: [p2] } }), // filtered list
      });

      // Act
      renderHomeRoute();
      await waitForPage1();

      fireEvent.click(await screen.findByLabelText("Electronics"));
      await waitFor(() => expect(screen.queryByText("Laptop")).not.toBeInTheDocument());

      fireEvent.click(await screen.findByText("RESET FILTERS"));

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText("Electronics")).not.toBeChecked();
        expect(screen.getByLabelText("$0 to 19")).not.toBeChecked();
      });

      // Restores default list (page 1 products back)
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getByText("NUS T-shirt")).toBeInTheDocument();
      });
    });
  });

  describe("Robustness (EP)", () => {
    it("filters POST fails: logs error and UI remains stable", async () => {
      // Arrange
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      axios.post.mockRejectedValueOnce(new Error("Filter API failed"));

      renderHomeRoute();
      await waitForPage1();

      // Act
      fireEvent.click(await screen.findByLabelText("Electronics"));

      // Assert
      await waitFor(() => expect(logSpy).toHaveBeenCalledWith(expect.any(Error)));
      expect(screen.getByText("Laptop")).toBeInTheDocument();

      logSpy.mockRestore();
    });
  });
});