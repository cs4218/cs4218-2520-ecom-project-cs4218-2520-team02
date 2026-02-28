// Censon Lee Lemuel John Alejo, A0273436B
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { SearchProvider, useSearch } from "../search";

// =============== Mocks ===============
const Consumer = () => {
  const [state, setState] = useSearch();

  return (
    <div>
      <div data-testid="keyword">{state.keyword}</div>
      <div data-testid="results-len">{state.results.length}</div>

      <button
        type="button"
        onClick={() =>
          setState({
            ...state,
            keyword: "laptop",
            results: [{ _id: "p1" }, { _id: "p2" }],
          })
        }
      >
        Update
      </button>
    </div>
  );
};

// =============== Tests ===============
describe("SearchContext", () => {
  describe("Smoke", () => {
    test("renders children inside SearchProvider", () => {
      // Arrange & Act
      render(
        <SearchProvider>
          <div>child</div>
        </SearchProvider>,
      );

      // Assert
      expect(screen.getByText("child")).toBeInTheDocument();
    });
  });

  describe("Default state (EP)", () => {
    test("provides default keyword and results", () => {
      // Arrange & Act
      render(
        <SearchProvider>
          <Consumer />
        </SearchProvider>,
      );

      // Assert
      expect(screen.getByTestId("keyword")).toHaveTextContent("");
      expect(screen.getByTestId("results-len")).toHaveTextContent("0");
    });
  });

  describe("State update (EP)", () => {
    test("setAuth updates context state and re-renders consumers", () => {
      // Arrange
      render(
        <SearchProvider>
          <Consumer />
        </SearchProvider>,
      );

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Update" }));

      // Assert
      expect(screen.getByTestId("keyword")).toHaveTextContent("laptop");
      expect(screen.getByTestId("results-len")).toHaveTextContent("2");
    });
  });
});