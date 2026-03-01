// Jovin Ang Yusheng, A0273460H
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UpdateProduct from "./UpdateProduct";
import axios from "axios";
import toast from "react-hot-toast";

// =============== Mocks ===============
jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
const mockParams = { slug: "test-product" };

jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
}));

jest.mock("./../../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));
jest.mock("./../../components/AdminMenu", () => () => (
    <div data-testid="admin-menu" />
));

jest.mock("antd", () => {
    const Select = ({ placeholder, onChange, children, className, value }) => (
        <select
            aria-label={placeholder}
            className={className}
            onChange={(e) => onChange?.(e.target.value)}
            value={value || ""}
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

const mockProduct = {
    _id: "prod1",
    name: "Test Product",
    description: "A test product description",
    price: 99,
    quantity: 50,
    shipping: true,
    category: { _id: "1", name: "Electronics" },
    slug: "test-product",
};

function setupAxiosMocks({
    product = mockProduct,
    categories = mockCategories,
    productError = false,
    categoryError = false,
} = {}) {
    axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/")) {
            if (productError) return Promise.reject(new Error("Product fetch error"));
            return Promise.resolve({ data: { product } });
        }
        if (url.includes("/api/v1/category/get-category")) {
            if (categoryError) return Promise.reject(new Error("Category fetch error"));
            return Promise.resolve({
                data: { success: true, categories },
            });
        }
        return Promise.reject(new Error(`Unhandled GET: ${url}`));
    });
}

async function waitForProductLoaded() {
    await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter product name")).toHaveValue(mockProduct.name);
    });
}

