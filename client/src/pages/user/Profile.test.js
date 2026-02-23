import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import Profile from "./Profile";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";
import { setAuth } from "../../context/auth";

jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../../components/UserMenu", () => () => <div>UserMenu</div>);
jest.mock("./../../components/Layout", () => ({ children }) => (
  <div>{children}</div>
));

const mockUser = {
  name: "testUser",
  email: "test@example.com",
  phone: "12345678",
  address: "abc",
};

jest.mock("../../context/auth", () => {
  const setAuth = jest.fn();
  return {
    useAuth: () => [{ user: mockUser }, setAuth],
    setAuth,
  };
});

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Profile Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockImplementation(() =>
      JSON.stringify({ user: mockUser }),
    );
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("renders profile form with user data", () => {
    const { getByPlaceholderText } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(getByPlaceholderText("Enter Your Name").value).toBe("testUser");
    expect(getByPlaceholderText("Enter Your Email").value).toBe(
      "test@example.com",
    );
    expect(getByPlaceholderText("Enter Your Password").value).toBe("");
    expect(getByPlaceholderText("Enter Your Email")).toBeDisabled();
    expect(getByPlaceholderText("Enter Your Phone").value).toBe("12345678");
    expect(getByPlaceholderText("Enter Your Address").value).toBe("abc");
  });

  it("able to update form fields", () => {
    const { getByPlaceholderText } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "New Name" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "12345679" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "abc 2" },
    });

    expect(getByPlaceholderText("Enter Your Name").value).toBe("New Name");
    expect(getByPlaceholderText("Enter Your Password").value).toBe(
      "password123",
    );
    expect(getByPlaceholderText("Enter Your Phone").value).toBe("12345679");
    expect(getByPlaceholderText("Enter Your Address").value).toBe("abc 2");
  });

  it("should handles profile update successfully", async () => {
    axios.put.mockResolvedValueOnce({
      data: { updatedUser: { ...mockUser, name: "Updated Name" } },
    });
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "Updated Name" },
    });
    fireEvent.click(getByText("UPDATE"));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/profile",
        expect.objectContaining({
          name: "Updated Name",
          email: "test@example.com",
          phone: "12345678",
          address: "abc",
        }),
      );

      expect(setAuth).toHaveBeenCalled();
      expect(localStorage.setItem).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Profile Updated Successfully",
      );
    });
  });

  it("shows error toast on API error", async () => {
    axios.put.mockRejectedValueOnce(new Error("API Error"));

    const { getByText } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    fireEvent.click(getByText("UPDATE"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });

  it("shows error toast when API returns error in response body", async () => {
    axios.put.mockResolvedValueOnce({
      data: { error: "Profile update failed" },
    });

    const { getByText } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    fireEvent.click(getByText("UPDATE"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Profile update failed");
    });
  });
});
