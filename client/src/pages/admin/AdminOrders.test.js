import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import AdminOrders from "./AdminOrders";
import axios from "axios";
import { useAuth } from "../../context/auth";

jest.mock("axios");
const mockedAxios = axios;

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));
const mockedUseAuth = useAuth;

jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("moment", () => {
  return () => ({
    fromNow: () => "2 days ago",
  });
});

jest.mock("antd", () => {
  const MockSelect = ({ children, onChange, defaultValue, bordered, ...props }) => (
    <select
      data-testid="status-select"
      onChange={(e) => onChange && onChange(e.target.value)}
      defaultValue={defaultValue}
      {...props}
    >
      {children}
    </select>
  );
  MockSelect.Option = ({ children, value }) => <option value={value}>{children}</option>;
  return { Select: MockSelect };
});

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

describe("AdminOrders Component", () => {
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("not wrapped in act")) {
        return;
      }
      return originalConsoleError.apply(console, args);
    };
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });
  const mockOrders = [
    {
      _id: "order1",
      status: "Not Process",
      buyer: { name: "John Doe" },
      createAt: "2024-01-01T00:00:00.000Z",
      payment: { success: true },
      products: [
        { _id: "prod1", name: "Product 1", description: "Description 1", price: 100 },
        { _id: "prod2", name: "Product 2", description: "Description 2", price: 200 },
      ],
    },
    {
      _id: "order2",
      status: "Shipped",
      buyer: { name: "Jane Smith" },
      createAt: "2024-02-01T00:00:00.000Z",
      payment: { success: false },
      products: [
        { _id: "prod3", name: "Product 3", description: "Description 3", price: 150 },
      ],
    },
  ];

  const mockAuth = { token: "mock-token", user: { role: 1 } };
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue([mockAuth, jest.fn()]);
    
    mockedAxios.get = mockedAxios.get || jest.fn();
    mockedAxios.put = mockedAxios.put || jest.fn();
    mockedAxios.get.mockResolvedValue({ data: { success: true, orders: [] } });
    mockedAxios.put.mockResolvedValue({ data: { success: true } });
  });

  test("renders layout, admin menu, and title", async () => {
    render(<AdminOrders />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  test("fetches and displays orders on mount when authenticated", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });

    render(<AdminOrders />);

    await screen.findByText("John Doe");

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  test("displays product details for each order", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });

    render(<AdminOrders />);
    await screen.findByText(mockOrders[0].products[0].name);

    mockOrders.forEach((order) => {
      order.products.forEach((p) => {
        expect(screen.getByText(p.name)).toBeInTheDocument();
        expect(screen.getByText(p.description.substring(0, 30))).toBeInTheDocument();
        expect(screen.getByText(`Price : ${p.price}`)).toBeInTheDocument();
      });
    });
  });

  test("handles status change correctly", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });
    mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });

    render(<AdminOrders />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(1));

    const selects = await screen.findAllByTestId("status-select");
    expect(selects).toHaveLength(mockOrders.length);

    fireEvent.change(selects[0], { target: { value: "Processing" } });

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith("/api/v1/auth/order-status/order1", {
        status: "Processing",
      });
    });
  });

  test("renders status options correctly", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: [mockOrders[0]] } });

    render(<AdminOrders />);
    await screen.findByTestId("status-select");

    const select = screen.getByTestId("status-select");
    const options = within(select).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Not Processed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ]);
  });

  test("displays correct date format", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });

    render(<AdminOrders />);
    await screen.findAllByText("2 days ago");
    expect(screen.getAllByText("2 days ago")).toHaveLength(mockOrders.length);
  });

  test("handles empty orders array", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: [] } });

    render(<AdminOrders />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  test("handles API errors gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

    render(<AdminOrders />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    consoleSpy.mockRestore();
  });
});
