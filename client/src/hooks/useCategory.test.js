// Yap Zhao Yi, A0277540B
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import useCategory from "./useCategory";

// Mocks
jest.mock("axios");

const renderCategoryConsumer = () => render(<CategoryConsumer />);

function CategoryConsumer() {
  const categories = useCategory();
  return (
    <div>
      <div data-testid="type">
        {Array.isArray(categories) ? "array" : String(categories)}
      </div>
      <div data-testid="len">
        {Array.isArray(categories) ? String(categories.length) : "NA"}
      </div>
    </div>
  );
}

describe("useCategory Hook Unit Tests", () => {

  let logSpy

  beforeEach(() => {

      jest.clearAllMocks();

      // Suppress console log
      logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });
  
  afterEach(() => {
      // Restore console log to original behaviour
      logSpy.mockRestore()
  });

  // Special cases: necessary fields missing, empty array, null categories
  // Not required to be tested: very long arrays 
  describe("Category Return Array (EP)", () => {

    it("should return undefined if categories field is missing in API response (EP: missing fields)", async () => {
      
      // Arrange
      axios.get.mockResolvedValueOnce({ data: {} });

      // Act
      renderCategoryConsumer();

      // Assert
      await waitFor(() => expect(screen.getByTestId("type")).toHaveTextContent("undefined"));
      expect(screen.getByTestId("len")).toHaveTextContent("NA");
    });

    it("should return null if categories field is null in API response (EP: null categories)", async () => {
      
      // Arrange
      axios.get.mockResolvedValueOnce({ data: { categories: null } });

      // Act
      renderCategoryConsumer();

      // Assert
      await waitFor(() => expect(screen.getByTestId("type")).toHaveTextContent("null"));
      expect(screen.getByTestId("len")).toHaveTextContent("NA");
    });

    it("should return an empty array when API returns no categories (EP: 0 category)", async () => {
      
      // Arrange
      axios.get.mockResolvedValueOnce({ data: { categories: [] } });

      // Act
      renderCategoryConsumer();

      // Assert
      await waitFor(() => expect(screen.getByTestId("len")).toHaveTextContent("0"));
      expect(screen.getByTestId("type")).toHaveTextContent("array");
    });

    it("should return array with a category when API returns one item (EP: 1 category)", async () => {
      
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { categories: [{ _id: "1", name: "A", slug: "a" }] },
      });

      // Act
      renderCategoryConsumer();

      // Assert
      await waitFor(() => expect(screen.getByTestId("len")).toHaveTextContent("1"));
      expect(screen.getByTestId("type")).toHaveTextContent("array");
    });
  });

  describe("Request failure (EP)", () => {
    it("should log error and retain initial empty array when request fails", async () => {
      
      // Arrange
      axios.get.mockRejectedValueOnce(new Error("Request has failed."));

      // Act
      renderCategoryConsumer();

      // Assert
      await waitFor(() => expect(logSpy).toHaveBeenCalled());
      await waitFor(() => expect(screen.getByTestId("len")).toHaveTextContent("0"));
      expect(screen.getByTestId("type")).toHaveTextContent("array");
    });
  });
});
