// Song Jia Hui A0259494L
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import UserMenu from "./UserMenu";

const renderUserMenu = () =>
  render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>
  );

describe("UserMenu Component", () => {
  test("[EP] renders Dashboard heading", () => {
    // Arrange - no external dependencies, component is self-contained

    // Act
    renderUserMenu();

    // Assert
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  test("[EP] renders Profile link with correct path", () => {
    // Arrange - no external dependencies

    // Act
    renderUserMenu();

    // Assert
    const profileLink = screen.getByText("Profile");
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute("href", "/dashboard/user/profile");
  });

  test("[EP] renders Orders link with correct path", () => {
    // Arrange - no external dependencies

    // Act
    renderUserMenu();

    // Assert
    const ordersLink = screen.getByText("Orders");
    expect(ordersLink).toBeInTheDocument();
    expect(ordersLink).toHaveAttribute("href", "/dashboard/user/orders");
  });

  test("[EP] renders exactly two navigation links", () => {
    // Arrange - no external dependencies

    // Act
    renderUserMenu();

    // Assert
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
  });
});