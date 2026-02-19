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

  test("unable to fetch orders gracefully", async () => {
    axios.get.mockResolvedValue({
      data: {
        success: false,
        message: "Failed to fetch orders",
      },
    });

    render(<Orders />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });
  });

  test("fails gracefully when API returns error", async () => {
    axios.get.mockRejectedValue(new Error("API Error"));

    render(<Orders />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });
  });

  test("does not call API when there is no auth token", async () => {
    // simulate no auth
    useAuth.mockReturnValue([{}, jest.fn()]); 
    axios.get.mockClear();

    render(<Orders />);

    await new Promise((r) => setTimeout(r, 0));

    expect(axios.get).not.toHaveBeenCalled();
  });

  test("handles API returning success=false", async () => {
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockResolvedValue({
        data: {
        success: false,
        message: "no orders",
        },
    });

    render(<Orders />);

    await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });

    // orders should not be rendered
    expect(screen.getByText("All Orders")).toBeInTheDocument(); 
    expect(screen.queryByText("Processing")).not.toBeInTheDocument();

    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("handles API errors (axios throws)", async () => {
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValue(new Error("network"));

    render(<Orders />);

    await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
    });

    // verify catch logged something
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("renders 'Failed' when payment.success is false", async () => {
    const mockOrdersFailedPayment = [
        {
        _id: "2",
        status: "Processing",
        buyer: { name: "Jane" },
        createdAt: "2024-01-02",
        payment: { success: false },
        products: [
            {
            _id: "p2",
            name: "Product 2",
            description: "desc",
            price: 50,
            },
        ],
        },
    ];

    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    axios.get.mockResolvedValue({
        data: {
        success: true,
        orders: mockOrdersFailedPayment,
        },
    });

    render(<Orders />);

    expect(await screen.findByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });

  test("renders when products list is empty (no product cards)", async () => {
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

    render(<Orders />);

    // Table row should exist but product card should not be found
    expect(await screen.findByText("Sam")).toBeInTheDocument();
    expect(screen.queryByText("Price :")).not.toBeInTheDocument();
  });

  test("handles API returning success=false without message (uses Unknown error)", async () => {
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockResolvedValue({
      data: {
        success: false,
      },
    });

    render(<Orders />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });

    // ensure the fallback message path was executed
    expect(consoleLogSpy).toHaveBeenCalled();
    const firstCallArgs = consoleLogSpy.mock.calls[0];
    expect(firstCallArgs.some((a) => String(a).includes("Unknown error"))).toBe(true);
    consoleLogSpy.mockRestore();
  });

  test("uses index as key when order._id is missing", async () => {
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

    render(<Orders />);

    // rendering should succeed and show buyer name
    expect(await screen.findByText("NoIdUser")).toBeInTheDocument();
  });
});
