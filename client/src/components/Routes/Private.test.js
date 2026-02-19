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

// mock mongoose to avoid heavy dependencies in tests
jest.mock("mongoose", () => ({ set: jest.fn() }));

jest.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet">outlet</div>,
}));

jest.mock("../Spinner", () => () => <div data-testid="spinner" />);

describe("PrivateRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders Spinner and does not call API when no auth token", () => {
    mockedUseAuth.mockReturnValue([{}, jest.fn()]);

    render(<PrivateRoute />);

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  test("calls auth API and renders Outlet when API returns ok:true", async () => {
    mockedUseAuth.mockReturnValue([{ token: "abc" }, jest.fn()]);
    mockedAxios.get.mockResolvedValueOnce({ data: { ok: true } });

    render(<PrivateRoute />);

    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth"));
    expect(await screen.findByTestId("outlet")).toBeInTheDocument();
  });

  test("calls auth API and renders Spinner when API returns ok:false", async () => {
    mockedUseAuth.mockReturnValue([{ token: "abc" }, jest.fn()]);
    mockedAxios.get.mockResolvedValueOnce({ data: { ok: false } });

    render(<PrivateRoute />);

    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth"));
    expect(await screen.findByTestId("spinner")).toBeInTheDocument();
  });
});
