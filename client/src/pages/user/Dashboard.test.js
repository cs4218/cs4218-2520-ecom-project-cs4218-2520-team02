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

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("[EP] renders user name, email, and address when auth user is populated", () => {
    // Arrange - beforeEach provides full mockAuth with name, email, and address

    // Act
    render(<Dashboard />);

    // Assert
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("New York")).toBeInTheDocument();
  });

  test("[EP] renders UserMenu component", () => {
    // Arrange - beforeEach provides authenticated state

    // Act
    render(<Dashboard />);

    // Assert
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  });

  test("[EP] renders inside Layout component", () => {
    // Arrange - beforeEach provides authenticated state

    // Act
    render(<Dashboard />);

    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  test("[EP] renders without crashing when auth user is null", () => {
    // Arrange
    useAuth.mockReturnValue([{ user: null }]);

    // Act
    render(<Dashboard />);

    // Assert 
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });

  test("[EP] renders without crashing when auth is an empty object", () => {
    // Arrange
    useAuth.mockReturnValue([{}]);

    // Act
    render(<Dashboard />);

    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });
});