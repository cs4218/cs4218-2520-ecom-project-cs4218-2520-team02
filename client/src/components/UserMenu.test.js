import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import UserMenu from "./UserMenu";

const mockUserMenu = (
  <MemoryRouter>
    <UserMenu />
  </MemoryRouter>
);

describe("UserMenu Component", () => {
  test("renders dashboard heading", () => {
    render(mockUserMenu);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  test("renders Profile link with correct path", () => {
    render(mockUserMenu);

    const profileLink = screen.getByText("Profile");
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute(
      "href",
      "/dashboard/user/profile"
    );
  });

  test("renders Orders link with correct path", () => {
    render(mockUserMenu);

    const ordersLink = screen.getByText("Orders");
    expect(ordersLink).toBeInTheDocument();
    expect(ordersLink).toHaveAttribute(
      "href",
      "/dashboard/user/orders"
    );
  });
});
