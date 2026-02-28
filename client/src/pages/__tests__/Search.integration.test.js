// Censon Lee Lemuel John Alejo, A0273436B
import React, { useEffect } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import Search from "../Search";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider, useSearch } from "../../context/search";

// =============== Helpers ===============
const SeedResults = ({ results }) => {
  const [values, setValues] = useSearch();

  useEffect(() => {
    setValues({ ...values, results });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  return null;
};

const renderSearchRoute = (results) =>
  render(
    <AuthProvider>
      <SearchProvider>
        <CartProvider>
          <MemoryRouter initialEntries={["/search"]}>
            <SeedResults results={results} />
            <Routes>
              <Route path="/search" element={<Search />} />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </SearchProvider>
    </AuthProvider>,
  );

// =============== Tests ===============
describe("Search route integration (/search) with real Layout", () => {
  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  describe("Wiring validation (EP)", () => {
    it("should render No Products Found when results are empty", async () => {
      // Arrange & Act
      renderSearchRoute([]);

      // Assert
      expect(await screen.findByText("No Products Found")).toBeInTheDocument();
    });

    it("should render Found 4 when provider contains 4 results", async () => {
      // Arrange
      const results = [
        { _id: "p1", name: "Product 1", description: "desc 1 long enough", price: 1 },
        { _id: "p2", name: "Product 2", description: "desc 2 long enough", price: 2 },
        { _id: "p3", name: "Product 3", description: "desc 3 long enough", price: 3 },
        { _id: "p4", name: "Product 4", description: "desc 4 long enough", price: 4 },
      ];

      // Act
      renderSearchRoute(results);

      // Assert
      expect(await screen.findByText("Found 4")).toBeInTheDocument();
      expect(screen.getAllByText("More Details")).toHaveLength(4);
      expect(screen.getAllByText("ADD TO CART")).toHaveLength(4);
    });
  });
});