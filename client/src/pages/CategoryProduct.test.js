// Jovin Ang Yusheng, A0273460H
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoryProduct from "./CategoryProduct";
import axios from "axios";
import toast from "react-hot-toast";

// =============== Mocks ===============
jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
const mockParams = { slug: "electronics" };
const mockSetCart = jest.fn();
let mockCart = [];

jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
}));

jest.mock("../context/cart", () => ({
    useCart: () => [mockCart, mockSetCart],
}));

jest.mock("../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

// =============== Mock data ===============
const mockCategory = { _id: "1", name: "Electronics", slug: "electronics" };

const mockProducts = [
    {
        _id: "1",
        name: "Laptop",
        description:
            "A laptop for developers and designers with many great features included",
        price: 999.99,
        slug: "laptop",
    },
    {
        _id: "2",
        name: "Phone",
        description: "A smartphone with excellent camera",
        price: 499.5,
        slug: "phone",
    },
];

function setupAxiosMocks({
    products = mockProducts,
    category = mockCategory,
    error = false,
} = {}) {
    axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/product-category/")) {
            if (error) return Promise.reject(new Error("Fetch error"));
            return Promise.resolve({ data: { products, category } });
        }
        return Promise.reject(new Error(`Unhandled GET: ${url}`));
    });
}

async function waitForProductsLoaded() {
    await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
    });
}

describe("CategoryProduct Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockParams.slug = "electronics";
        mockCart = [];
        Storage.prototype.setItem = jest.fn();
    });

    describe("rendering", () => {
        test("renders layout", async () => {
            setupAxiosMocks();
            render(<CategoryProduct />);

            expect(screen.getByTestId("layout")).toBeInTheDocument();
        });

        test("renders category name in heading", async () => {
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitForProductsLoaded();

            expect(
                screen.getByText(/Category - Electronics/i)
            ).toBeInTheDocument();
        });

        test("renders result count", async () => {
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitForProductsLoaded();

            expect(screen.getByText(/2 result found/i)).toBeInTheDocument();
        });
    });

    describe("fetching data on mount", () => {
        test("fetches products by category slug on mount", async () => {
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith(
                    "/api/v1/product/product-category/electronics"
                );
            });
        });

        test("does not fetch when slug is falsy", async () => {
            mockParams.slug = undefined;
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitFor(() => {
                expect(axios.get).not.toHaveBeenCalled();
            });
        });

        test("renders product cards with names", async () => {
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitForProductsLoaded();

            expect(screen.getByText("Laptop")).toBeInTheDocument();
            expect(screen.getByText("Phone")).toBeInTheDocument();
        });

        test("renders product images with correct src and alt", async () => {
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitForProductsLoaded();

            const img1 = screen.getByAltText("Laptop");
            expect(img1).toHaveAttribute(
                "src",
                "/api/v1/product/product-photo/1"
            );

            const img2 = screen.getByAltText("Phone");
            expect(img2).toHaveAttribute(
                "src",
                "/api/v1/product/product-photo/2"
            );
        });

        test("renders formatted prices", async () => {
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitForProductsLoaded();

            expect(screen.getByText("$999.99")).toBeInTheDocument();
            expect(screen.getByText("$499.50")).toBeInTheDocument();
        });

        test("truncates descriptions to 60 characters", async () => {
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitForProductsLoaded();

            const truncated = mockProducts[0].description.substring(0, 60);
            expect(
                screen.getByText(`${truncated}...`)
            ).toBeInTheDocument();
        });

        test("renders empty list when API returns empty products", async () => {
            setupAxiosMocks({ products: [] });
            render(<CategoryProduct />);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalled();
            });

            await waitFor(() => {
                expect(screen.getByText(/0 result found/i)).toBeInTheDocument();
            });

            expect(
                screen.queryByRole("button", { name: /more details/i })
            ).not.toBeInTheDocument();
        });

        test("handles API response with undefined products and category", async () => {
            axios.get.mockResolvedValueOnce({ data: {} });
            render(<CategoryProduct />);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalled();
            });

            expect(
                screen.queryByRole("button", { name: /more details/i })
            ).not.toBeInTheDocument();
        });

        test("logs error when fetch fails", async () => {
            const consoleSpy = jest
                .spyOn(console, "log")
                .mockImplementation();
            setupAxiosMocks({ error: true });
            render(<CategoryProduct />);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            });

            consoleSpy.mockRestore();
        });
    });

    describe("navigation", () => {
        test("navigates to product detail page on More Details click", async () => {
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitForProductsLoaded();

            const buttons = screen.getAllByRole("button", {
                name: /more details/i,
            });
            await userEvent.click(buttons[0]);

            expect(mockNavigate).toHaveBeenCalledWith("/product/laptop");
        });

        test("navigates to correct product when clicking second product", async () => {
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitForProductsLoaded();

            const buttons = screen.getAllByRole("button", {
                name: /more details/i,
            });
            await userEvent.click(buttons[1]);

            expect(mockNavigate).toHaveBeenCalledWith("/product/phone");
        });
    });

    describe("add to cart", () => {
        test("adds product to cart, updates localStorage, and shows toast", async () => {
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitForProductsLoaded();

            const addButtons = screen.getAllByRole("button", {
                name: /add to cart/i,
            });
            await userEvent.click(addButtons[0]);

            expect(mockSetCart).toHaveBeenCalledWith([mockProducts[0]]);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                "cart",
                JSON.stringify([mockProducts[0]])
            );
            expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
        });

        test("appends to existing cart items", async () => {
            const existingItem = { _id: "existing", name: "Existing" };
            mockCart = [existingItem];
            setupAxiosMocks();
            render(<CategoryProduct />);

            await waitForProductsLoaded();

            const addButtons = screen.getAllByRole("button", {
                name: /add to cart/i,
            });
            await userEvent.click(addButtons[1]);

            expect(mockSetCart).toHaveBeenCalledWith([
                existingItem,
                mockProducts[1],
            ]);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                "cart",
                JSON.stringify([existingItem, mockProducts[1]])
            );
            expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
        });
    });
});
