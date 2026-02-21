// Censon Lee Lemuel John Alejo, A0273436B
import React from "react";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import CategoryForm from "../CategoryForm";

// =============== Helpers ===============
const renderCategoryForm = (props = {}) => {
  const defaults = {
    handleSubmit: jest.fn((e) => e.preventDefault()),
    value: "",
    setValue: jest.fn(),
  };

  return render(<CategoryForm {...defaults} {...props} />);
};

// =============== Tests ===============
describe("CategoryForm", () => {
  afterEach(() => cleanup());

  describe("Smoke", () => {
    it("should render category input and submit button", () => {
      // Arrange & Act
      renderCategoryForm();

      // Assert
      expect(
        screen.getByPlaceholderText("Enter new category"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Submit" }),
      ).toBeInTheDocument();
    });

    it("should display the controlled input value", () => {
      // Arrange & Act
      renderCategoryForm({ value: "Electronics" });

      // Assert
      expect(screen.getByPlaceholderText("Enter new category")).toHaveValue(
        "Electronics",
      );
    });
  });

  describe("Input Handling (EP)", () => {
    it("should call setValue with the typed text", () => {
      // Arrange
      const setValue = jest.fn();
      renderCategoryForm({ setValue });

      // Act
      fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
        target: { value: "Books" },
      });

      // Assert
      expect(setValue).toHaveBeenCalledWith("Books");
    });
  });

  describe("Submit Handling (EP)", () => {
    it("should submit the form when submit button is clicked", () => {
      // Arrange
      const handleSubmit = jest.fn((e) => e.preventDefault());
      renderCategoryForm({ handleSubmit });

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));

      // Assert
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
