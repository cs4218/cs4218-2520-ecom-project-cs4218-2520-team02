// Jovin Ang Yusheng, A0273460H
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductDetails from "./ProductDetails";
import axios from "axios";

// =============== Mocks ===============
jest.mock("axios");

const mockNavigate = jest.fn();
const mockParams = { slug: "test-product" };

jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
}));

jest.mock("./../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

// =============== Mock data ===============
const mockProduct = {
    _id: "1",
    name: "Test Product",
    description: "A test product description",
    price: 99.99,
    category: { _id: "1", name: "Electronics" },
    slug: "test-product",
};

const mockRelatedProducts = [
    {
        _id: "2",
        name: "Related One",
        description:
            "A related product description that is long enough to verify truncation behavior",
        price: 49.99,
        slug: "related-one",
    },
    {
        _id: "3",
        name: "Related Two",
        description: "Short related description",
        price: 29.99,
        slug: "related-two",
    },
];

function setupAxiosMocks({
    product = mockProduct,
    relatedProducts = mockRelatedProducts,
    productError = false,
    relatedError = false,
} = {}) {
    axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/")) {
            if (productError)
                return Promise.reject(new Error("Product fetch error"));
            return Promise.resolve({ data: { product } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
            if (relatedError)
                return Promise.reject(new Error("Related fetch error"));
            return Promise.resolve({ data: { products: relatedProducts } });
        }
        return Promise.reject(new Error(`Unhandled GET: ${url}`));
    });
}

async function waitForProductLoaded() {
    await waitFor(() => {
        expect(screen.getByText(/Name : Test Product/)).toBeInTheDocument();
    });
}

describe("ProductDetails Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockParams.slug = "test-product";
    });

    describe("rendering", () => {
        test("renders layout", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            expect(screen.getByTestId("layout")).toBeInTheDocument();
        });

        test("renders product details heading", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            expect(
                screen.getByRole("heading", { name: /product details/i })
            ).toBeInTheDocument();
        });

        test("renders ADD TO CART button", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            expect(
                screen.getByRole("button", { name: /add to cart/i })
            ).toBeInTheDocument();
        });

        test("renders similar products heading", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            expect(screen.getByText(/Similar Products ➡️/)).toBeInTheDocument();
        });
    });

    describe("fetching product on mount", () => {
        test("fetches product by slug", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith(
                    "/api/v1/product/get-product/test-product"
                );
            });
        });

        test("does not fetch when slug is falsy", async () => {
            mockParams.slug = undefined;
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitFor(() => {
                expect(axios.get).not.toHaveBeenCalled();
            });
        });

        test("displays product name", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitForProductLoaded();

            expect(
                screen.getByText(/Name : Test Product/)
            ).toBeInTheDocument();
        });

        test("displays product description", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitForProductLoaded();

            expect(
                screen.getByText(/Description : A test product description/)
            ).toBeInTheDocument();
        });

        test("displays formatted product price", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitForProductLoaded();

            expect(screen.getByText(/\$99\.99/)).toBeInTheDocument();
        });

        test("displays product category name", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitForProductLoaded();

            expect(
                screen.getByText(/Category : Electronics/)
            ).toBeInTheDocument();
        });

        test("displays product image with correct src and alt", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitForProductLoaded();

            const img = screen.getByAltText("Test Product");
            expect(img).toHaveAttribute(
                "src",
                "/api/v1/product/product-photo/1"
            );
        });

        test("logs error when product fetch fails", async () => {
            const consoleSpy = jest
                .spyOn(console, "log")
                .mockImplementation();
            setupAxiosMocks({ productError: true });
            render(<ProductDetails />);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            });

            consoleSpy.mockRestore();
        });
    });

    describe("fetching similar products", () => {
        test("fetches related products after product loads", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith(
                    "/api/v1/product/related-product/1/1"
                );
            });
        });

        test("renders related product cards", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitFor(() => {
                expect(screen.getByText("Related One")).toBeInTheDocument();
                expect(screen.getByText("Related Two")).toBeInTheDocument();
            });
        });

        test("renders related product images with correct src", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitFor(() => {
                const img1 = screen.getByAltText("Related One");
                expect(img1).toHaveAttribute(
                    "src",
                    "/api/v1/product/product-photo/2"
                );

                const img2 = screen.getByAltText("Related Two");
                expect(img2).toHaveAttribute(
                    "src",
                    "/api/v1/product/product-photo/3"
                );
            });
        });

        test("renders formatted prices for related products", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitFor(() => {
                expect(screen.getByText("$49.99")).toBeInTheDocument();
                expect(screen.getByText("$29.99")).toBeInTheDocument();
            });
        });

        test("truncates related product descriptions to 60 characters", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            const truncated =
                mockRelatedProducts[0].description.substring(0, 60);

            await waitFor(() => {
                expect(
                    screen.getByText(`${truncated}...`)
                ).toBeInTheDocument();
            });
        });

        test("shows 'No Similar Products found' when none exist", async () => {
            setupAxiosMocks({ relatedProducts: [] });
            render(<ProductDetails />);

            await waitFor(() => {
                expect(
                    screen.getByText(/No Similar Products found/)
                ).toBeInTheDocument();
            });
        });

        test("does not show 'No Similar Products found' when related products exist", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitFor(() => {
                expect(screen.getByText("Related One")).toBeInTheDocument();
            });

            expect(
                screen.queryByText(/No Similar Products found/)
            ).not.toBeInTheDocument();
        });

        test("logs error when related products fetch fails", async () => {
            const consoleSpy = jest
                .spyOn(console, "log")
                .mockImplementation();
            setupAxiosMocks({ relatedError: true });
            render(<ProductDetails />);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            });

            consoleSpy.mockRestore();
        });
    });

    describe("navigation", () => {
        test("navigates to related product on More Details click", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitFor(() => {
                expect(screen.getByText("Related One")).toBeInTheDocument();
            });

            const buttons = screen.getAllByRole("button", {
                name: /more details/i,
            });
            await userEvent.click(buttons[0]);

            expect(mockNavigate).toHaveBeenCalledWith("/product/related-one");
        });

        test("navigates to correct product for second related item", async () => {
            setupAxiosMocks();
            render(<ProductDetails />);

            await waitFor(() => {
                expect(screen.getByText("Related Two")).toBeInTheDocument();
            });

            const buttons = screen.getAllByRole("button", {
                name: /more details/i,
            });
            await userEvent.click(buttons[1]);

            expect(mockNavigate).toHaveBeenCalledWith("/product/related-two");
        });
    });
});
