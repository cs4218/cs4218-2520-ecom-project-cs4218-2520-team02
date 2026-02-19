import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Orders from "./Orders";
import axios from "axios";
const { useAuth } = require("../../context/auth");

jest.mock("axios");

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

jest.mock("moment", () => () => ({
  fromNow: () => "2 days ago",
}));

describe("Orders Component", () => {
  const mockAuth = {
    token: "mock-token",
  };

  const mockOrders = [
    {
      _id: "1",
      status: "Processing",
      buyer: { name: "John Doe" },
      createdAt: "2024-01-01",
      payment: { success: true },
      products: [
        {
          _id: "p1",
          name: "Product 1",
          description: "This is a test description",
          price: 100,
        },
      ],
    },
  ];

  beforeEach(() => {
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    axios.get.mockResolvedValue({
      data: {
        success: true,
        orders: mockOrders,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test("calls API when token exists", async () => {
    render(<Orders />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });
  });

  test("renders order data correctly", async () => {
    render(<Orders />);

    expect(await screen.findByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("2 days ago")).toBeInTheDocument();
  });

  test("renders product details", async () => {
    render(<Orders />);

    expect(await screen.findByText("Product 1")).toBeInTheDocument();
    expect(
      screen.getByText("This is a test description")
    ).toBeInTheDocument();
    expect(screen.getByText("Price : 100")).toBeInTheDocument();
  });
});
