// Jovin Ang Yusheng, A0273460H
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Products from "./Products";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import toast from "react-hot-toast";

// =============== Mocks ===============
jest.mock("axios");
jest.mock("react-hot-toast", () => ({
    __esModule: true,
    default: {
        success: jest.fn(),
        error: jest.fn(),
    },
    Toaster: () => <div data-testid="toaster" />,
}));
jest.mock("../../hooks/useCategory", () => ({
    __esModule: true,
    default: jest.fn(() => []),
}));

// =============== Mock data ===============
const mockProducts = [
    {
        _id: "1",
        name: "Wireless Keyboard",
        slug: "wireless-keyboard",
        description: "A sleek wireless keyboard with mechanical switches",
    },
    {
        _id: "2",
        name: "Gaming Mouse",
        slug: "gaming-mouse",
        description: "High-precision gaming mouse with RGB lighting",
    },
];

// =============== Helpers ===============
const UpdateProductStub = () => <div data-testid="update-product-page">Update Product Page</div>;

const renderProducts = (initialEntries = ["/dashboard/admin/products"]) => {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <AuthProvider>
                <SearchProvider>
                    <CartProvider>
                        <Routes>
                            <Route path="/dashboard/admin/products" element={<Products />} />
                            <Route path="/dashboard/admin/product/:slug" element={<UpdateProductStub />} />
                        </Routes>
                    </CartProvider>
                </SearchProvider>
            </AuthProvider>
        </MemoryRouter>
    );
};

// =============== Tests ===============
describe("Admin Products Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        console.log.mockRestore();
        localStorage.clear();
    });

    test("retrieves and displays all products with correct details and links", async () => {
        axios.get.mockResolvedValue({
            data: { products: mockProducts },
        });

        renderProducts();

        expect(await screen.findByText("Wireless Keyboard")).toBeInTheDocument();
        expect(screen.getByText("All Products List")).toBeInTheDocument();
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");

        const cards = document.querySelectorAll(".card");
        expect(cards).toHaveLength(mockProducts.length);

        for (const product of mockProducts) {
            expect(screen.getByText(product.name)).toBeInTheDocument();
            expect(screen.getByText(product.description)).toBeInTheDocument();

            const img = screen.getByAltText(product.name);
            expect(img).toHaveAttribute(
                "src",
                `/api/v1/product/product-photo/${product._id}`
            );

            const link = screen.getByRole("link", { name: new RegExp(product.name) });
            expect(link).toHaveAttribute(
                "href",
                `/dashboard/admin/product/${product.slug}`
            );
        }
    });

    test("clicking a product card navigates to the product update page", async () => {
        axios.get.mockResolvedValue({
            data: { products: mockProducts },
        });

        renderProducts();

        expect(await screen.findByText("Wireless Keyboard")).toBeInTheDocument();

        act(() => {
            userEvent.click(screen.getByRole("link", {name: /Wireless Keyboard/}));
        });

        expect(screen.getByTestId("update-product-page")).toBeInTheDocument();
        expect(screen.queryByText("All Products List")).not.toBeInTheDocument();
    });

    test("renders heading with no product cards when API returns empty list", async () => {
        axios.get.mockResolvedValue({
            data: { products: [] },
        });

        renderProducts();

        expect(await screen.findByText("All Products List")).toBeInTheDocument();

        const cards = document.querySelectorAll(".card");
        expect(cards).toHaveLength(0);
        expect(toast.error).not.toHaveBeenCalled();
    });

    test("handles API error gracefully with toast notification and stable page", async () => {
        const networkError = new Error("Network Error");
        axios.get.mockRejectedValue(networkError);

        renderProducts();

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });

        expect(console.log).toHaveBeenCalledWith(networkError);
        expect(screen.getByText("All Products List")).toBeInTheDocument();

        const cards = document.querySelectorAll(".card");
        expect(cards).toHaveLength(0);
    });
});