describe("UpdateProduct Page", () => {
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

    describe("rendering", () => {
        test("renders layout and admin menu", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);

            expect(screen.getByTestId("layout")).toBeInTheDocument();
            expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
        });

        test("renders heading", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);

            expect(screen.getByRole("heading", { name: /update product/i })).toBeInTheDocument();
        });

        test("renders update and delete buttons", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);

            expect(screen.getByRole("button", { name: /update product/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /delete product/i })).toBeInTheDocument();
        });
    });

    describe("fetching data on mount", () => {
        test("fetches single product by slug", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith(
                    `/api/v1/product/get-product/${mockParams.slug}`
                );
            });
        });

        test("fetches all categories", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            });
        });

        test("populates form fields with product data", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);

            await waitForProductLoaded();

            expect(screen.getByPlaceholderText("Enter product name")).toHaveValue(mockProduct.name);
            expect(screen.getByPlaceholderText("Enter product description")).toHaveValue(
                mockProduct.description
            );
            expect(screen.getByPlaceholderText("Enter product price")).toHaveValue(mockProduct.price);
            expect(screen.getByPlaceholderText("Enter product quantity")).toHaveValue(
                mockProduct.quantity
            );
            const shippingSelect = screen.getByLabelText(/Select shipping/i);
            expect(shippingSelect).toHaveValue(mockProduct.shipping ? "1" : "0");
        });

        test("populates category select with fetched categories", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);

            await waitFor(() => {
                expect(screen.getByRole("option", { name: "Electronics" })).toBeInTheDocument();
                expect(screen.getByRole("option", { name: "Clothing" })).toBeInTheDocument();
            });
        });

        test("selects the product's current category", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);

            await waitForProductLoaded();

            const categorySelect = screen.getByLabelText("Select a category");
            expect(categorySelect).toHaveValue(mockProduct.category._id);
        });

        test("shows existing product photo via API URL", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);

            await waitForProductLoaded();

            const img = screen.getByAltText("product_photo");
            expect(img).toHaveAttribute(
                "src",
                `/api/v1/product/product-photo/${mockProduct._id}`
            );
        });

        test("shows toast error when category fetch fails", async () => {
            setupAxiosMocks({ categoryError: true });
            render(<UpdateProduct />);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    "Something went wrong in getting category"
                );
            });
        });

        test("shows toast error when categories array is empty", async () => {
            setupAxiosMocks({ categories: [] });
            render(<UpdateProduct />);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    "There are no categories. Please create a category first"
                );
            });

            const categorySelect = screen.getByLabelText("Select a category");
            const categoryOptions = Array.from(categorySelect.querySelectorAll("option")).filter(
                (o) => !o.disabled
            );
            expect(categoryOptions).toHaveLength(0);
        });

        test("shows toast error when single product fetch fails", async () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            setupAxiosMocks({ productError: true });
            render(<UpdateProduct />);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            });
            expect(toast.error).toHaveBeenCalledWith(
                "Something went wrong in fetching product"
            );

            consoleSpy.mockRestore();
        });
    });

    describe("form interactions", () => {
        test("updates name field on input", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);
            await waitForProductLoaded();

            const nameInput = screen.getByPlaceholderText("Enter product name");
            await userEvent.clear(nameInput);
            await userEvent.type(nameInput, "New Name");

            expect(nameInput).toHaveValue("New Name");
        });

        test("updates description field on input", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);
            await waitForProductLoaded();

            const descInput = screen.getByPlaceholderText("Enter product description");
            await userEvent.clear(descInput);
            await userEvent.type(descInput, "New description");

            expect(descInput).toHaveValue("New description");
        });

        test("updates price field on input", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);
            await waitForProductLoaded();

            const priceInput = screen.getByPlaceholderText("Enter product price");
            await userEvent.clear(priceInput);
            await userEvent.type(priceInput, "200");

            expect(priceInput).toHaveValue(200);
        });

        test("updates quantity field on input", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);
            await waitForProductLoaded();

            const qtyInput = screen.getByPlaceholderText("Enter product quantity");
            await userEvent.clear(qtyInput);
            await userEvent.type(qtyInput, "25");

            expect(qtyInput).toHaveValue(25);
        });

        test("uploads photo and shows preview", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);
            await waitForProductLoaded();

            const file = new File(["dummy"], "test.png", { type: "image/png" });
            const photoInput = document.querySelector('input[type="file"][name="photo"]');
            await userEvent.upload(photoInput, file);

            expect(screen.getByText("test.png")).toBeInTheDocument();
            const img = screen.getByAltText("product_photo");
            expect(img).toHaveAttribute("src", "blob:mock");
        });

        test("changes category via select", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);
            await waitForProductLoaded();

            await waitFor(() => {
                expect(screen.getByRole("option", { name: "Clothing" })).toBeInTheDocument();
            });

            const categorySelect = screen.getByLabelText("Select a category");
            await userEvent.selectOptions(categorySelect, "2");

            expect(categorySelect).toHaveValue("2");
        });

        test("changes shipping via select", async () => {
            setupAxiosMocks();
            render(<UpdateProduct />);
            await waitForProductLoaded();

            const shippingSelect = screen.getByLabelText(/Select shipping/i);
            expect(shippingSelect).toHaveValue("1");

            await userEvent.selectOptions(shippingSelect, "0");

            expect(shippingSelect).toHaveValue("0");
        });
    });

    describe("handleUpdate", () => {
        test("calls axios.put with correct URL and FormData", async () => {
            setupAxiosMocks();
            axios.put.mockResolvedValueOnce({ data: { success: false } });
            render(<UpdateProduct />);
            await waitForProductLoaded();

            await userEvent.click(screen.getByRole("button", { name: /update product/i }));

            await waitFor(() => {
                expect(axios.put).toHaveBeenCalledTimes(1);
            });

            const [url, formData] = axios.put.mock.calls[0];
            expect(url).toBe(`/api/v1/product/update-product/${mockProduct._id}`);
            expect(formData).toBeInstanceOf(FormData);
            expect(formData.get("name")).toBe(mockProduct.name);
            expect(formData.get("description")).toBe(mockProduct.description);
            expect(formData.get("price")).toBe(String(mockProduct.price));
            expect(formData.get("quantity")).toBe(String(mockProduct.quantity));
            expect(formData.get("category")).toBe(mockProduct.category._id);
            expect(formData.get("shipping")).toBe(String(mockProduct.shipping));
        });

        test("does not include photo in FormData when no new photo is uploaded", async () => {
            setupAxiosMocks();
            axios.put.mockResolvedValueOnce({ data: { success: false } });
            render(<UpdateProduct />);
            await waitForProductLoaded();

            await userEvent.click(screen.getByRole("button", { name: /update product/i }));

            await waitFor(() => {
                expect(axios.put).toHaveBeenCalledTimes(1);
            });

            const [, formData] = axios.put.mock.calls[0];
            expect(formData.get("photo")).toBeNull();
        });

        test("includes photo in FormData when new photo is uploaded", async () => {
            setupAxiosMocks();
            axios.put.mockResolvedValueOnce({ data: { success: false } });
            render(<UpdateProduct />);
            await waitForProductLoaded();

            const file = new File(["content"], "new-photo.png", { type: "image/png" });
            const photoInput = document.querySelector('input[type="file"][name="photo"]');
            await userEvent.upload(photoInput, file);

            await userEvent.click(screen.getByRole("button", { name: /update product/i }));

            await waitFor(() => {
                expect(axios.put).toHaveBeenCalledTimes(1);
            });

            const [, formData] = axios.put.mock.calls[0];
            expect(formData.get("photo")).toBe(file);
        });

        test("shows success toast and navigates on successful update", async () => {
            setupAxiosMocks();
            axios.put.mockResolvedValueOnce({ data: { success: true } });
            render(<UpdateProduct />);
            await waitForProductLoaded();

            await userEvent.click(screen.getByRole("button", { name: /update product/i }));

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
            });
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        });

        test("shows error toast when update fails", async () => {
            setupAxiosMocks();
            axios.put.mockRejectedValueOnce(new Error("Network Error"));
            render(<UpdateProduct />);
            await waitForProductLoaded();

            await userEvent.click(screen.getByRole("button", { name: /update product/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Something went wrong");
            });
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        test("sends updated name in FormData after editing", async () => {
            setupAxiosMocks();
            axios.put.mockResolvedValueOnce({ data: { success: false } });
            render(<UpdateProduct />);
            await waitForProductLoaded();

            const nameInput = screen.getByPlaceholderText("Enter product name");
            await userEvent.clear(nameInput);
            await userEvent.type(nameInput, "Updated Name");

            await userEvent.click(screen.getByRole("button", { name: /update product/i }));

            await waitFor(() => {
                expect(axios.put).toHaveBeenCalledTimes(1);
            });

            const [, formData] = axios.put.mock.calls[0];
            expect(formData.get("name")).toBe("Updated Name");
        });
    });

    describe("handleDelete", () => {
        test("deletes product and navigates when user confirms", async () => {
            setupAxiosMocks();
            window.confirm = jest.fn(() => true);
            axios.delete.mockResolvedValueOnce({ data: { success: true } });
            render(<UpdateProduct />);
            await waitForProductLoaded();

            await userEvent.click(screen.getByRole("button", { name: /delete product/i }));

            expect(window.confirm).toHaveBeenCalledWith(
                "Are you sure you want to delete this product?"
            );

            await waitFor(() => {
                expect(axios.delete).toHaveBeenCalledWith(
                    `/api/v1/product/delete-product/${mockProduct._id}`
                );
            });

            expect(toast.success).toHaveBeenCalledWith("Product Deleted Successfully");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        });

        test("does not delete when user cancels confirm", async () => {
            setupAxiosMocks();
            window.confirm = jest.fn(() => false);
            render(<UpdateProduct />);
            await waitForProductLoaded();

            await userEvent.click(screen.getByRole("button", { name: /delete product/i }));

            expect(window.confirm).toHaveBeenCalled();
            expect(axios.delete).not.toHaveBeenCalled();
        });

        test("shows error toast when delete fails", async () => {
            setupAxiosMocks();
            window.confirm = jest.fn(() => true);
            axios.delete.mockRejectedValueOnce(new Error("Network Error"));
            render(<UpdateProduct />);
            await waitForProductLoaded();

            await userEvent.click(screen.getByRole("button", { name: /delete product/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Something went wrong");
            });
        });
    });
});
