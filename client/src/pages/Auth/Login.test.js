import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Login from "./Login";

jest.mock("axios");
axios.get.mockResolvedValueOnce({ data: { category: [] } });

jest.mock("react-hot-toast");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

const renderLoginComponent = () => {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("Login Component", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => restoreConsole());

  describe("Rendering and Form Submission", () => {
    it("renders login form", async () => {
      renderLoginComponent();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByText("LOGIN FORM")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter Your Email"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter Your Password"),
      ).toBeInTheDocument();
    });

    it("inputs should be initially empty", async () => {
      renderLoginComponent();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByText("LOGIN FORM")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter Your Email").value).toBe("");
      expect(screen.getByPlaceholderText("Enter Your Password").value).toBe("");
    });

    it("should allow typing email and password", async () => {
      renderLoginComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByPlaceholderText("Enter Your Email").value).toBe(
        "test@example.com",
      );
      expect(screen.getByPlaceholderText("Enter Your Password").value).toBe(
        "password123",
      );
    });

    it("should login the user successfully", async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          user: { id: 1, name: "John Doe", email: "test@example.com" },
          token: "mockToken",
        },
      });
      renderLoginComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("LOGIN"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith(undefined, {
        duration: 5000,
        icon: "🙏",
        style: {
          background: "green",
          color: "white",
        },
      });
    });

    it("should display error message on failed login", async () => {
      axios.post.mockRejectedValueOnce({ message: "Invalid credentials" });

      renderLoginComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("LOGIN"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });

    it("should display API error message on failed login", async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Invalid credentials" },
      });

      renderLoginComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("LOGIN"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
    });

    it("clears email error when user starts typing", async () => {
      renderLoginComponent();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      const submitBtn = screen.getByRole("button", { name: "LOGIN" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);
      await screen.findByText("Email is invalid");
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });

      expect(screen.queryByText("Email is invalid")).not.toBeInTheDocument();
    });

    it("navigates to forgot password page when button is clicked", () => {
      renderLoginComponent();

      fireEvent.click(screen.getByText("Forgot Password"));

      expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
    });
  });

  describe("Form Validation", () => {
    it("should show error when email is an empty space", async () => {
      renderLoginComponent();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: " " },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      const submitBtn = screen.getByRole("button", { name: "LOGIN" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Email is invalid");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when email is invalid", async () => {
      renderLoginComponent();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "abcemail.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      const submitBtn = screen.getByRole("button", { name: "LOGIN" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Email is invalid");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when password is an empty space", async () => {
      renderLoginComponent();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: " " },
      });
      const submitBtn = screen.getByRole("button", { name: "LOGIN" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Password must be at least 8 characters long");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when password less than 8 characters", async () => {
      renderLoginComponent();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "123" },
      });
      const submitBtn = screen.getByRole("button", { name: "LOGIN" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Password must be at least 8 characters long");
      expect(axios.post).not.toHaveBeenCalled();
    });
  });
});
