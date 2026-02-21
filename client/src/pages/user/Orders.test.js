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

  test("[EP] calls API with correct endpoint when auth token exists", async () => {
    // Arrange - beforeEach sets authenticated state and mock orders response

    // Act
    render(<Orders />);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });
  });

  test("[EP] renders order data correctly when API returns orders", async () => {
    // Arrange - beforeEach provides mockOrders response

    // Act
    render(<Orders />);

    // Assert
    expect(await screen.findByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("2 days ago")).toBeInTheDocument();
  });

  test("[EP] renders product name, description, and price for each product", async () => {
    // Arrange - beforeEach provides mockOrders with one product

    // Act
    render(<Orders />);

    // Assert
    expect(await screen.findByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("This is a test description")).toBeInTheDocument();
    expect(screen.getByText("Price : 100")).toBeInTheDocument();
  });

  test("[EP] handles success:false response without crashing", async () => {
    // Arrange
    axios.get.mockResolvedValue({
      data: {
        success: false,
        message: "Failed to fetch orders",
      },
    });

    // Act
    render(<Orders />);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });
  });

  test("[EP] handles network error from API without crashing", async () => {
    // Arrange
    axios.get.mockRejectedValue(new Error("API Error"));

    // Act
    render(<Orders />);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });
  });

  test("[EP] does not call API when auth token is absent", async () => {
    // Arrange
    useAuth.mockReturnValue([{}, jest.fn()]);
    axios.get.mockClear();

    // Act
    render(<Orders />);
    await new Promise((r) => setTimeout(r, 0));

    // Assert
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("[EP] does not render orders and logs error when API returns success:false with message", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockResolvedValue({
      data: {
        success: false,
        message: "no orders",
      },
    });

    // Act
    render(<Orders />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });

    // Assert
    expect(screen.getByText("All Orders")).toBeInTheDocument();
    expect(screen.queryByText("Processing")).not.toBeInTheDocument();
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("[EP] logs error when axios throws during fetch", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValue(new Error("network"));

    // Act
    render(<Orders />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // Assert
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("[EP] renders payment status as 'Failed' when payment.success is false", async () => {
    // Arrange
    const mockOrdersFailedPayment = [
      {
        _id: "2",
        status: "Processing",
        buyer: { name: "Jane" },
        createdAt: "2024-01-02",
        payment: { success: false },
        products: [
          { _id: "p2", name: "Product 2", description: "desc", price: 50 },
        ],
      },
    ];
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    axios.get.mockResolvedValue({
      data: { success: true, orders: mockOrdersFailedPayment },
    });

    // Act
    render(<Orders />);

    // Assert
    expect(await screen.findByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });

  test("[BVA] renders order row without product cards when products array is empty", async () => {
    // Arrange
    const mockOrdersNoProducts = [
      {
        _id: "3",
        status: "Processing",
        buyer: { name: "Sam" },
        createdAt: "2024-01-03",
        payment: { success: true },
        products: [],
      },
    ];
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    axios.get.mockResolvedValue({
      data: { success: true, orders: mockOrdersNoProducts },
    });

    // Act
    render(<Orders />);

    // Assert
    expect(await screen.findByText("Sam")).toBeInTheDocument();
    expect(screen.queryByText("Price :")).not.toBeInTheDocument();
  });

  test("[EP] logs 'Unknown error' when API returns success:false without a message", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockResolvedValue({
      data: { success: false },
    });

    // Act
    render(<Orders />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });

    // Assert
    expect(consoleLogSpy).toHaveBeenCalled();
    const firstCallArgs = consoleLogSpy.mock.calls[0];
    expect(firstCallArgs.some((a) => String(a).includes("Unknown error"))).toBe(true);
    consoleLogSpy.mockRestore();
  });

  test("[EP] renders correctly when order _id is missing (falls back to index key)", async () => {
    // Arrange
    const mockOrdersNoId = [
      {
        // _id omitted intentionally
        status: "Processing",
        buyer: { name: "NoIdUser" },
        createdAt: "2024-01-04",
        payment: { success: true },
        products: [
          { _id: "px", name: "X", description: "d", price: 10 },
        ],
      },
    ];
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: { success: true, orders: mockOrdersNoId } });

    // Act
    render(<Orders />);

    // Assert
    expect(await screen.findByText("NoIdUser")).toBeInTheDocument();
  });
});