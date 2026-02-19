import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import CategoryForm from "../CategoryForm";

describe("CategoryForm", () => {
  it("renders input and submit button", () => {
    render(
      <CategoryForm handleSubmit={jest.fn()} value="" setValue={jest.fn()} />,
    );

    expect(
      screen.getByPlaceholderText("Enter new category"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("shows the controlled input value", () => {
    render(
      <CategoryForm
        handleSubmit={jest.fn()}
        value="Electronics"
        setValue={jest.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("Enter new category")).toHaveValue(
      "Electronics",
    );
  });

  it("calls setValue with the typed text", () => {
    const setValue = jest.fn();

    render(
      <CategoryForm handleSubmit={jest.fn()} value="" setValue={setValue} />,
    );

    fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
      target: { value: "Books" },
    });

    expect(setValue).toHaveBeenCalledTimes(1);
    expect(setValue).toHaveBeenCalledWith("Books");
  });

  it("submits the form via button click", () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());

    render(
      <CategoryForm handleSubmit={handleSubmit} value="" setValue={jest.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit.mock.calls[0][0]).toEqual(expect.any(Object));
  });

  it("submits the form via submit event on the form", () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());

    render(
      <CategoryForm handleSubmit={handleSubmit} value="" setValue={jest.fn()} />,
    );

    fireEvent.submit(screen.getByRole("button", { name: "Submit" }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit.mock.calls[0][0]).toEqual(expect.any(Object));
  });
});
