// Censon Lee Lemuel John Alejo, A0273436B
import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  screen,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "@testing-library/jest-dom/extend-expect";
import HomePage from "../HomePage";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../components/Layout", () => {
  return function Layout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../components/Prices", () => ({
  Prices: [
    { _id: "p0", name: "$0 to 19", array: [0, 19] },
    { _id: "p1", name: "$20 to 49", array: [20, 49] },
  ],
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

let mockCartState = [];
const mockSetCart = jest.fn();
jest.mock("../../context/cart", () => ({
  useCart: () => [mockCartState, mockSetCart],
}));

jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span>↻</span>,
}));

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
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

// =============== Mock data ===============
const mockCategories = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Clothing" },
  { _id: "3", name: "Books" },
];

const mockProducts = [
  {
    _id: "p1",
    name: "Laptop",
    price: 999.99,
    description: "A powerful laptop",
    slug: "laptop",
  },
  {
    _id: "p2",
    name: "NUS T-shirt",
    price: 19.99,
    description: "Plain NUS T-shirt for sale",
    slug: "nus t-shirt",
  },
];

const product3 = {
  _id: "p3",
  name: "Book",
  price: 9.99,
  description: "A short book",
  slug: "book",
};

// =============== Helpers ===============
const renderHome = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

const setupAxios = ({
  total = 10,
  products = mockProducts,
  categories = mockCategories,
  categorySuccess = true,
  overrides = {},
} = {}) => {
  axios.get.mockImplementation((url) => {
    if (overrides[url] !== undefined) return overrides[url]();
    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({
        data: { success: categorySuccess, categories },
      });
    }
    if (url === "/api/v1/product/product-count") {
      return Promise.resolve({ data: { total } });
    }
    if (url.startsWith("/api/v1/product/product-list/")) {
      return Promise.resolve({ data: { products } });
    }
    return Promise.reject(new Error("Not found"));
  });

  axios.post.mockResolvedValue({ data: { products } });
};

const waitForProductsToRender = async () => {
  await screen.findByText("All Products");
  await screen.findByText("Laptop");
};

