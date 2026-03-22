// Gavin Sin Fu Chen, A0273285X
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

import Profile from "./Profile";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("axios");

jest.mock("../../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return { ...actual, useNavigate: () => jest.fn() };
});

const renderProfilePage = () => {
  render(
    <MemoryRouter initialEntries={["/dashboard/user/profile"]}>
      <AuthProvider>
        <SearchProvider>
          <CartProvider>
            <Routes>
              <Route path="/dashboard/user/profile" element={<Profile />} />
              <Route
                path="/dashboard/user/orders"
                element={<div data-testid="orders-page">Orders Page</div>}
              />
              <Route path="*" element={<div />} />
            </Routes>
          </CartProvider>
        </SearchProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

function seedLocalStorage({ auth = null } = {}) {
  if (auth) {
    localStorage.setItem("auth", JSON.stringify(auth));
  }
}

const sampleUser = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "1234567890",
  address: "123 Main St",
};

describe("Profile Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("render user profile with auth context", async () => {
    // Arrange
    seedLocalStorage({ auth: { user: sampleUser, token: "valid-token" } });
    renderProfilePage();

    // Assert
    expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue(
      "John Doe",
    );
    expect(screen.getByPlaceholderText("Enter Your Email")).toHaveValue(
      "john.doe@example.com",
    );
    expect(screen.getByPlaceholderText("Enter Your Phone")).toHaveValue(
      "1234567890",
    );
    expect(screen.getByPlaceholderText("Enter Your Address")).toHaveValue(
      "123 Main St",
    );
  });

  it("render user profile with no user context", async () => {
    // Arrange
    seedLocalStorage({ auth: { user: null, token: "valid-token" } });
    renderProfilePage();

    // Assert
    expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue("");
    expect(screen.getByPlaceholderText("Enter Your Email")).toHaveValue("");
    expect(screen.getByPlaceholderText("Enter Your Phone")).toHaveValue("");
    expect(screen.getByPlaceholderText("Enter Your Address")).toHaveValue("");
  });

  it("update user profile successfully", async () => {
    // Arrange
    axios.put.mockResolvedValueOnce({
      data: {
        updatedUser: {
          name: "Updated John",
          email: "john.doe@example.com",
          phone: "1234567890",
          address: "123 Main St",
        },
      },
    });
    seedLocalStorage({ auth: { user: sampleUser, token: "valid-token" } });
    renderProfilePage();

    // Act
    // Wait for form to be populated.
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue(
        "John Doe",
      ),
    );
    // Change the name field.
    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
      target: { value: "Updated John" },
    });
    fireEvent.click(screen.getByText("UPDATE"));

    // Assert
    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
        name: "Updated John",
        email: "john.doe@example.com",
        password: "",
        phone: "1234567890",
        address: "123 Main St",
      }),
    );
  });
});
