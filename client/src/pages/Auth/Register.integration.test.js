// Gavin Sin Fu Chen (A0273285X)
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Register from "./Register";
import axios from "axios";
import toast from "react-hot-toast";

jest.mock("axios", () => ({
  post: jest.fn(),
}));

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  Toaster: () => null,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const renderRegisterPage = () => {
  render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<div data-testid="login-page" />} />
      </Routes>
    </MemoryRouter>,
  );
};

const fillForm = () => {
  fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
    target: { value: "John Doe" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
    target: { value: "1234567890" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
    target: { value: "123 Street" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
    target: { value: "2000-01-01" },
  });
  fireEvent.change(screen.getByPlaceholderText("What Is Your Favorite Sport"), {
    target: { value: "Football" },
  });
};

describe("Register Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("register successfully and navigate to /login", async () => {
    // Arrange
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderRegisterPage();

    // Act
    fillForm();
    fireEvent.click(screen.getByText("REGISTER"));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith(
      "Register Successfully, please login",
    );
    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
  });

  it("do not call backend when form validations fail", async () => {
    // Arrange
    renderRegisterPage();
    const submitBtn = screen.getByRole("button", { name: "REGISTER" });
    submitBtn.closest("form").noValidate = true;

    // Act
    fillForm();
    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
      target: { value: " " },
    });
    fireEvent.click(submitBtn);

    // Assert
    await waitFor(() => expect(axios.post).not.toHaveBeenCalled());
    await screen.findByText("Name is required");
  });

  it("shows backend error when duplicate email account exists", async () => {
    // Arrange
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "User already exists" },
    });
    renderRegisterPage();

    // Act
    fillForm();
    fireEvent.click(screen.getByText("REGISTER"));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("User already exists");
  });
});
