// Yap Zhao Yi, A0277540B
import React from "react";
import { render, screen } from "@testing-library/react";
import About from "../pages/About";
import "@testing-library/jest-dom/extend-expect";

// Mocks
jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children, title }) => (
    <div data-testid="layout" title={title}>
      {children}
    </div>
  ),
}));

describe("About Page Unit Tests", () => {

  it("should render without crashing", () => {

    // Arrange & Act
    render(<About />);

    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();

  });

  it("should pass correct title to Layout", () => {

    // Arrange & Act
    render(<About />);
    
    // Assert
    expect(screen.getByTestId("layout")).toHaveAttribute("title", "About us - Ecommerce app");
  
  });

  it("should render about page with all elements", () => {
    
    // Arrange & Act
    render(<About />);

    // Assert
    expect(screen.getByText("Add text")).toBeInTheDocument();
  
  });

  it("should render about image with correct attributes", () => {

    // Arrange & Act
    render(<About />);
    
    const image = screen.getByAltText("contactus");

    // Assert
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/images/about.jpeg");
  
  });
});