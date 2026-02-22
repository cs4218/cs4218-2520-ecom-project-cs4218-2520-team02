// Yap Zhao Yi, A0277540B
import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Footer from "../components/Footer";
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

const renderFooter = () =>
  render(
    <BrowserRouter>
      <Footer />
    </BrowserRouter>
  );

describe("Footer Component Unit Tests", () => {

  it("should render footer page with all elements", () => {
    
    // Arrange & Act
    renderFooter();

    const copyrightText = screen.getByText(/All Rights Reserved © TestingComp/)
    const aboutLink = screen.getByText("About");
    const contactLink = screen.getByText("Contact");
    const privacyLink = screen.getByText("Privacy Policy");

    // Assert
    expect(copyrightText).toBeInTheDocument();

    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink.closest("a")).toHaveAttribute("href", "/about");

    expect(contactLink).toBeInTheDocument();
    expect(contactLink.closest("a")).toHaveAttribute("href", "/contact");
    
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink.closest("a")).toHaveAttribute("href", "/policy");
  
  });
});