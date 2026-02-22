// Yap Zhao Yi, A0277540B
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Spinner from "../components/Spinner";
import "@testing-library/jest-dom/extend-expect";

// Mock react-router hooks
const mockNavigate = jest.fn();
const mockLocation = { pathname: "/current" };

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

const renderSpinner = (path) =>
  act(() => {
    render(
      <BrowserRouter>
        <Spinner path = {path}/>
      </BrowserRouter>
    );
  });

describe("Spinner Component Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("should render with all elements and correct count", () => {

    // Arrange & Act
    renderSpinner();

    // Assert
    expect(screen.getByText(/redirecting to you in 3 second/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should decrease count every second", () => {
    
    // Arrange
    renderSpinner();

    // Assert
    expect(screen.getByText(/redirecting to you in 3 second/i)).toBeInTheDocument();

    // Act
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Assert
    expect(screen.getByText(/redirecting to you in 2 second/i)).toBeInTheDocument();

    // Act
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Assert
    expect(screen.getByText(/redirecting to you in 0 second/i)).toBeInTheDocument();
  });

  it("should call navigate when count reaches 0 with default path", () => {
   
    // Arrange
    renderSpinner();

    // Act
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: mockLocation.pathname });
  });

  it("should call navigate when count reaches 0 with custom path", () => {
    renderSpinner("custom");

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/custom", { state: mockLocation.pathname });
  });
});
