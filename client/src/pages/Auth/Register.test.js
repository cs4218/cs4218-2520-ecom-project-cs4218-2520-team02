import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Register from "./Register";

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

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

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

const renderRegisterComponent = () => {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </MemoryRouter>,
  );
};

const fillValidForm = () => {
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

describe("Register Component", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => restoreConsole());

  describe("Rendering and Form Submission", () => {
    it("should render register form with all fields", async () => {
      renderRegisterComponent();

      expect(
        screen.getByPlaceholderText("Enter Your Name"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter Your Email"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter Your Password"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter Your Phone"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter Your Address"),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter Your DOB")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("What Is Your Favorite Sport"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "REGISTER" }),
      ).toBeInTheDocument();
    });

    it("should register form to be initially empty", async () => {
      renderRegisterComponent();

      expect(screen.getByPlaceholderText("Enter Your Name").value).toBe("");
      expect(screen.getByPlaceholderText("Enter Your Email").value).toBe("");
      expect(screen.getByPlaceholderText("Enter Your Password").value).toBe("");
      expect(screen.getByPlaceholderText("Enter Your Phone").value).toBe("");
      expect(screen.getByPlaceholderText("Enter Your Address").value).toBe("");
      expect(screen.getByPlaceholderText("Enter Your DOB").value).toBe("");
      expect(
        screen.getByPlaceholderText("What Is Your Favorite Sport").value,
      ).toBe("");
    });

    it("should register the user successfully", async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      renderRegisterComponent();
      fillValidForm();

      fireEvent.click(screen.getByText("REGISTER"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith(
        "Register Successfully, please login",
      );
    });

    it("should display error message on failed registration", async () => {
      axios.post.mockRejectedValueOnce({ message: "User already exists" });

      renderRegisterComponent();
      fillValidForm();

      fireEvent.click(screen.getByText("REGISTER"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });

    it("should display API error message on failed registration", async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "User already exists" },
      });

      renderRegisterComponent();
      fillValidForm();

      fireEvent.click(screen.getByText("REGISTER"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("User already exists");
    });

    it("should clear error when user starts typing in name field", async () => {
      renderRegisterComponent();
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);
      await screen.findByText("Name is required");
      fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
        target: { value: "a" },
      });

      expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    });
  });

  describe("Form Field Validation", () => {
    it("should show error when name is an empty space", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
        target: { value: " " },
      });
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Name is required");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when email does not have @ symbol", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "abcemail.com" },
      });
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Email is invalid");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when email have multiple @ symbols", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "abc@ema@il.com" },
      });
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Email is invalid");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when email have no string in front of @ symbol", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "@email.com" },
      });
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Email is invalid");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when email have no string behind @ symbol", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "a@" },
      });
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Email is invalid");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when password less than 8 characters", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "123" },
      });
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Password must be at least 8 characters long");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when password is 7 characters (below minimum)", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "1234567 " },
      });
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Password must be at least 8 characters long");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should allow registration when password is exactly 8 characters (at boundary)", async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "12345678" },
      });

      fireEvent.click(screen.getByText("REGISTER"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith(
        "Register Successfully, please login",
      );
    });

    it("should allow registration when password is 9 characters (above minimum)", async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "123456789" },
      });

      fireEvent.click(screen.getByText("REGISTER"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith(
        "Register Successfully, please login",
      );
    });

    it("should show error when phone is an empty space", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
        target: { value: " " },
      });
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Phone is required");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when address is an empty space", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
        target: { value: " " },
      });
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Address is required");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when DOB is an empty space", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
        target: { value: " " },
      });
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Date of Birth is required");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when DOB is a future date", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
        target: { value: "2030-01-01" },
      });
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Date of Birth cannot be in the future");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should show error when Answer is an empty space", async () => {
      renderRegisterComponent();
      fillValidForm();
      fireEvent.change(
        screen.getByPlaceholderText("What Is Your Favorite Sport"),
        {
          target: { value: " " },
        },
      );
      const submitBtn = screen.getByRole("button", { name: "REGISTER" });
      submitBtn.closest("form").noValidate = true;

      fireEvent.click(submitBtn);

      await screen.findByText("Answer is required");
      expect(axios.post).not.toHaveBeenCalled();
    });
  });
});
