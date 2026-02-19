import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "@testing-library/jest-dom/extend-expect";
import HomePage from "../HomePage";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({ success: jest.fn() }));

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

const mockSetCart = jest.fn();
jest.mock("../../context/cart", () => ({
  useCart: () => [[], mockSetCart],
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

// =============== Tests ===============
describe("HomePage", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.resetAllMocks();
    toast.success = jest.fn();
    restoreConsole = silenceConsole();
    setupAxios();
  });

  afterEach(() => restoreConsole());

  describe("Smoke", () => {
    test("renders headings", async () => {
      renderHome();

      expect(await screen.findByText("Filter By Category")).toBeInTheDocument();
      expect(await screen.findByText("Filter By Price")).toBeInTheDocument();
      expect(await screen.findByText("All Products")).toBeInTheDocument();
    });

    test("mount triggers category fetch, product count, and first page list", async () => {
      renderHome();

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"),
      );

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-count"),
      );
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1",
        ),
      );
    });

    test("navigate -> add to cart workflow", async () => {
      renderHome();

      fireEvent.click((await screen.findAllByText("More Details"))[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/product/laptop");

      fireEvent.click((await screen.findAllByText("ADD TO CART"))[0]);
      expect(mockSetCart).toHaveBeenCalledTimes(1);
      expect(window.localStorage.setItem).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });
  });

  describe("Categories", () => {
    test("renders category checkboxes from API", async () => {
      renderHome();

      expect(await screen.findByLabelText("Electronics")).toBeInTheDocument();
      expect(await screen.findByLabelText("Clothing")).toBeInTheDocument();
      expect(await screen.findByLabelText("Books")).toBeInTheDocument();
    });

    test("handles zero categories", async () => {
      setupAxios({ categories: [] });
      renderHome();

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"),
      );
      expect(screen.queryByLabelText("Electronics")).not.toBeInTheDocument();
    });

    test("success=false does not render categories", async () => {
      setupAxios({ categorySuccess: false });
      renderHome();

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"),
      );
      expect(screen.queryByLabelText("Electronics")).not.toBeInTheDocument();
    });

    test("logs when category GET fails", async () => {
      setupAxios({
        overrides: {
          "/api/v1/category/get-category": () =>
            Promise.reject(new Error("Network error")),
        },
      });

      renderHome();

      await waitFor(() =>
        expect(console.log).toHaveBeenCalledWith(expect.any(Error)),
      );
    });
  });

  describe("Products and Pagination", () => {
    test("renders products from API", async () => {
      renderHome();

      expect(await screen.findByText("Laptop")).toBeInTheDocument();
      expect(await screen.findByText("NUS T-shirt")).toBeInTheDocument();
    });

    test("handles zero products", async () => {
      setupAxios({ products: [], total: 0 });
      renderHome();

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1",
        ),
      );
      expect(screen.queryByText("More Details")).not.toBeInTheDocument();
      expect(screen.queryByText("ADD TO CART")).not.toBeInTheDocument();
    });

    test("handles single product", async () => {
      setupAxios({ products: [mockProducts[0]], total: 1 });
      renderHome();

      expect(await screen.findByText("Laptop")).toBeInTheDocument();
      expect(screen.getAllByText("More Details")).toHaveLength(1);
    });

    test("logs when product list GET fails", async () => {
      setupAxios({
        overrides: {
          "/api/v1/product/product-list/1": () =>
            Promise.reject(new Error("Failed to fetch products")),
        },
      });

      renderHome();

      await waitFor(() =>
        expect(console.log).toHaveBeenCalledWith(expect.any(Error)),
      );
    });

    test("logs when product-count GET fails", async () => {
      setupAxios({
        overrides: {
          "/api/v1/product/product-count": () =>
            Promise.reject(new Error("count failed")),
        },
      });

      renderHome();

      await waitFor(() =>
        expect(console.log).toHaveBeenCalledWith(expect.any(Error)),
      );
    });

    test("logs and resets loading when loadMore GET fails", async () => {
      setupAxios({
        overrides: {
          "/api/v1/product/product-list/2": () =>
            Promise.reject(new Error("loadMore failed")),
        },
      });

      renderHome();

      expect(await screen.findByText("Laptop")).toBeInTheDocument();
      fireEvent.click(await screen.findByText(/Load more/i));

      await waitFor(() =>
        expect(console.log).toHaveBeenCalledWith(expect.any(Error)),
      );
    });

    test("shows Loading ... while loadMore request is in-flight", async () => {
      setupAxios({
        overrides: {
          "/api/v1/product/product-list/2": () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
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
                50,
              ),
            ),
        },
      });

      renderHome();

      expect(await screen.findByText("Laptop")).toBeInTheDocument();
      fireEvent.click(await screen.findByText(/Load more/i));

      expect(await screen.findByText("Loading ...")).toBeInTheDocument();
    });

    test("loadMore increments page (2 then 3) and appends new products", async () => {
      setupAxios({
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
          "/api/v1/product/product-list/3": () =>
            Promise.resolve({
              data: {
                products: [
                  {
                    _id: "p4",
                    name: "Mouse",
                    price: 12.99,
                    description: "A small mouse",
                    slug: "mouse",
                  },
                ],
              },
            }),
        },
      });

      renderHome();

      expect(await screen.findByText("Laptop")).toBeInTheDocument();

      fireEvent.click(await screen.findByText(/Load more/i));
      expect(await screen.findByText("Book")).toBeInTheDocument();

      fireEvent.click(await screen.findByText(/Load more/i));
      expect(await screen.findByText("Mouse")).toBeInTheDocument();
    });
  });

  describe("Load more Visibility (BVA)", () => {
    test("hides Load more when products.length = total", async () => {
      setupAxios({ total: 2, products: mockProducts });
      renderHome();

      expect(await screen.findByText("Laptop")).toBeInTheDocument();
      expect(screen.queryByText(/Load more/i)).not.toBeInTheDocument();
    });

    test("hides Load more when products.length > total", async () => {
      setupAxios({ total: 1, products: mockProducts });
      renderHome();

      expect(await screen.findByText("Laptop")).toBeInTheDocument();
      expect(screen.queryByText(/Load more/i)).not.toBeInTheDocument();
    });

    test("shows Load more when products.length < total", async () => {
      setupAxios({ total: 3, products: mockProducts });
      renderHome();

      expect(await screen.findByText("Laptop")).toBeInTheDocument();
      expect(await screen.findByText(/Load more/i)).toBeInTheDocument();
    });
  });

  describe("Filters", () => {
    test("category checkbox triggers filters POST and checkbox becomes checked", async () => {
      axios.post.mockResolvedValueOnce({
        data: { products: [mockProducts[0]] },
      });

      renderHome();

      const cat = await screen.findByLabelText("Electronics");
      expect(cat).not.toBeChecked();

      fireEvent.click(cat);

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          { checked: ["1"], radio: [] },
        ),
      );
      expect(await screen.findByLabelText("Electronics")).toBeChecked();
    });

    test("price radio triggers filters POST and radio becomes checked", async () => {
      axios.post.mockResolvedValueOnce({
        data: { products: [mockProducts[1]] },
      });

      renderHome();

      const price = await screen.findByLabelText("$0 to 19");
      expect(price).not.toBeChecked();

      fireEvent.click(price);

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          { checked: [], radio: [0, 19] },
        ),
      );
      expect(await screen.findByLabelText("$0 to 19")).toBeChecked();
    });

    test("combined filters (category then price) triggers two POSTs", async () => {
      axios.post.mockResolvedValue({ data: { products: [mockProducts[0]] } });

      renderHome();

      fireEvent.click(await screen.findByLabelText("Electronics"));
      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          { checked: ["1"], radio: [] },
        ),
      );

      fireEvent.click(await screen.findByLabelText("$0 to 19"));
      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          { checked: ["1"], radio: [0, 19] },
        ),
      );
    });

    test("filterProduct updates total so Load more disappears when filtered list equals total", async () => {
      setupAxios({ total: 10, products: mockProducts });
      axios.post.mockResolvedValueOnce({
        data: { products: [mockProducts[0]] },
      });

      renderHome();

      expect(await screen.findByText(/Load more/i)).toBeInTheDocument();

      fireEvent.click(await screen.findByLabelText("Electronics"));

      await waitFor(() =>
        expect(screen.queryByText(/Load more/i)).not.toBeInTheDocument(),
      );
    });

    test("unchecking last active category falls back to GET list/1", async () => {
      axios.post.mockResolvedValueOnce({
        data: { products: [mockProducts[0]] },
      });

      renderHome();

      fireEvent.click(await screen.findByLabelText("Electronics"));
      await waitFor(() => expect(axios.post).toHaveBeenCalled());

      axios.post.mockClear();
      axios.get.mockClear();

      fireEvent.click(await screen.findByLabelText("Electronics"));

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1",
        ),
      );
    });

    test("logs when filters POST fails", async () => {
      axios.post.mockRejectedValueOnce(new Error("Filter API failed"));

      renderHome();

      fireEvent.click(await screen.findByLabelText("Electronics"));

      await waitFor(() =>
        expect(console.log).toHaveBeenCalledWith(expect.any(Error)),
      );
    });
  });

  describe("Pairwise: Filter Combinations", () => {
    const cases = [
      {
        desc: "no filters",
        actions: [],
        expectedCalls: [],
      },
      {
        desc: "category only",
        actions: [{ label: "Electronics" }],
        expectedCalls: [
          ["/api/v1/product/product-filters", { checked: ["1"], radio: [] }],
        ],
      },
      {
        desc: "price only",
        actions: [{ label: "$0 to 19" }],
        expectedCalls: [
          ["/api/v1/product/product-filters", { checked: [], radio: [0, 19] }],
        ],
      },
      {
        desc: "both filters",
        actions: [{ label: "Electronics" }, { label: "$0 to 19" }],
        expectedCalls: [
          ["/api/v1/product/product-filters", { checked: ["1"], radio: [] }],
          [
            "/api/v1/product/product-filters",
            { checked: ["1"], radio: [0, 19] },
          ],
        ],
      },
    ];

    test.each(cases)(
      "filter combination: $desc",
      async ({ actions, expectedCalls }) => {
        axios.post.mockResolvedValue({ data: { products: [mockProducts[0]] } });

        renderHome();

        expect(await screen.findByText("Laptop")).toBeInTheDocument();

        for (const a of actions) {
          fireEvent.click(await screen.findByLabelText(a.label));
        }

        await waitFor(() =>
          expect(axios.post).toHaveBeenCalledTimes(expectedCalls.length),
        );
        expect(axios.post.mock.calls).toEqual(
          expectedCalls.map(([url, body]) => [url, body]),
        );
      },
    );
  });

  describe("Reset Filters", () => {
    test("RESET FILTERS clears checked + radio, triggers product list re-fetch", async () => {
      axios.post.mockResolvedValue({ data: { products: [mockProducts[0]] } });

      renderHome();

      fireEvent.click(await screen.findByLabelText("Electronics"));
      fireEvent.click(await screen.findByLabelText("$0 to 19"));

      expect(await screen.findByLabelText("Electronics")).toBeChecked();
      expect(await screen.findByLabelText("$0 to 19")).toBeChecked();

      axios.get.mockClear();
      axios.post.mockClear();

      fireEvent.click(await screen.findByText("RESET FILTERS"));

      await waitFor(() =>
        expect(screen.getByLabelText("Electronics")).not.toBeChecked(),
      );
      await waitFor(() =>
        expect(screen.getByLabelText("$0 to 19")).not.toBeChecked(),
      );

      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1",
        ),
      );

      expect(await screen.findByText("Laptop")).toBeInTheDocument();
    });
  });
});
