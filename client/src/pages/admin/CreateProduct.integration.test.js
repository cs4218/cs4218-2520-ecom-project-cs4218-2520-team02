// Jovin Ang Yusheng, A0273460H
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CreateProduct from "./CreateProduct";
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
    const Select = ({ placeholder, onChange, children, className }) => (
        <select
            aria-label={placeholder}
            className={className}
            onChange={(e) => onChange?.(e.target.value)}
            defaultValue=""
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
    { _id: "1", name: "Electronics" },
    { _id: "2", name: "Clothing" },
];

const mockProductInput = {
    name: "Test Product",
    description: "Test Description",
    price: "100",
    quantity: "10",
    category: mockCategories[0]._id,
    shipping: "1",
    photo: new File(["dummy content"], "photo.png", { type: "image/png" }),
};

// =============== Helpers ===============
const ProductsListStub = () => <div data-testid="products-list-page">Products List</div>;

const renderCreateProduct = () => {
    return render(
        <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
            <AuthProvider>
                <SearchProvider>
                    <CartProvider>
                        <Routes>
                            <Route path="/dashboard/admin/create-product" element={<CreateProduct />} />
                            <Route path="/dashboard/admin/products" element={<ProductsListStub />} />
                        </Routes>
                    </CartProvider>
                </SearchProvider>
            </AuthProvider>
        </MemoryRouter>
    );
};

const fillForm = () => {
    userEvent.selectOptions(
        screen.getByLabelText("Select a category"),
        mockProductInput.category
    );
    userEvent.type(
        screen.getByPlaceholderText("Enter product name"),
        mockProductInput.name
    );
    userEvent.type(
        screen.getByPlaceholderText("Enter product description"),
        mockProductInput.description
    );
    userEvent.type(
        screen.getByPlaceholderText("Enter product price"),
        mockProductInput.price
    );
    userEvent.type(
        screen.getByPlaceholderText("Enter product quantity"),
        mockProductInput.quantity
    );
    userEvent.selectOptions(
        screen.getByLabelText("Select shipping"),
        mockProductInput.shipping
    );

    const photoInput = document.querySelector('input[type="file"][name="photo"]');
    userEvent.upload(photoInput, mockProductInput.photo);
};

// =============== Tests ===============
describe("Admin Create Product Page", () => {
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
    });

    afterEach(() => {
        console.log.mockRestore();
        localStorage.clear();
    });

    test("retrieves and displays categories as selectable options", async () => {
        axios.get.mockResolvedValueOnce({
            data: { success: true, categories: mockCategories },
        });

        renderCreateProduct();

        await screen.findByRole("option", { name: "Electronics" });

        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");

        for (const cat of mockCategories) {
            expect(screen.getByRole("option", { name: cat.name })).toBeInTheDocument();
        }

        const categorySelect = screen.getByLabelText("Select a category");
        const options = categorySelect.querySelectorAll("option:not([disabled])");
        expect(options).toHaveLength(mockCategories.length);
    });

    test("submits product successfully, shows success toast, and navigates to products list", async () => {
        axios.get.mockResolvedValueOnce({
            data: { success: true, categories: mockCategories },
        });
        axios.post.mockResolvedValueOnce({
            data: { success: true },
        });

        renderCreateProduct();
        await screen.findByRole("option", { name: "Electronics" });

        act(() => {
            fillForm();
        });

        act(() => {
            userEvent.click(
                screen.getByRole("button", { name: /create product/i })
            );
        });

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledTimes(1);
        });

        const [url, formDataArg] = axios.post.mock.calls[0];
        expect(url).toBe("/api/v1/product/create-product");
        expect(formDataArg).toBeInstanceOf(FormData);
        expect(formDataArg.get("name")).toBe(mockProductInput.name);
        expect(formDataArg.get("description")).toBe(mockProductInput.description);
        expect(formDataArg.get("price")).toBe(mockProductInput.price);
        expect(formDataArg.get("quantity")).toBe(mockProductInput.quantity);
        expect(formDataArg.get("category")).toBe(mockProductInput.category);
        expect(formDataArg.get("shipping")).toBe(mockProductInput.shipping);
        expect(formDataArg.get("photo")).toBe(mockProductInput.photo);

        expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");
        expect(await screen.findByTestId("products-list-page")).toBeInTheDocument();
    });

    test("shows error toast and stays on page when product creation fails", async () => {
        axios.get.mockResolvedValueOnce({
            data: { success: true, categories: mockCategories },
        });
        axios.post.mockRejectedValueOnce(new Error("Server Error"));

        renderCreateProduct();
        await screen.findByRole("option", { name: "Electronics" });

        act(() => {
            fillForm();
        });

        act(() => {
            userEvent.click(
                screen.getByRole("button", { name: /create product/i })
            );
        });

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledTimes(1);
        });

        expect(toast.error).toHaveBeenCalledWith("something went wrong");
        expect(screen.getByRole("heading", { name: "Create Product" })).toBeInTheDocument();
        expect(screen.queryByTestId("products-list-page")).not.toBeInTheDocument();
    });
});
