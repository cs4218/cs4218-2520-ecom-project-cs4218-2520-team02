// Censon Lee Lemuel John Alejo, A0273436B
import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  screen,
  cleanup,
} from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import SearchInput from "../SearchInput";

// =============== Mocks ===============
jest.mock("axios");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

let mockValues;
const mockSetValues = jest.fn();

jest.mock("../../../context/search", () => ({
  useSearch: () => [mockValues, mockSetValues],
}));

// =============== Helpers ===============
const renderSearch = () => render(<SearchInput />);

const silenceConsole = () => {
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => logSpy.mockRestore();
};

// =============== Tests ===============
describe("SearchInput", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
    mockValues = { keyword: "", results: [] };
  });

  afterEach(() => {
    restoreConsole();
    cleanup();
  });

  describe("Smoke", () => {
    test("should render search input and search button", () => {
      // Arrange & Act
      renderSearch();

      // Assert
      expect(screen.getByLabelText("Search")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Search" }),
      ).toBeInTheDocument();
    });

    test("should update keyword in search context when user types", () => {
      // Arrange
      renderSearch();

      // Act
      fireEvent.change(screen.getByLabelText("Search"), {
        target: { value: "laptop" },
      });

      // Assert
      expect(mockSetValues).toHaveBeenCalledWith({
        ...mockValues,
        keyword: "laptop",
      });
    });
  });

  describe("Keyword Boundary Validation (BVA)", () => {
    it("should not call API or navigate when keyword trims to empty (Below Boundary: 0 chars)", async () => {
      // Arrange
      mockValues = { keyword: " ", results: [] };

      // Act
      renderSearch();
      fireEvent.submit(screen.getByRole("search"));

      // Assert
      await waitFor(() => expect(axios.get).not.toHaveBeenCalled());
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should call API, store results, and navigate when keyword is 1 character (On Boundary: 1 char)", async () => {
      // Arrange
      mockValues = { keyword: "a", results: [] };
      axios.get.mockResolvedValueOnce({
        data: { results: [{ _id: "p1" }] },
      });

      // Act
      renderSearch();
      fireEvent.submit(screen.getByRole("search"));

      // Assert
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/a"),
      );

      expect(mockSetValues).toHaveBeenCalledWith({
        ...mockValues,
        results: [{ _id: "p1" }],
      });

      expect(mockNavigate).toHaveBeenCalledWith("/search");
    });

    it("should call API, store results, and navigate when keyword is 2 characters (Above Boundary: 2+ chars)", async () => {
      // Arrange
      mockValues = { keyword: "ab", results: [] };
      axios.get.mockResolvedValueOnce({
        data: { results: [{ _id: "p1" }, { _id: "p2" }] },
      });

      // Act
      renderSearch();
      fireEvent.submit(screen.getByRole("search"));

      // Assert
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/ab"),
      );

      expect(mockSetValues).toHaveBeenCalledWith({
        ...mockValues,
        results: [{ _id: "p1" }, { _id: "p2" }],
      });

      expect(mockNavigate).toHaveBeenCalledWith("/search");
    });
  });

  describe("Search Response Validation (EP)", () => {
    it("should store an empty results array when API response has no results field", async () => {
      // Arrange
      mockValues = { keyword: "phone", results: ["old"] };
      axios.get.mockResolvedValueOnce({ data: {} });

      // Act
      renderSearch();
      fireEvent.submit(screen.getByRole("search"));

      // Assert
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/phone"),
      );

      expect(mockSetValues).toHaveBeenCalledWith({
        ...mockValues,
        results: [],
      });

      expect(mockNavigate).toHaveBeenCalledWith("/search");
    });

    it("should log error and not navigate when API request fails", async () => {
      // Arrange
      mockValues = { keyword: "laptop", results: [] };
      axios.get.mockRejectedValueOnce(new Error("Network error"));

      // Act
      renderSearch();
      fireEvent.submit(screen.getByRole("search"));

      // Assert
      await waitFor(() => expect(axios.get).toHaveBeenCalled());
      await waitFor(() => expect(console.log).toHaveBeenCalled());
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});