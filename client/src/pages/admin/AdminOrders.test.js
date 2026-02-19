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
});
