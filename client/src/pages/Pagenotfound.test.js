import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Pagenotfound from "../pages/Pagenotfound";
import "@testing-library/jest-dom/extend-expect";

// Mocks
jest.mock("../context/auth", () => ({
  useAuth: () => [{ user: null, token: "" }, jest.fn()],
}));

jest.mock("../context/cart", () => ({
  useCart: () => [[], jest.fn()],
}));

jest.mock("../hooks/useCategory", () => ({
  __esModule: true,
  default: () => [],
}));

jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children, title }) => (
    <div data-testid="layout" title={title}>
      {children}
    </div>
  ),
}));

const renderPagenotfound = () =>
  render(
    <BrowserRouter>
      <Pagenotfound />
    </BrowserRouter>
  );

describe("Pagenotfound Page Unit Tests", () => {

  it("should render without crashing", () => {

    // Arrange & Act
    renderPagenotfound();

    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();

  });

  it("should pass correct title to Layout", () => {

    // Arrange & Act
    renderPagenotfound();
    
    // Assert
    expect(screen.getByTestId("layout")).toHaveAttribute("title", "go back- page not found");
  
  });

  it("should render pagenotfound page with all elements", () => {
    
    // Arrange & Act
    renderPagenotfound();

    const heading = screen.getByText("404")
    const description = screen.getByText("Oops ! Page Not Found")
    const returnLink = screen.getByText("Go Back");
    
    // Assert
    expect(heading).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(returnLink).toBeInTheDocument();
    expect(returnLink.closest("a")).toHaveAttribute("href", "/");
  
  });

});