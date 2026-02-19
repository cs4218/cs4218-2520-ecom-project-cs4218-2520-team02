import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Dashboard from "./Dashboard";
const { useAuth } = require("../../context/auth");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

jest.mock("../../components/UserMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="user-menu">User Menu</div>,
}));

describe("Dashboard Component", () => {
  const mockAuth = {
    user: {
      name: "John Doe",
      email: "john@example.com",
      address: "New York",
    },
  };

  beforeEach(() => {
    useAuth.mockReturnValue([mockAuth]);
  });

  test("renders user information", () => {
    render(<Dashboard />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("New York")).toBeInTheDocument();
  });

  test("renders UserMenu component", () => {
    render(<Dashboard />);
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  });

  test("renders inside Layout component", () => {
    render(<Dashboard />);
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });
});
