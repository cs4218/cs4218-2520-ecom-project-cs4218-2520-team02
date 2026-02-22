import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminMenu from "./AdminMenu";

const renderAdminMenu = () => {
  return render(
    <BrowserRouter>
      <AdminMenu />
    </BrowserRouter>,
  );
};

describe("Admin Menu Component", () => {
  it("should render all navigation links", () => {
    renderAdminMenu();

    expect(screen.getByText("Create Category")).toBeInTheDocument();
    expect(screen.getByText("Create Product")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
  });

  it("should has correct href for Create Category link", () => {
    renderAdminMenu();
    const createCategoryLink = screen.getByText("Create Category");
    expect(createCategoryLink).toHaveAttribute(
      "href",
      "/dashboard/admin/create-category",
    );
  });

  it("should has correct href for Create Product link", () => {
    renderAdminMenu();
    const createProductLink = screen.getByText("Create Product");
    expect(createProductLink).toHaveAttribute(
      "href",
      "/dashboard/admin/create-product",
    );
  });

  it("should has correct href for Products link", () => {
    renderAdminMenu();
    const productsLink = screen.getByText("Products");
    expect(productsLink).toHaveAttribute("href", "/dashboard/admin/products");
  });

  it("should has correct href for Orders link", () => {
    renderAdminMenu();
    const ordersLink = screen.getByText("Orders");
    expect(ordersLink).toHaveAttribute("href", "/dashboard/admin/orders");
  });

  it("should has correct href for Users link", () => {
    renderAdminMenu();
    const usersLink = screen.getByText("Users");
    expect(usersLink).toHaveAttribute("href", "/dashboard/admin/users");
  });
});
