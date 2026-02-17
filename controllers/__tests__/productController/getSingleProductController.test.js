import { jest } from "@jest/globals";

// =============== Mocks ===============
const testProduct = {
    "_id":"7c9b1f04a8d2e6c3f5a7b901",
    "name":"Test Product",
    "slug":"test-product",
    "description":"A bestselling test product",
    "price": 49.99,
    "category": {
        "_id":"507f1f77bcf86cd799439011",
        "name":"Test category",
        "slug":"test-category",
        "__v":0
    },
    "quantity": 10,
    "shipping": true,
    "createdAt":"2026-01-05T17:57:19.992Z",
    "updatedAt":"2026-01-05T17:57:19.992Z",
    "__v":0
}

await jest.unstable_mockModule("../../../models/productModel.js", () => ({
    default: {
        findOne: jest.fn(),
    },
}));

const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() }); // Mock response

// =============== Imports ===============
const { default: productModel } = await import("../../../models/productModel.js");
const { getSingleProductController } = await import("../../productController.js");

const mockFindOneChain = (resolvedValue, shouldReject = false) => {
    const populateMock = shouldReject
        ? jest.fn().mockRejectedValue(resolvedValue)
        : jest.fn().mockResolvedValue(resolvedValue);

    const selectMock = jest.fn(() => ({ populate: populateMock }));

    productModel.findOne.mockReturnValue({
        select: selectMock,
    });

    return { populateMock };
};

// =============== Tests ===============
describe("getProductController", () => {
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockRes();

        // Suppress console log
        jest.spyOn(console, "log").mockImplementation(() => {});
    })

    afterEach(() => {
        console.log.mockRestore();
    })

    describe("When product slug provided exist", () => {
        test("should return 200 with product", async () => {
            mockFindOneChain(testProduct);

            await getSingleProductController({
                params: { slug: "test-product" },
            }, res);

            expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(
                {
                    success: true,
                    message: "Single Product Fetched",
                    product: testProduct,
                }
            );
        })

        test("should return 200 with product when slug contains leading/trailing whitespaces", async () => {
            mockFindOneChain(testProduct);

            await getSingleProductController({
                params: { slug: "    test-product     " },
            }, res);

            expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(
                {
                    success: true,
                    message: "Single Product Fetched",
                    product: testProduct,
                }
            );
        })
    })

    describe("When product slug provided does not exist", () => {
        test("should return 404", async () => {
            mockFindOneChain(null, );

            await getSingleProductController({
                params: { slug: "non-existent-product" },
            }, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(
                {
                    success: false,
                    message: "Product not found",
                }
            );
        })
    })

    describe("When no slug is provided", () => {
        test("should return 400", async () => {
            await getSingleProductController({
                params: { slug: "" },
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    success: false,
                    message: "Product slug is required",
                }
            );
        })
    })

    describe("When there is a database error", () => {
        test("should return 500 with an error message", async () => {
            mockFindOneChain(new Error("DB error"), true);

            await getSingleProductController({}, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error while getting single product",
                })
            );
        })
    })
})