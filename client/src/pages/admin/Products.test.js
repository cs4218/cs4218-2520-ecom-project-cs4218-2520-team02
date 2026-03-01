// Jovin Ang Yusheng, A0273460H
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Products from "./Products";
import axios from "axios";
import toast from "react-hot-toast";

// =============== Mocks ===============
jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    Link: ({ to, children, ...props }) => (
        <a href={to} {...props}>
            {children}
        </a>
    ),
}));

jest.mock("./../../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));
jest.mock("./../../components/AdminMenu", () => () => (
    <div data-testid="admin-menu" />
));

// =============== Mock data ===============
const mockProducts = [
    {
        _id: "1",
        name: "Test Product",
        description: "A bestselling test product",
        slug: "test-product",
    },
    {
        _id: "2",
        name: "Test Product 2",
        description: "Another test product",
        slug: "test-product-2",
    },
];

function setupAxiosMocks({ products = mockProducts, error = false } = {}) {
    axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product")) {
            if (error) return Promise.reject(new Error("Fetch error"));
            return Promise.resolve({ data: { products } });
        }
        return Promise.reject(new Error(`Unhandled GET: ${url}`));
    });
}

describe("Products Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("rendering", () => {
        test("renders layout and admin menu", async () => {
            setupAxiosMocks();
            render(<Products />);

            expect(screen.getByTestId("layout")).toBeInTheDocument();
            expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
        });

        test("renders heading", async () => {
            setupAxiosMocks();
            render(<Products />);

            expect(
                screen.getByRole("heading", { name: /all products list/i })
            ).toBeInTheDocument();
        });
    });

    describe("fetching data on mount", () => {
        test("fetches all products on mount", async () => {
            setupAxiosMocks();
            render(<Products />);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith(
                    "/api/v1/product/get-product"
                );
            });
        });

        test("renders product cards with names and descriptions", async () => {
            setupAxiosMocks();
            render(<Products />);

            await waitFor(() => {
                expect(screen.getByText("Test Product")).toBeInTheDocument();
                expect(screen.getByText("Test Product 2")).toBeInTheDocument();
            });

            expect(
                screen.getByText("A bestselling test product")
            ).toBeInTheDocument();
            expect(
                screen.getByText("Another test product")
            ).toBeInTheDocument();
        });

        test("renders product images with correct src and alt", async () => {
            setupAxiosMocks();
            render(<Products />);

            await waitFor(() => {
                const img1 = screen.getByAltText("Test Product");
                expect(img1).toHaveAttribute(
                    "src",
                    "/api/v1/product/product-photo/1"
                );

                const img2 = screen.getByAltText("Test Product 2");
                expect(img2).toHaveAttribute(
                    "src",
                    "/api/v1/product/product-photo/2"
                );
            });
        });

        test("renders links to product update pages", async () => {
            setupAxiosMocks();
            render(<Products />);

            await waitFor(() => {
                const links = screen.getAllByRole("link");
                expect(links).toHaveLength(2);
                expect(links[0]).toHaveAttribute(
                    "href",
                    "/dashboard/admin/product/test-product"
                );
                expect(links[1]).toHaveAttribute(
                    "href",
                    "/dashboard/admin/product/test-product-2"
                );
            });
        });

        test("renders empty list when API returns empty array", async () => {
            setupAxiosMocks({ products: [] });
            render(<Products />);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith(
                    "/api/v1/product/get-product"
                );
            });

            expect(screen.queryByRole("link")).not.toBeInTheDocument();
        });

        test("handles API response with undefined products gracefully", async () => {
            axios.get.mockResolvedValueOnce({ data: {} });
            render(<Products />);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith(
                    "/api/v1/product/get-product"
                );
            });

            expect(screen.queryByRole("link")).not.toBeInTheDocument();
        });

        test("logs error and shows toast when fetch fails", async () => {
            const consoleSpy = jest
                .spyOn(console, "log")
                .mockImplementation();
            setupAxiosMocks({ error: true });
            render(<Products />);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    "Something went wrong"
                );
            });

            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            consoleSpy.mockRestore();
        });
    });
});
