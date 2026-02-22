// Yap Zhao Yi, A0277540B
import React from "react";
import { render, screen } from "@testing-library/react";
import Contact from "../pages/Contact";
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

jest.mock("react-icons/bi", () => ({
  BiMailSend: () => <span data-testid="mail-icon" />,
  BiPhoneCall: () => <span data-testid="phone-icon" />,
  BiSupport: () => <span data-testid="support-icon" />,
}));

describe("Contact Page Unit Tests", () => {

  it("should render without crashing", () => {

    // Arrange & Act
    render(<Contact />);

    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();

  });

  it("should pass correct title to Layout", () => {

    // Arrange & Act
    render(<Contact />);
    
    // Assert
    expect(screen.getByTestId("layout")).toHaveAttribute("title", "Contact us");
  
  });

  it("should render contact page with all elements", () => {
    
    // Arrange & Act
    render(<Contact />);

    const heading = screen.getByText("CONTACT US")
    const email = screen.getByText(/www.help@ecommerceapp.com/)
    const phoneNo = screen.getByText(/012-3456789/);
    const tollFreeNo = screen.getByText(/1800-0000-0000/)
    const description = screen.getByText(/For any query or info about product/i)
    
    // Assert
    expect(heading).toBeInTheDocument();
    expect(email).toBeInTheDocument();
    expect(phoneNo).toBeInTheDocument();
    expect(tollFreeNo).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  
  });

  it("should render contact image with correct attributes", () => {

    // Arrange & Act
    render(<Contact />);
    
    const image = screen.getByAltText("contactus");

    // Assert
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/images/contactus.jpeg");
  
  });

  it("should render all contact icons", () => {

    // Arrange & Act
    render(<Contact />);

    // Assert
    expect(screen.getByTestId("mail-icon")).toBeInTheDocument();
    expect(screen.getByTestId("phone-icon")).toBeInTheDocument();
    expect(screen.getByTestId("support-icon")).toBeInTheDocument();
  });

});