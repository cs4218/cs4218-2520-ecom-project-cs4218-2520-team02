import CartPage from "./CartPage";
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";

jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children, title }) => (
    <div data-testid="layout" title={title}>
      {children}
    </div>
  ),
}));

jest.mock("../context/auth", () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

jest.mock("../context/cart", () => ({
  __esModule: true,
  useCart: jest.fn(),
}));

const renderCartPage = () =>
  render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>
  );

describe("CartPage", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue([
      { user: null, token: null },
      jest.fn(),
    ]);
    useCart.mockReturnValue([[], jest.fn()]);
  });

  it("should render without crashing", () => {
    renderCartPage();

    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

});

