import React from "react";
import { render, screen } from "@testing-library/react";
import AdminDashboard from "./AdminDashboard";
import { useAuth } from "../../context/auth";

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));
jest.mock("../../components/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});
jest.mock("../../components/AdminMenu", () => {
  return function MockAdminMenu() {
    return <div data-testid="admin-menu">Admin Menu</div>;
  };
});

describe("AdminDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without user data", () => {
    useAuth.mockReturnValue([{ user: null, token: null }]);

    render(<AdminDashboard />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
  });

  it("should render with admin user data", () => {
    useAuth.mockReturnValue([
      {
        user: {
          name: "testAdmin",
          email: "admin@test.com",
          phone: "12345678",
        },
        token: "testToken",
      },
    ]);

    render(<AdminDashboard />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    expect(screen.getByText("Admin Name : testAdmin")).toBeInTheDocument();
    expect(
      screen.getByText("Admin Email : admin@test.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("Admin Contact : 12345678")).toBeInTheDocument();
  });
});
