// Censon Lee Lemuel John Alejo, A0273436B
import React from "react";
import { render, fireEvent, waitFor, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import SearchInput from "../SearchInput";
import { SearchProvider, useSearch } from "../../../context/search";

// =============== Mocks ===============
jest.mock("axios");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// =============== Helpers ===============
const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

const ResultsProbe = () => {
  const [values] = useSearch();
  return <div data-testid="results-len">{values.results.length}</div>;
};

const renderWithProvider = () =>
  render(
    <SearchProvider>
      <SearchInput />
      <ResultsProbe />
    </SearchProvider>,
  );

// =============== Tests ===============
describe("SearchInput integration (SearchInput + SearchProvider)", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => {
    restoreConsole();
    cleanup();
  });

  describe("Submit flow (EP)", () => {
    it("should submit a valid keyword, store results in provider state, and navigate to /search", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { results: [{ _id: "p1" }, { _id: "p2" }] },
      });

      renderWithProvider();
      fireEvent.change(screen.getByLabelText("Search"), {
        target: { value: "laptop" },
      });

      // Act
      fireEvent.submit(screen.getByRole("search"));

      // Assert
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/laptop"),
      );
      await waitFor(() =>
        expect(screen.getByTestId("results-len")).toHaveTextContent("2"),
      );
      expect(mockNavigate).toHaveBeenCalledWith("/search");
    });
  });

  describe("Early return (BVA)", () => {
    it("should not call API when keyword trims to empty (Below Boundary: 0 characters)", async () => {
      // Arrange
      renderWithProvider();
      fireEvent.change(screen.getByLabelText("Search"), {
        target: { value: "   " },
      });

      // Act
      fireEvent.submit(screen.getByRole("search"));

      // Assert
      await waitFor(() => expect(axios.get).not.toHaveBeenCalled());
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(screen.getByTestId("results-len")).toHaveTextContent("0");
    });
  });
});