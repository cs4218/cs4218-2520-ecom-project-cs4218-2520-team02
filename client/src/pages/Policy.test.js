// Yap Zhao Yi, A0277540B
import React from "react";
import { render, screen } from "@testing-library/react";
import Policy from "./Policy";
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

describe("Policy Page Unit Tests", () => {

  it("should render without crashing", () => {
    
    // Arrange & Act
    render(<Policy />);

    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();
 
  });

  it("should pass the correct title to Layout", () => {
   
    // Arrange & Act
    render(<Policy />);

    // Assert
    expect(screen.getByTestId("layout")).toHaveAttribute("title", "Privacy Policy");

  });

  it("should render policy page with all elements", () => {
    
    // Arrange & Act
    render(<Policy />);

    const policyTexts = screen.getAllByText("add privacy policy");

    // Assert
    expect(policyTexts).toHaveLength(7);
  
  });

  it("should render policy image with correct attributes", () => {
    
    // Arrange & Act
    render(<Policy />);

    const image = screen.getByAltText("contactus");

    // Assert
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/images/contactus.jpeg");
    expect(image).toHaveStyle({ width: "100%" });
  });
});
