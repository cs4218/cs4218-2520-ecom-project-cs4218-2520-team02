import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Layout from "../components/Layout";
import "@testing-library/jest-dom/extend-expect";
import { Helmet } from "react-helmet";

// Mock child components
jest.mock("../components/Header", () => () => <div data-testid="header" />);
jest.mock("../components/Footer", () => () => <div data-testid="footer" />);
jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

const renderLayout = () =>
  render(
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );

describe("Layout Component Unit Tests", () => {

  describe("Render Validation", () => {

    it("should render layout component with all elements", () => {

      // Arrange & Act
      render(
        <BrowserRouter>
          <Layout>
            <div data-testid="child">Test</div>
          </Layout>
        </BrowserRouter>
      );

      // Assert
      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Test")).toBeInTheDocument();
      expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });
  });

  describe("Helmet Meta Tags Validation", () => {
    it("should apply default props when none are provided", () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const helmet = Helmet.peek();
      expect(helmet.title).toBe("Ecommerce app - shop now");
      expect(helmet.metaTags).toEqual(
        expect.arrayContaining([
          { name: "description", content: "mern stack project" },
          { name: "keywords", content: "mern,react,node,mongodb" },
          { name: "author", content: "Techinfoyt" },
        ])
      );
    });

    it("should apply custom props correctly", () => {
      render(
        <BrowserRouter>
          <Layout
            title = "Title"
            description = "Description"
            keywords = "KeywordA, KeywordB"
            author= "Author"
          >
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const helmet = Helmet.peek();
      expect(helmet.title).toBe("Title");
      expect(helmet.metaTags).toEqual(
        expect.arrayContaining([
          { name: "description", content: "Description" },
          { name: "keywords", content: "KeywordA, KeywordB" },
          { name: "author", content: "Author" },
        ])
      );
    });

    it("should override only provided props while keeping defaults for others", () => {
      render(
        <BrowserRouter>
          <Layout title="Title">
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const helmet = Helmet.peek();
      expect(helmet.title).toBe("Title");
      expect(helmet.metaTags).toEqual(
        expect.arrayContaining([
          { name: "description", content: "mern stack project" },
          { name: "keywords", content: "mern,react,node,mongodb" },
          { name: "author", content: "Techinfoyt" },
        ])
      );
    });
  });
});
