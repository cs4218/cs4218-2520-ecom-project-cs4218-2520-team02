import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { useAuth } from "../../context/auth";
import PrivateRoute from "./Private";

jest.mock("axios");
const mockedAxios = axios;

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));
const mockedUseAuth = useAuth;

jest.mock("mongoose", () => ({ set: jest.fn() }));

jest.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet">outlet</div>,
}));

jest.mock("../Spinner", () => () => <div data-testid="spinner" />);

describe("PrivateRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("[EP] renders Spinner and does not call API when auth token is absent", () => {
    // Arrange
    mockedUseAuth.mockReturnValue([{}, jest.fn()]);

    // Act
    render(<PrivateRoute />);

    // Assert
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  test("[EP] renders Outlet when token is present and API confirms authentication", async () => {
    // Arrange
    mockedUseAuth.mockReturnValue([{ token: "abc" }, jest.fn()]);
    mockedAxios.get.mockResolvedValueOnce({ data: { ok: true } });

    // Act
    render(<PrivateRoute />);

    // Assert
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth"));
    expect(await screen.findByTestId("outlet")).toBeInTheDocument();
  });

  test("[EP] renders Spinner when token is present but API returns ok:false", async () => {
    // Arrange
    mockedUseAuth.mockReturnValue([{ token: "abc" }, jest.fn()]);
    mockedAxios.get.mockResolvedValueOnce({ data: { ok: false } });

    // Act
    render(<PrivateRoute />);

    // Assert
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth"));
    expect(await screen.findByTestId("spinner")).toBeInTheDocument();
  });

  test("[EP] renders Spinner when token is present but API call fails with a network error", async () => {
    // Arrange
    mockedUseAuth.mockReturnValue([{ token: "abc" }, jest.fn()]);
    mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

    // Act
    render(<PrivateRoute />);

    // Assert
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth"));
    expect(await screen.findByTestId("spinner")).toBeInTheDocument();
  });

  test("[EP] renders Spinner initially before API response resolves", async () => {
    // Arrange (note: API is deliberately left pending to observe the initial loading state)
    mockedUseAuth.mockReturnValue([{ token: "abc" }, jest.fn()]);
    mockedAxios.get.mockReturnValueOnce(new Promise(() => {}));

    // Act
    render(<PrivateRoute />);

    // Assert - Spinner should be visible before the promise resolves
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
  });
});