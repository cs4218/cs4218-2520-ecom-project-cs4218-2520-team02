// Yap Zhao Yi, A0277540B
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Categories from "../pages/Categories";

// Mocks
jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children, title }) => (
    <div data-testid="layout" title={title}>
      {children}
    </div>
  ),
}));

jest.mock("../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Imports
import useCategory from "../hooks/useCategory";

const renderCategories = () =>
  render(
    <MemoryRouter>
      <Categories />
    </MemoryRouter>
  );

describe("Categories Page Unit Tests", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    useCategory.mockReturnValue([]);
  });

  describe("Page Validation (EP)", () => {
    it("should render without crashing", () => {
        
        // Arrange & Act
        renderCategories();

        // Assert
        expect(screen.getByTestId("layout")).toBeInTheDocument();
    
      });

    it("should pass the correct title to Layout", () => {
    
      // Arrange & Act
      renderCategories();

      // Assert
      expect(screen.getByTestId("layout")).toHaveAttribute("title", "All Categories");

    });

    it("should render even with missing slug (EP: missing information)", () => {
      
      // Arrange
      useCategory.mockReturnValue([
        { _id: "1", name: "CategoryA"},
      ]);

      // Act
      renderCategories();

      // Assert
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(1);

      expect(links[0]).toHaveTextContent("CategoryA");
      expect(links[0]).toHaveAttribute("href", "/category/undefined");
    });
  });

  // Boundary for array: length 0 and length 1
  // Not required to be tested: very long arrays  
  describe("Hook amount (BVA)", () => {
    it("should render without categories when hook returns empty array (Below Boundary: empty array)", () => {
      
      // Arrange
      useCategory.mockReturnValueOnce([]);

      // Act
      renderCategories();

      // Assert
      expect(screen.queryAllByRole("link").length).toBe(0);
    
    });

    it("should render categories when hook returns 1 item array (On Boundary: 1 items)", () => {
      
      // Arrange
      useCategory.mockReturnValue([
        { _id: "1", name: "CategoryA", slug: "categorya" },
      ]);

      // Act
      renderCategories();

      // Assert
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(1);

      expect(links[0]).toHaveTextContent("CategoryA");
      expect(links[0]).toHaveAttribute("href", "/category/categorya");
    });

    it("should render categories when hook returns 2 item array (Above Boundary: 2 items)", () => {
      
      // Arrange
      useCategory.mockReturnValue([
        { _id: "1", name: "CategoryA", slug: "categorya" },
        { _id: "2", name: "CategoryB", slug: "categoryb" },
      ]);

      // Act
      renderCategories();

      // Assert
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(2);

      expect(links[0]).toHaveTextContent("CategoryA");
      expect(links[0]).toHaveAttribute("href", "/category/categorya");
      expect(links[1]).toHaveTextContent("CategoryB");
      expect(links[1]).toHaveAttribute("href", "/category/categoryb");
    });
  });
});
