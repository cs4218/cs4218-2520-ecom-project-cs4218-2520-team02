// Censon Lee Lemuel John Alejo, A0273436B
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Search from "../Search";
import * as searchContext from "../../context/search";

// =============== Mocks ===============
jest.mock("../../components/Layout", () => {
  return function Layout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../context/search");

// =============== Mock data ===============
const oneProduct = [
  {
    _id: "1",
    name: "Product 1",
    description: "product 1 description that is long enough",
    price: 1,
  },
];

const fourProducts = [
  {
    _id: "1",
    name: "Product 1",
    description: "product 1 description that is long enough",
    price: 1,
  },
  {
    _id: "2",
    name: "Product 2",
    description: "product 2 description that is long enough",
    price: 2,
  },
  {
    _id: "3",
    name: "Product 3",
    description: "product 3 description that is long enough",
    price: 3,
  },
  {
    _id: "4",
    name: "Product 4",
    description: "product 4 description that is long enough",
    price: 4,
  },
];

// =============== Tests ===============
describe("Search Page", () => {
  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  describe("Smoke", () => {
    test("renders page shell", () => {
      // Arrange
      searchContext.useSearch.mockReturnValue([{ results: [] }, jest.fn()]);

      // Act
      render(<Search />);

      // Assert
      expect(screen.getByTestId("layout")).toBeInTheDocument();
      expect(screen.getByText("Search Resuts")).toBeInTheDocument();
    });
  });

  describe("Results count (BVA)", () => {
    test("0 results shows No Products Found (Below Boundary)", () => {
      // Arrange
      searchContext.useSearch.mockReturnValue([{ results: [] }, jest.fn()]);

      // Act
      render(<Search />);

      // Assert
      expect(screen.getByText("No Products Found")).toBeInTheDocument();
    });

    test("1 result shows Found 1 (On Boundary)", () => {
      // Arrange
      searchContext.useSearch.mockReturnValue([{ results: oneProduct }, jest.fn()]);

      // Act
      render(<Search />);

      // Assert
      expect(screen.getByText("Found 1")).toBeInTheDocument();
      expect(screen.getByText("Product 1")).toBeInTheDocument();
    });

    test("4 results shows Found 4 (Above Boundary)", () => {
      // Arrange
      searchContext.useSearch.mockReturnValue([{ results: fourProducts }, jest.fn()]);

      // Act
      render(<Search />);

      // Assert
      expect(screen.getByText("Found 4")).toBeInTheDocument();
      expect(screen.getByText("Product 1")).toBeInTheDocument();
      expect(screen.getByText("Product 2")).toBeInTheDocument();
      expect(screen.getByText("Product 3")).toBeInTheDocument();
      expect(screen.getByText("Product 4")).toBeInTheDocument();
      expect(screen.getAllByText("More Details")).toHaveLength(4);
      expect(screen.getAllByText("ADD TO CART")).toHaveLength(4);
    });
  });

  describe("Card rendering (EP)", () => {
    test("renders product cards with image, name, truncated description, price, and action buttons", () => {
      // Arrange
      searchContext.useSearch.mockReturnValue([{ results: fourProducts }, jest.fn()]);

      // Act
      render(<Search />);

      // Assert
      const img1 = screen.getByAltText("Product 1");
      expect(img1).toHaveAttribute("src", "/api/v1/product/product-photo/1");

      expect(screen.getByText("$ 1")).toBeInTheDocument();
      expect(screen.getByText("$ 2")).toBeInTheDocument();

      expect(
        screen.getByText((t) => t.startsWith("product 1 description")),
      ).toBeInTheDocument();

      expect(screen.getAllByText("More Details")).toHaveLength(4);
      expect(screen.getAllByText("ADD TO CART")).toHaveLength(4);
    });
  });
});