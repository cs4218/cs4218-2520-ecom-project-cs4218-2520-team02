import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Header from "./Header";
import "@testing-library/jest-dom";
import toast from "react-hot-toast";

// Mocks
jest.mock("react-hot-toast");

jest.mock("./Form/SearchInput", () => ({
  __esModule: true,
  default: () => <div data-testid="search-input"/>,
}));

jest.mock("../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockSetAuth = jest.fn();
const mockUseAuth = jest.fn();
const mockUseCart = jest.fn();

jest.mock("../context/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../context/cart", () => ({
  useCart: () => mockUseCart(),
}));

// Imports
import useCategory from "../hooks/useCategory";

const renderHeader = () =>
  render(
    <BrowserRouter>
      <Header />
    </BrowserRouter>
  );

describe("Header Component Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);
  });

  describe("Page Validation (EP)", () => {

    it("should render all navigation elements", () => {
      
      // Arrange
      mockUseAuth.mockReturnValue([{ user: null }, mockSetAuth]);

      // Act
      renderHeader();

      const brandLink = screen.getByText("🛒 Virtual Vault")
      const home = screen.getByText("Home")
      const search = screen.getByTestId("search-input")

      // Assert
      expect(brandLink).toBeInTheDocument();
      expect(home).toBeInTheDocument();
      expect(search).toBeInTheDocument();

      expect(brandLink.closest("a")).toHaveAttribute("href", "/");
    });
  });

  describe("Authentication Validation (EP)", () => {

    it("should show register and login when logged out", () => {

      // Arrange
      mockUseAuth.mockReturnValue([{ user: null }, mockSetAuth]);

      // Act
      renderHeader();

      // Assert
      expect(screen.getByText("Register")).toBeInTheDocument();
      expect(screen.getByText("Login")).toBeInTheDocument();
      expect(screen.queryByText("Logout")).not.toBeInTheDocument();
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    });

    it("should show user name and correct dashboard link when logged in as user", () => {
      
      // Arrange
      mockUseAuth.mockReturnValue([
        { user: { name: "User1", role: 0 } },
        mockSetAuth,
      ]);

      // Act
      renderHeader();

      const username = screen.getByText("User1")
      const logout = screen.getByText("Logout")
      const dashboardLink = screen.getByText("Dashboard")

      // Assert
      expect(username).toBeInTheDocument();
      expect(logout).toBeInTheDocument();
      expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard/user");
      expect(screen.queryByText("Register")).not.toBeInTheDocument();
      expect(screen.queryByText("Login")).not.toBeInTheDocument();
    });

    it("should show admin dashboard link when logged in as admin", () => {
      
      // Arrange
      mockUseAuth.mockReturnValue([
        { user: { name: "Admin1", role: 1 } },
        mockSetAuth,
      ]);

      // Act
      renderHeader();

      const username = screen.getByText("Admin1")
      const logout = screen.getByText("Logout")
      const dashboardLink = screen.getByText("Dashboard")

      // Assert
      expect(username).toBeInTheDocument();
      expect(logout).toBeInTheDocument();
      expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard/admin");
      expect(screen.queryByText("Register")).not.toBeInTheDocument();
      expect(screen.queryByText("Login")).not.toBeInTheDocument();
    });
  });

  describe("Logout Function Validation (EP)", () => {

    it("should handle logout correctly", () => {

      // Arrange
      const mockAuth = { user: { name: "User1", role: 0 }, token: "abc" }
      mockUseAuth.mockReturnValue([
        mockAuth,
        mockSetAuth,
      ]);

      localStorage.setItem("auth", JSON.stringify(mockAuth));

      // Act
      renderHeader();
      fireEvent.click(screen.getByText("Logout"));

      // Assert
      expect(mockSetAuth).toHaveBeenCalledWith({
        ...mockAuth,
        user: null,
        token: "",
      });
      expect(localStorage.getItem("auth")).toBeNull();
      expect(toast.success).toHaveBeenCalledWith("Logout Successfully");
    });
  });

  // Boundary for category: length 0 and length 1
  // Not required to be tested: very long arrays 
  describe("Categories Validation (BVA)", () => {

    it("should render no categories in dropdown if no categories retrieved (Below Boundary: 0 category)", () => {

      // Arrange
      mockUseAuth.mockReturnValue([{ user: null }, mockSetAuth]);

      useCategory.mockReturnValue([]);

      // Act
      renderHeader();

      const categoriesDropDown = screen.getByText("Categories")
      const allCategoriesLink = screen.getByText("All Categories")

      // Assert
      expect(categoriesDropDown).toBeInTheDocument();
      expect(allCategoriesLink).toBeInTheDocument();
      expect(allCategoriesLink.closest("a")).toHaveAttribute("href", "/categories");
    
    });

    it("should render a category in dropdown if one categories retrieved (On Boundary: 1 category)", () => {

      // Arrange
      mockUseAuth.mockReturnValue([{ user: null }, mockSetAuth]);

      useCategory.mockReturnValue([
        { _id: 1, name: "CategoryA", slug: "categorya" },
      ]);

      // Act
      renderHeader();

      const categoriesDropDown = screen.getByText("Categories")
      const allCategoriesLink = screen.getByText("All Categories")
      const categoryALink = screen.getByText("CategoryA")

      // Assert
      expect(categoriesDropDown).toBeInTheDocument();
      expect(allCategoriesLink).toBeInTheDocument();
      expect(categoryALink).toBeInTheDocument();
      expect(allCategoriesLink.closest("a")).toHaveAttribute("href", "/categories");
      expect(categoryALink.closest("a")).toHaveAttribute("href", "/category/categorya");
    
    });

    it("should render 2 categories in dropdown if 2 categories retrieved (Above Boundary: 1 category)", () => {

      // Arrange
      mockUseAuth.mockReturnValue([{ user: null }, mockSetAuth]);

      useCategory.mockReturnValue([
        { _id: 1, name: "CategoryA", slug: "categorya" },
        { _id: 2, name: "CategoryB", slug: "categoryb" },
      ]);

      // Act
      renderHeader();

      const categoriesDropDown = screen.getByText("Categories")
      const allCategoriesLink = screen.getByText("All Categories")
      const categoryALink = screen.getByText("CategoryA")
      const categoryBLink = screen.getByText("CategoryB")

      // Assert
      expect(categoriesDropDown).toBeInTheDocument();
      expect(allCategoriesLink).toBeInTheDocument();
      expect(categoryALink).toBeInTheDocument();
      expect(categoryBLink).toBeInTheDocument();
      expect(allCategoriesLink.closest("a")).toHaveAttribute("href", "/categories");
      expect(categoryALink.closest("a")).toHaveAttribute("href", "/category/categorya");
      expect(categoryBLink.closest("a")).toHaveAttribute("href", "/category/categoryb");
    
    });
  });

  describe("Cart Validation (EP)", () => {

    it("should display correct cart count", () => {

      // Arrange
      mockUseAuth.mockReturnValue([{ user: null }, mockSetAuth]);
      mockUseCart.mockReturnValue([[{ _id: 1 }, { _id: 2 }, { _id: 3 }]]);

      // Act
      renderHeader();

      const cartLink = screen.getByText("Cart")
      const count = screen.getByText("3")

      // Assert
      expect(cartLink).toBeInTheDocument();
      expect(count).toBeInTheDocument();

      expect(cartLink.closest("a")).toHaveAttribute("href", "/cart");
    
    });
  });
});