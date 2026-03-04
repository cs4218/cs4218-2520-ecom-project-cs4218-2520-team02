// Gavin Sin Fu Chen (A0273285X)
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
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

const renderLoginPage = () => {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/" element={<div data-testid="home-page" />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/forgot-password"
          element={<div data-testid="forgot-password-page" />}
        />
      </Routes>
    </MemoryRouter>,
  );
};

const fillForm = () => {
  fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
    target: { value: "password123" },
  });
};

describe("Login Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("login successfully and navigate to /", async () => {
    // Arrange
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "login successfully",
        user: { id: 1, name: "John Doe", email: "test@example.com" },
        token: "mockToken",
      },
    });
    renderLoginPage();

    // Act
    fillForm();
    fireEvent.click(screen.getByText("LOGIN"));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("login successfully", {
      duration: 5000,
      icon: "🙏",
      style: {
        background: "green",
        color: "white",
      },
    });
    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
  });

  it("press forget password button and navigate to /forgot-password", async () => {
    // Arrange
    renderLoginPage();

    // Act
    fireEvent.click(screen.getByText("Forgot Password"));

    // Assert
    await waitFor(() => expect(axios.post).not.toHaveBeenCalled());
    expect(
      await screen.findByTestId("forgot-password-page"),
    ).toBeInTheDocument();
  });

  it("do not call backend when form validations fail", async () => {
    // Arrange
    renderLoginPage();
    const submitBtn = screen.getByRole("button", { name: "LOGIN" });
    submitBtn.closest("form").noValidate = true;

    // Act
    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "testexample.com" },
    });
    fireEvent.click(submitBtn);

    // Assert
    await waitFor(() => expect(axios.post).not.toHaveBeenCalled());
    expect(await screen.findByText("Email is invalid")).toBeInTheDocument();
  });

  it("show backend error when account is invalid", async () => {
    // Arrange
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Invalid credentials" },
    });
    renderLoginPage();

    // Act
    fillForm();
    fireEvent.click(screen.getByText("LOGIN"));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
  });
});
