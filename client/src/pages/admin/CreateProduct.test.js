// Jovin Ang Yusheng, A0273460H
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateProduct from "./CreateProduct";
import axios from "axios";
import toast from "react-hot-toast";

// =============== Mocks ===============
jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

// Mock Layout/AdminMenu
jest.mock("./../../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));
jest.mock("./../../components/AdminMenu", () => () => (
    <div data-testid="admin-menu" />
));

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

    return { Select };
});

// =============== Mock data ===============
const mockCategories = [
    { _id: "1", name: "Electronics" },
    { _id: "2", name: "Clothing" },
];

const mockNewProduct = {
    name: "Test Product",
    description: "Test Description",
    price: "100",
    quantity: "10",
    category: mockCategories[0]._id,
    shipping: "1",
    photo: new File(["dummy content"], "photo.png", { type: "image/png" }),
};

// =============== Tests ===============
describe("CreateProduct Page", () => {
    beforeAll(() => {
        Object.defineProperty(global.URL, "createObjectURL", {
            writable: true,
            value: jest.fn(() => "blob:mock"),
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        global.URL.createObjectURL.mockClear?.();
        global.URL.createObjectURL.mockImplementation(() => "blob:mock");
    });

    describe("render", () => {
        test("renders layout and admin menu", () => {
            axios.get.mockResolvedValueOnce({
                data: { success: true, categories: [] },
            });

            render(<CreateProduct />);

            expect(screen.getByTestId("layout")).toBeInTheDocument();
            expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
        });

        test("fetches and displays categories in select dropdown", async () => {
            axios.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    categories: mockCategories,
                },
            });

            render(<CreateProduct />);

            // axios.get called
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            });

            await screen.findByRole("option", { name: mockCategories[0].name });

            // options rendered
            expect(screen.getByRole("option", { name: mockCategories[0].name })).toBeInTheDocument();
            expect(screen.getByRole("option", { name: mockCategories[1].name })).toBeInTheDocument();
            expect(screen.getByTestId("layout")).toBeInTheDocument();
            expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
        });

        test("shows toast error if there are no categories", async () => {
            axios.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    categories: [],
                },
            });

            render(<CreateProduct />);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    "There are no categories. Please create a category first"
                );
            });
        })

        test("shows toast error if category fetch fails", async () => {
            axios.get.mockRejectedValueOnce(new Error("Network Error"));

            render(<CreateProduct />);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    "Something went wrong in getting category"
                );
            });
        })
    })

    describe("create product", () => {
        test("validation: shows error if category missing", async () => {
            axios.get.mockResolvedValueOnce({
                data: { success: true, categories: mockCategories },
            });

            render(<CreateProduct />);

            // Wait for categories loaded
            await screen.findByRole("option", { name: mockCategories[0].name });

            // Click without selecting category
            userEvent.click(
                screen.getByRole("button", { name: /create product/i })
            );

            expect(toast.error).toHaveBeenCalledWith("Category is Required");
            expect(axios.post).not.toHaveBeenCalled();
        });

        test("validation: shows error if name missing", async () => {
            axios.get.mockResolvedValueOnce({
                data: { success: true, categories: mockCategories },
            });

            render(<CreateProduct />);

            await screen.findByRole("option", { name: mockCategories[0].name });

            // select category only
            userEvent.selectOptions(
                screen.getByLabelText("Select a category"),
                mockNewProduct.category
            );

            userEvent.click(
                screen.getByRole("button", { name: /create product/i })
            );

            expect(toast.error).toHaveBeenCalledWith("Name is Required");
            expect(axios.post).not.toHaveBeenCalled();
        });

        test("creates product successfully and shows toast success", async () => {
            axios.get.mockResolvedValueOnce({
                data: { success: true, categories: mockCategories },
            });

            axios.post.mockResolvedValueOnce({
                data: { success: true },
            });

            render(<CreateProduct />);

            // Wait until categories are rendered
            await screen.findByRole("option", { name: mockCategories[0].name });

            userEvent.type(
                screen.getByPlaceholderText("Enter product name"),
                mockNewProduct.name
            );
            userEvent.type(
                screen.getByPlaceholderText("Enter product description"),
                mockNewProduct.description
            );
            userEvent.type(
                screen.getByPlaceholderText("Enter product price"),
                mockNewProduct.price
            );
            userEvent.type(
                screen.getByPlaceholderText("Enter product quantity"),
                mockNewProduct.quantity
            );

            userEvent.selectOptions(
                screen.getByLabelText("Select a category"),
                mockNewProduct.category
            );

            userEvent.selectOptions(
                screen.getByLabelText("Select shipping"),
                mockNewProduct.shipping
            );

            // upload photo
            const photoInput = document.querySelector('input[type="file"][name="photo"]');
            expect(photoInput).toBeInTheDocument();
            userEvent.upload(photoInput, mockNewProduct.photo);

            // click create
            userEvent.click(
                screen.getByRole("button", { name: /create product/i })
            );

            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledTimes(1);
            });

            const [url, formDataArg] = axios.post.mock.calls[0];
            expect(url).toBe("/api/v1/product/create-product");
            expect(formDataArg).toBeInstanceOf(FormData);

            // verify FormData content
            expect(formDataArg.get("name")).toBe(mockNewProduct.name);
            expect(formDataArg.get("description")).toBe(mockNewProduct.description);
            expect(formDataArg.get("price")).toBe(mockNewProduct.price);
            expect(formDataArg.get("quantity")).toBe(mockNewProduct.quantity);
            expect(formDataArg.get("category")).toBe(mockNewProduct.category);
            expect(formDataArg.get("shipping")).toBe(mockNewProduct.shipping);
            expect(formDataArg.get("photo")).toBe(mockNewProduct.photo);

            expect(toast.success).toHaveBeenCalledWith(
                "Product Created Successfully"
            );
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        })
    })
})