// =============== Tests ===============
describe("HomePage", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.resetAllMocks();
    restoreConsole = silenceConsole();
    mockCartState = [];
    setupAxios();
  });

  afterEach(() => {
    restoreConsole();
    cleanup();
  });

  describe("Categories (EP)", () => {
    test("renders category checkboxes from API", async () => {
      // Arrange & Act
      renderHome();

      // Assert
      expect(await screen.findByLabelText("Electronics")).toBeInTheDocument();
      expect(screen.getByLabelText("Clothing")).toBeInTheDocument();
      expect(screen.getByLabelText("Books")).toBeInTheDocument();
    });

    test("renders no category checkboxes when success is false", async () => {
      // Arrange
      setupAxios({ categorySuccess: false });

      // Act
      renderHome();

      // Assert
      await screen.findByText("All Products");
      expect(screen.queryByLabelText("Electronics")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Clothing")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Books")).not.toBeInTheDocument();
    });

    test("logs when category GET fails", async () => {
      // Arrange
      setupAxios({
        overrides: {
          "/api/v1/category/get-category": () =>
            Promise.reject(new Error("Network error")),
        },
      });

      // Act
      renderHome();

      // Assert
      await waitFor(() =>
        expect(console.log).toHaveBeenCalledWith(expect.any(Error)),
      );
    });
  });

  describe("Products (BVA)", () => {
    test("renders no product actions when there are 0 products (Below Boundary 0)", async () => {
      // Arrange
      setupAxios({ products: [], total: 0 });

      // Act
      renderHome();

      // Assert
      await screen.findByText("All Products");
      expect(screen.queryByText("More Details")).not.toBeInTheDocument();
      expect(screen.queryByText("ADD TO CART")).not.toBeInTheDocument();
    });

    test("renders 1 product correctly when there is 1 product (On Boundary 1)", async () => {
      // Arrange
      setupAxios({ products: [mockProducts[0]], total: 1 });

      // Act
      renderHome();

      // Assert
      expect(await screen.findByText("Laptop")).toBeInTheDocument();
      expect(screen.getAllByText("More Details")).toHaveLength(1);
      expect(screen.getAllByText("ADD TO CART")).toHaveLength(1);
    });
  });

  describe("Initial load errors (EP)", () => {
    test("logs when initial product-list GET fails", async () => {
      // Arrange
      setupAxios({
        overrides: {
          "/api/v1/product/product-list/1": () =>
            Promise.reject(new Error("product-list failed")),
        },
      });

      // Act
      renderHome();

      // Assert
      await waitFor(() =>
        expect(console.log).toHaveBeenCalledWith(expect.any(Error)),
      );
    });

    test("logs when product-count GET fails", async () => {
      // Arrange
      setupAxios({
        overrides: {
          "/api/v1/product/product-count": () =>
            Promise.reject(new Error("product-count failed")),
        },
      });

      // Act
      renderHome();

      // Assert
      await waitFor(() =>
        expect(console.log).toHaveBeenCalledWith(expect.any(Error)),
      );
    });
  });

  describe("Pagination and Load More (EP)", () => {
    test("shows loading text while Load more is in progress", async () => {
      // Arrange
      let resolveLoadMore;
      setupAxios({
        total: 3,
        products: mockProducts,
        overrides: {
          "/api/v1/product/product-list/2": () =>
            new Promise((resolve) => {
              resolveLoadMore = resolve;
            }),
        },
      });

      // Act
      renderHome();
      await waitForProductsToRender();
      fireEvent.click(await screen.findByText(/Load more/i));

      // Assert — button should show loading text mid-fetch
      expect(await screen.findByText("Loading ...")).toBeInTheDocument();

      // Resolve and wait for all state updates (setLoading, setProducts, setPage) to settle
      resolveLoadMore({ data: { products: [] } });
      await waitFor(() =>
        expect(screen.queryByText("Loading ...")).not.toBeInTheDocument(),
      );
    });

    test("Load more appends new products and keeps existing products", async () => {
      // Arrange
      setupAxios({
        total: 3,
        products: mockProducts,
        overrides: {
          "/api/v1/product/product-list/2": () =>
            Promise.resolve({ data: { products: [product3] } }),
        },
      });

      // Act
      renderHome();
      await waitForProductsToRender();
      fireEvent.click(await screen.findByText(/Load more/i));

      // Assert
      expect(await screen.findByText("Book")).toBeInTheDocument();
      expect(screen.getByText("Laptop")).toBeInTheDocument();
    });

    test("logs when Load more GET fails", async () => {
      // Arrange
      setupAxios({
        total: 3,
        products: mockProducts,
        overrides: {
          "/api/v1/product/product-list/2": () =>
            Promise.reject(new Error("loadMore failed")),
        },
      });

      // Act
      renderHome();
      await waitForProductsToRender();
      fireEvent.click(await screen.findByText(/Load more/i));

      // Assert
      await waitFor(() =>
        expect(console.log).toHaveBeenCalledWith(expect.any(Error)),
      );
    });
  });

  describe("Load more Visibility (BVA)", () => {
    test("shows Load more when products.length is below total (Below Boundary total)", async () => {
      // Arrange
      setupAxios({ total: 3, products: mockProducts });

      // Act
      renderHome();

      // Assert
      await waitForProductsToRender();
      expect(await screen.findByText(/Load more/i)).toBeInTheDocument();
    });

    test("hides Load more when products.length meets or exceeds total (On or Above Boundary total)", async () => {
      // Arrange
      setupAxios({ total: 2, products: mockProducts });

      // Act
      renderHome();

      // Assert
      await waitForProductsToRender();
      expect(screen.queryByText(/Load more/i)).not.toBeInTheDocument();
    });
  });

  describe("Filters (EP)", () => {
    test("category filter posts payload and updates product list in UI", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: { products: [mockProducts[0]] },
      });

      // Act
      renderHome();
      await waitForProductsToRender();
      fireEvent.click(await screen.findByLabelText("Electronics"));

      // Assert
      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          { checked: ["1"], radio: [] },
        ),
      );
      // Wait for filtered state to settle — NUS T-shirt should be gone
      await waitFor(() =>
        expect(screen.queryByText("NUS T-shirt")).not.toBeInTheDocument(),
      );
      expect(screen.getByText("Laptop")).toBeInTheDocument();
    });

    test("price filter posts payload and updates product list in UI", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: { products: [mockProducts[1]] },
      });

      // Act
      renderHome();
      await waitForProductsToRender();
      fireEvent.click(await screen.findByLabelText("$0 to 19"));

      // Assert
      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          { checked: [], radio: [0, 19] },
        ),
      );
      
      await waitFor(() =>
        expect(screen.queryByText("Laptop")).not.toBeInTheDocument(),
      );
      expect(screen.getByText("NUS T-shirt")).toBeInTheDocument();
    });

    test("unchecking the last active category falls back to refetching product list page 1", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: { products: [mockProducts[0]] },
      });

      // Act
      renderHome();
      await waitForProductsToRender();

      fireEvent.click(await screen.findByLabelText("Electronics"));
      await waitFor(() => expect(axios.post).toHaveBeenCalled());

      axios.post.mockClear();
      axios.get.mockClear();

      fireEvent.click(await screen.findByLabelText("Electronics"));

      // Assert
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1",
        ),
      );
    });

    test("logs when filters POST fails", async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(new Error("Filter API failed"));

      // Act
      renderHome();
      await waitForProductsToRender();
      fireEvent.click(await screen.findByLabelText("Electronics"));

      // Assert
      await waitFor(() =>
        expect(console.log).toHaveBeenCalledWith(expect.any(Error)),
      );
    });
  });

  describe("Reset Filters (EP)", () => {
    test("RESET FILTERS clears selections and refetches product list page 1", async () => {
      // Arrange
      axios.post.mockResolvedValue({ data: { products: [mockProducts[0]] } });

      // Act
      renderHome();
      await waitForProductsToRender();

      fireEvent.click(await screen.findByLabelText("Electronics"));
      fireEvent.click(await screen.findByLabelText("$0 to 19"));

      axios.get.mockClear();
      fireEvent.click(await screen.findByText("RESET FILTERS"));

      // Assert
      await waitFor(() =>
        expect(screen.getByLabelText("Electronics")).not.toBeChecked(),
      );
      expect(screen.getByLabelText("$0 to 19")).not.toBeChecked();

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1",
        ),
      );
    });

    test("RESET FILTERS after loadMore resets page back to 1", async () => {
      // Arrange
      setupAxios({
        total: 3,
        products: mockProducts,
        overrides: {
          "/api/v1/product/product-list/2": () =>
            Promise.resolve({
              data: {
                products: [
                  {
                    _id: "p3",
                    name: "Book",
                    price: 9.99,
                    description: "A short book",
                    slug: "book",
                  },
                ],
              },
            }),
        },
      });

      // Act
      renderHome();
      await waitForProductsToRender();
      fireEvent.click(await screen.findByText(/Load more/i));
      expect(await screen.findByText("Book")).toBeInTheDocument();

      axios.get.mockClear();
      fireEvent.click(await screen.findByText("RESET FILTERS"));

      // Assert
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1",
        ),
      );
      expect(axios.get).not.toHaveBeenCalledWith(
        "/api/v1/product/product-list/2",
      );
    });
  });

  describe("Navigation and Cart (EP)", () => {
    test("More Details navigates to product details route", async () => {
      // Arrange & Act
      renderHome();
      await waitForProductsToRender();
      fireEvent.click((await screen.findAllByText("More Details"))[0]);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("/product/laptop");
    });

    test("ADD TO CART appends item to existing cart and persists to localStorage", async () => {
      // Arrange
      mockCartState = [{ _id: "existing" }];

      // Act
      renderHome();
      await waitForProductsToRender();
      fireEvent.click((await screen.findAllByText("ADD TO CART"))[0]);

      // Assert
      await waitFor(() => expect(mockSetCart).toHaveBeenCalledTimes(1));
      const nextCart = mockSetCart.mock.calls[0][0];
      expect(Array.isArray(nextCart)).toBe(true);
      expect(nextCart).toHaveLength(2);

      expect(window.localStorage.setItem).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });
  });
});