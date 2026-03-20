// Yap Zhao Yi, A0277540B
import React from "react";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, MemoryRouter } from "react-router-dom";
import axios from "axios";
import ProductDetails from "./ProductDetails";
import { AuthProvider } from "../context/auth";
import { CartProvider } from "../context/cart";

// Mocks
jest.mock("axios");

jest.mock("./../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

const AppProviders = ({ children, initialRoute = "/product/producta" }) => (
  <MemoryRouter initialEntries={[initialRoute]}>
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  </MemoryRouter>
);

const renderProductDetails = (route = "/product/producta") =>
  render(
    <AppProviders initialRoute={route}>
      <Routes>
        <Route path="/product/:slug" element={<ProductDetails />} />
      </Routes>
    </AppProviders>
  );

const createUser = () =>
  typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

const mockProduct = {
  _id: "product1",
  name: "ProductA",
  slug: "producta",
  description: "Product A description",
  price: 1.00,
  category: { _id: "category1", name: "CategoryA" },
};

const mockRelatedProducts = [
  {
    _id: "product2",
    name: "ProductB",
    slug: "productb",
    description: "Product B description",
    price: 2.00,
    category: { _id: "category1", name: "CategoryA" },
  },
  {
    _id: "product3",
    name: "ProductC",
    slug: "ProductC",
    description: "Product C description",
    price: 3.00,
    category: { _id: "category1", name: "CategoryA" },
  },
];

describe("ProductDetails Page Integration Test", () => {
  
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Suppress console log
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  
  });

  afterEach(() => {
    // Restore console log to original behaviour
    logSpy.mockRestore()
  });

  describe("Rendering Validation", () => {
    it("should render products and related products fetched", async () => {
      
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product/producta")) {
          return Promise.resolve({
            data: {
              product: mockProduct,
            },
          });
        }

        if (url.includes("related-product")) {
          return Promise.resolve({
            data: {
              products: mockRelatedProducts,
            },
          });
        }
      });

      // Act
      await act(async () => {
        renderProductDetails();
      });

      // Assert
      await waitFor(() => {
        const productSection = screen.getByText("Product Details").closest(".product-details-info");

        expect(within(productSection).getByText(/ProductA/i)).toBeInTheDocument();
        expect(within(productSection).getByText(/Product A description/i)).toBeInTheDocument();
        expect(within(productSection).getByText(/\$1\.00/)).toBeInTheDocument();
        expect(within(productSection).getByText(/CategoryA/i)).toBeInTheDocument();
      });

      mockRelatedProducts.forEach((p) => {
        const card = screen.getByText(p.name).closest(".card");
        expect(within(card).getByText(p.name)).toBeInTheDocument();
        expect(within(card).getByText(`$${p.price.toFixed(2)}`)).toBeInTheDocument();

        expect(within(card).getByText("ADD TO CART")).toBeInTheDocument();
        expect(within(card).getByText("More Details")).toBeInTheDocument();
      });
    });

    it("should handle product fetch errors gracefully", async () => {
      // Arrange
      axios.get.mockRejectedValueOnce(new Error("Network error"));

      // Act
      await act(async () => {
        renderProductDetails();
      });

      // Assert
      await waitFor(() =>
        expect(
          screen.queryByText(/ProductA/i)
        ).not.toBeInTheDocument()
      );

      expect(
        screen.getByText("No Similar Products found")
      ).toBeInTheDocument();
    });

    it("should display 'No Similar Products found' if related products array is empty", async () => {
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product/producta")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("related-product")) {
          return Promise.resolve({ data: { products: [] } }); // empty array
        }
      });

      // Act
      await act(async () => {
        renderProductDetails();
      });

      // Assert
      await waitFor(() =>
        expect(screen.getByText(/Product Details/i)).toBeInTheDocument()
      );

      expect(screen.getByText("No Similar Products found")).toBeInTheDocument();
    });

    it("should handle related product fetch errors gracefully", async () => {
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product/producta")) {
          return Promise.resolve({
            data: { product: mockProduct },
          });
        }

        if (url.includes("related-product")) {
          return Promise.reject(new Error("Related error"));
        }
      });

      // Act
      await act(async () => {
        renderProductDetails();
      });

      // Assert
      await waitFor(() => {
        expect(screen.queryByText(/ProductA/i)).toBeInTheDocument();
        expect(screen.getByText("Product Details")).toBeInTheDocument();
      });


      expect(
        screen.getByText("No Similar Products found")
      ).toBeInTheDocument();
    });
  });

  describe("Add To Cart Validation", () => {
    it("should add main product to cart", async () => {
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product/producta")) {
          return Promise.resolve({
            data: { product: mockProduct },
          });
        }

        if (url.includes("related-product")) {
          return Promise.resolve({
            data: { products: mockRelatedProducts },
          });
        }
      });

      await act(async () => {
        renderProductDetails();
      });

      await waitFor(() =>
        expect(
          screen.getByText(/ProductA/i)
        ).toBeInTheDocument()
      );

      const user = createUser();

      const mainProductSection = screen.getByText("Product Details").closest(".product-details-info");
      const addButton = within(mainProductSection).getByText("ADD TO CART");

      // Act
      await act(async () => {
        await user.click(addButton);
      });

      // Assert
      const storedCart = JSON.parse(
        localStorage.getItem("cart_guest")
      );

      expect(storedCart).toHaveLength(1);
      expect(storedCart[0]._id).toBe("product1");
      expect(storedCart[0].name).toBe("ProductA");
    });

    it("should add main product to cart multiple times correctly", async () => {
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product/producta")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("related-product")) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
      });

      await act(async () => {
        renderProductDetails();
      });

      await waitFor(() => expect(screen.getByText(/ProductA/i)).toBeInTheDocument());

      const user = createUser();
      const mainProductSection = screen.getByText("Product Details").closest(".product-details-info");
      const addButton = within(mainProductSection).getByText("ADD TO CART");

      // Act
      await act(async () => {
        await user.click(addButton);
        await user.click(addButton);
      });

      // Assert
      const storedCart = JSON.parse(localStorage.getItem("cart_guest"));
      expect(storedCart).toHaveLength(2);
      expect(storedCart[0]._id).toBe("product1");
      expect(storedCart[1]._id).toBe("product1");
    });

    it("should add related product to cart", async () => {
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product/producta")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("related-product")) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
      });

      await act(async () => {
        renderProductDetails();
      });

      await waitFor(() =>
        expect(screen.getByText("ProductB")).toBeInTheDocument()
      );

      const user = createUser();

      const productBCard = screen.getByText("ProductB").closest(".card");
      const addButton = within(productBCard).getByText("ADD TO CART");

      // Act
      await act(async () => {
        await user.click(addButton);
      });

      // Assert
      const storedCart = JSON.parse(localStorage.getItem("cart_guest"));
      expect(storedCart).toHaveLength(1);
      expect(storedCart[0]._id).toBe("product2");
      expect(storedCart[0].name).toBe("ProductB");
    });

    it("should add multiple related products to cart correctly", async () => {
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product/producta")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("related-product")) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
      });

      await act(async () => {
        renderProductDetails();
      });

      await waitFor(() => expect(screen.getByText("ProductB")).toBeInTheDocument());

      const user = createUser();

      const productBCard = screen.getByText("ProductB").closest(".card");
      const productCCard = screen.getByText("ProductC").closest(".card");
      const addButtonB = within(productBCard).getByText("ADD TO CART");
      const addButtonC = within(productCCard).getByText("ADD TO CART");

      // Act
      await act(async () => {
        await user.click(addButtonB);
        await user.click(addButtonC);
      });

      // Assert
      const storedCart = JSON.parse(localStorage.getItem("cart_guest"));
      expect(storedCart).toHaveLength(2);
      expect(storedCart[0]._id).toBe("product2");
      expect(storedCart[1]._id).toBe("product3");
    });

    it("should add multiple main and related products correctly", async () => {
      
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product/producta")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("related-product")) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
      });

      await act(async () => {
        renderProductDetails();
      });

      await waitFor(() => expect(screen.getByText("ProductB")).toBeInTheDocument());

      const user = createUser();

      const mainSection = screen.getByText("Product Details").closest(".product-details-info");
      const addMain = within(mainSection).getByText("ADD TO CART");

      const cardB = screen.getByText("ProductB").closest(".card");
      const cardC = screen.getByText("ProductC").closest(".card");
      const addB = within(cardB).getByText("ADD TO CART");
      const addC = within(cardC).getByText("ADD TO CART");

      // Act
      await act(async () => {
        await user.click(addMain);
        await user.click(addB);
        await user.click(addC);
        await user.click(addMain);
        await user.click(addB);
      });

      // Assert
      const storedCart = JSON.parse(localStorage.getItem("cart_guest"));
      expect(storedCart).toHaveLength(5);
      expect(storedCart.map(p => p._id)).toEqual([
        "product1", "product2", "product3", "product1", "product2"
      ]);
    });
  });

  describe("More Details Validation", () => {
    
    it("should navigate to related product when clicking More Details", async () => {
      
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product/producta")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("get-product/productb")) {
          return Promise.resolve({ data: { product: mockRelatedProducts[0] } });
        }
        if (url.includes("related-product")) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
      });

      await act(async () => {
        renderProductDetails();
      });

      await waitFor(() => {
        expect(screen.getByText("ProductB")).toBeInTheDocument();
      });

      const user = createUser();

      const productBCard = screen.getByText("ProductB").closest(".card");
      const moreDetailsButton = within(productBCard).getByText("More Details");

      // Act
      await act(async () => {
        await user.click(moreDetailsButton);
      });

      // Assert
      await waitFor(() => { 
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("productb")
        );
      });
    
      await waitFor(() => {
        const productSection = screen.getByText("Product Details").closest(".product-details-info");
        expect(within(productSection).getByText(/ProductB/i)).toBeInTheDocument();
        expect(within(productSection).getByText(/Product B description/i)).toBeInTheDocument();
        expect(within(productSection).getByText(/\$2\.00/)).toBeInTheDocument();
        expect(within(productSection).getByText(/CategoryA/i)).toBeInTheDocument();
      });
    });
  });
});