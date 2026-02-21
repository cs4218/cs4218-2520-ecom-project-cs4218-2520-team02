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
      createdAt: "2024-01-01T00:00:00.000Z",
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
      createdAt: "2024-02-01T00:00:00.000Z",
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

  test("[EP] renders layout, admin menu, and title when authenticated", async () => {
    // Arrange - beforeEach sets up authenticated state and empty orders response

    // Act
    render(<AdminOrders />);
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  test("[EP] fetches and displays orders on mount when authenticated", async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });

    // Act
    render(<AdminOrders />);
    await screen.findByText("John Doe");

    // Assert
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  test("[EP] displays product details for each order", async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });

    // Act
    render(<AdminOrders />);
    await screen.findByText(mockOrders[0].products[0].name);

    // Assert
    mockOrders.forEach((order) => {
      order.products.forEach((p) => {
        expect(screen.getByText(p.name)).toBeInTheDocument();
        expect(screen.getByText(p.description.substring(0, 30))).toBeInTheDocument();
        expect(screen.getByText(`Price : ${p.price}`)).toBeInTheDocument();
      });
    });
  });

  test("[EP] handles status change and calls PUT with correct orderId and status", async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });
    mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });

    render(<AdminOrders />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(1));
    const selects = await screen.findAllByTestId("status-select");
    expect(selects).toHaveLength(mockOrders.length);

    // Act
    fireEvent.change(selects[0], { target: { value: "Processing" } });

    // Assert
    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith("/api/v1/auth/order-status/order1", {
        status: "Processing",
      });
    });
  });

  test("[EP] renders all five valid status options in the select dropdown", async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: [mockOrders[0]] } });

    // Act
    render(<AdminOrders />);
    await screen.findByTestId("status-select");

    // Assert
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

  test("[EP] displays formatted relative date for each order", async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });

    // Act
    render(<AdminOrders />);
    await screen.findAllByText("2 days ago");

    // Assert
    expect(screen.getAllByText("2 days ago")).toHaveLength(mockOrders.length);
  });

  test("[BVA] renders page chrome without order rows when orders array is empty", async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: [] } });

    // Act
    render(<AdminOrders />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

    // Assert
    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  test("[EP] handles API network error gracefully without crashing", async () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

    // Act
    render(<AdminOrders />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

    // Assert
    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    consoleSpy.mockRestore();
  });

  test("[EP] logs server error message when API returns success:false with message", async () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    mockedAxios.get.mockResolvedValueOnce({ data: { success: false, message: "Not allowed" } });

    // Act
    render(<AdminOrders />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch orders: ", "Not allowed");
    consoleSpy.mockRestore();
  });

  test("[EP] logs 'Unknown error' when API returns success:false without a message", async () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    mockedAxios.get.mockResolvedValueOnce({ data: { success: false } });

    // Act
    render(<AdminOrders />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch orders: ", "Unknown error");
    consoleSpy.mockRestore();
  });

  test("[EP] does not fetch orders when auth token is absent", async () => {
    // Arrange
    mockedUseAuth.mockReturnValue([{}, jest.fn()]);
    mockedAxios.get.mockClear();

    // Act
    render(<AdminOrders />);

    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  test("[EP] shows product images with correct src and alt attributes", async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });

    // Act
    render(<AdminOrders />);
    const img = await screen.findByAltText(mockOrders[0].products[0].name);

    // Assert
    expect(img).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${mockOrders[0].products[0]._id}`
    );
  });

  test("[EP] logs error when PUT request fails during status change", async () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: mockOrders } });
    mockedAxios.put.mockRejectedValueOnce(new Error("put failed"));

    // Act
    render(<AdminOrders />);
    const selects = await screen.findAllByTestId("status-select");
    fireEvent.change(selects[0], { target: { value: "Processing" } });

    // Assert
    await waitFor(() => expect(mockedAxios.put).toHaveBeenCalled());
    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    consoleSpy.mockRestore();
  });

  test("[EP] renders without crashing when order has no buyer or products", async () => {
    // Arrange
    const incompleteOrder = [
      {
        _id: "order-missing",
        status: "Not Processed",
        createdAt: "2024-03-01T00:00:00.000Z",
        products: undefined,
      },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: incompleteOrder } });

    // Act
    render(<AdminOrders />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

    // Assert
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  test("[EP] renders payment status as Failed when payment.success is undefined", async () => {
    // Arrange
    const orderNoPayment = [
      {
        _id: "order-nopay",
        status: "Not Processed",
        buyer: { name: "No Pay" },
        createdAt: "2024-04-01T00:00:00.000Z",
        payment: {},
        products: [],
      },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: orderNoPayment } });

    // Act
    render(<AdminOrders />);
    await screen.findByText("No Pay");

    // Assert
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  test("[EP] renders correctly when order _id is missing (falls back to index key)", async () => {
    // Arrange
    const ordersNoId = [
      {
        status: "Not Processed",
        buyer: { name: "Idx Buyer" },
        createdAt: "2024-05-01T00:00:00.000Z",
        payment: { success: true },
        products: [],
      },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, orders: ordersNoId } });

    // Act
    render(<AdminOrders />);
    await screen.findByText("Idx Buyer");

    // Assert
    expect(screen.getByText("Idx Buyer")).toBeInTheDocument();
  });
});