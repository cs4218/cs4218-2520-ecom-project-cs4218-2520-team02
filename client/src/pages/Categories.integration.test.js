// Yap Zhao Yi, A0277540B
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import Categories from "./Categories";
import axios from "axios";
import { AuthProvider } from "../context/auth";
import { CartProvider } from "../context/cart";
import { SearchProvider } from "../context/search";

// Mocks
jest.mock("axios");

jest.mock("./../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

const AppProviders = ({ children }) => (
  <MemoryRouter>
    <AuthProvider>
      <CartProvider>
        <SearchProvider>{children}</SearchProvider>
      </CartProvider>
    </AuthProvider>
  </MemoryRouter>
);

const renderCategories = () =>
  render(
    <AppProviders>
      <Categories />
    </AppProviders>
  );
describe("Categories Page Integration Test", () => {
  
  let logSpy
  
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

  describe("useCategory Validation", () => {
    it("renders categories fetched from useCategory", async () => {
      
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          categories: [
            { _id: "1", name: "CategoryA", slug: "categorya" },
            { _id: "2", name: "CategoryB", slug: "categoryb" },
          ],
        },
      });

      // Act
      renderCategories()

      const aLink = await screen.findByRole("link", { name: "CategoryA" });
      const bLink = await screen.findByRole("link", { name: "CategoryB" });

      // Assert
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      );

      expect(aLink).toHaveAttribute("href", "/category/categorya");
      expect(bLink).toHaveAttribute("href", "/category/categoryb");
    });

    it("renders no categories when no categories fetched from useCategory", async () => {
      
      // Assert
      axios.get.mockResolvedValueOnce({
        data: { success: true, categories: [] },
      });

      // Act
      renderCategories()

      await screen.findByTestId("layout");

      // Assert
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("renders gracefully when API error occurs during useCategory", async () => {
      
      // Arrange
      axios.get.mockRejectedValueOnce(new Error("Network Failure"));

      // Act
      renderCategories()

      await screen.findByTestId("layout");

      // Assert
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(logSpy).toHaveBeenCalled();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });
});