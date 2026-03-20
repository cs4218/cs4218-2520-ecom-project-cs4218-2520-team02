// Jovin Ang Yusheng, A0273460H
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import UpdateProduct from "./UpdateProduct";
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

jest.mock("antd", () => {
    const Select = ({ placeholder, onChange, children, className, value }) => (
        <select
            aria-label={placeholder}
            className={className}
            onChange={(e) => onChange?.(e.target.value)}
            value={value ?? ""}
        >
            <option value="" disabled>
                {placeholder}
            </option>
            {children}
        </select>
    );

    Select.Option = ({ value, children }) => (
        <option value={value}>{children}</option>
    );

    const Badge = ({ children }) => <span>{children}</span>;

    return { Select, Badge };
});

// =============== Mock data ===============
const mockCategories = [
    { _id: "cat1", name: "Electronics" },
    { _id: "cat2", name: "Clothing" },
];

const mockProduct = {
    _id: "prod1",
    name: "Wireless Keyboard",
    slug: "wireless-keyboard",
    description: "A sleek wireless keyboard",
    price: 59,
    quantity: 25,
    shipping: true,
    category: { _id: "cat1", name: "Electronics" },
};

// =============== Helpers ===============
const ProductsListStub = () => <div data-testid="products-list-page">Products List</div>;

const mockSuccessfulLoad = () => {
    axios.get.mockImplementation((url) => {
        if (url === `/api/v1/product/get-product/${mockProduct.slug}`) {
            return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url === "/api/v1/category/get-category") {
            return Promise.resolve({ data: { success: true, categories: mockCategories } });
        }
        return Promise.resolve({ data: {} });
    });
};

const renderUpdateProduct = () => {
    return render(
        <MemoryRouter initialEntries={[`/dashboard/admin/product/${mockProduct.slug}`]}>
            <AuthProvider>
                <SearchProvider>
                    <CartProvider>
                        <Routes>
                            <Route path="/dashboard/admin/product/:slug" element={<UpdateProduct />} />
                            <Route path="/dashboard/admin/products" element={<ProductsListStub />} />
                        </Routes>
                    </CartProvider>
                </SearchProvider>
            </AuthProvider>
        </MemoryRouter>
    );
};

const waitForPageLoad = async () => {
    await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter product name")).toHaveValue(mockProduct.name);
    });
};

// =============== Tests ===============
describe("Admin Update Product Page", () => {
    beforeAll(() => {
        Object.defineProperty(global.URL, "createObjectURL", {
            writable: true,
            value: jest.fn(() => "blob:mock"),
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => {});
        global.URL.createObjectURL.mockClear?.();
        global.URL.createObjectURL.mockImplementation(() => "blob:mock");
        jest.spyOn(window, "confirm").mockImplementation(() => true);
    });

    afterEach(() => {
        console.log.mockRestore();
        window.confirm.mockRestore();
        localStorage.clear();
    });

    test("loads product, updates fields without new photo, and navigates on success", async () => {
        mockSuccessfulLoad();
        axios.put.mockResolvedValueOnce({ data: { success: true } });

        renderUpdateProduct();
        await waitForPageLoad();

        expect(screen.getByPlaceholderText("Enter product name")).toHaveValue(mockProduct.name);
        expect(screen.getByPlaceholderText("Enter product description")).toHaveValue(mockProduct.description);
        expect(screen.getByPlaceholderText("Enter product price")).toHaveValue(mockProduct.price);
        expect(screen.getByPlaceholderText("Enter product quantity")).toHaveValue(mockProduct.quantity);
        expect(screen.getByLabelText("Select a category")).toHaveValue(mockProduct.category._id);
        expect(screen.getByLabelText("Select shipping")).toHaveValue("1");

        const existingPhoto = screen.getByAltText("product_photo");
        expect(existingPhoto).toHaveAttribute("src", `/api/v1/product/product-photo/${mockProduct._id}`);

        act(() => {
            userEvent.clear(screen.getByPlaceholderText("Enter product name"));
            userEvent.type(screen.getByPlaceholderText("Enter product name"), "Updated Keyboard");
        });

        act(() => {
            userEvent.click(screen.getByRole("button", { name: /update product/i }));
        });

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledTimes(1);
        });

        const [url, formDataArg] = axios.put.mock.calls[0];
        expect(url).toBe(`/api/v1/product/update-product/${mockProduct._id}`);
        expect(formDataArg).toBeInstanceOf(FormData);
        expect(formDataArg.get("name")).toBe("Updated Keyboard");
        expect(formDataArg.get("photo")).toBeNull();

        expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
        expect(await screen.findByTestId("products-list-page")).toBeInTheDocument();
    });

    test("uploads new photo, shows preview, and includes photo in update request", async () => {
        mockSuccessfulLoad();
        axios.put.mockResolvedValueOnce({ data: { success: true } });

        renderUpdateProduct();
        await waitForPageLoad();

        const newPhoto = new File(["new image"], "new-photo.png", { type: "image/png" });
        const photoInput = document.querySelector('input[type="file"][name="photo"]');

        act(() => {
            userEvent.upload(photoInput, newPhoto);
        });

        expect(screen.getByText("new-photo.png")).toBeInTheDocument();
        expect(screen.getByAltText("product_photo")).toHaveAttribute("src", "blob:mock");

        act(() => {
            userEvent.click(screen.getByRole("button", { name: /update product/i }));
        });

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledTimes(1);
        });

        const [, formDataArg] = axios.put.mock.calls[0];
        expect(formDataArg.get("photo")).toBe(newPhoto);

        expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
        expect(await screen.findByTestId("products-list-page")).toBeInTheDocument();
    });

    test("deletes product and navigates to products list on confirmation", async () => {
        mockSuccessfulLoad();
        axios.delete.mockResolvedValueOnce({ data: { success: true } });

        renderUpdateProduct();
        await waitForPageLoad();

        act(() => {
            userEvent.click(screen.getByRole("button", { name: /delete product/i }));
        });

        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalledWith(
                `/api/v1/product/delete-product/${mockProduct._id}`
            );
        });

        expect(toast.success).toHaveBeenCalledWith("Product Deleted Successfully");
        expect(await screen.findByTestId("products-list-page")).toBeInTheDocument();
    });

});
