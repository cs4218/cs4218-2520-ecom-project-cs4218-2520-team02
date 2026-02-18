import { jest } from "@jest/globals";

// =============== Mocks ===============
const testProducts = [
    {
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
    },
    {
        "_id":"65f1c2d3e4a5b6c7d8e9f0a1",
        "name":"Test Product 2",
        "slug":"test-product-2",
        "description":"Another test product",
        "price": 59.99,
        "category": {
            "_id":"507f1f77bcf86cd799439011",
            "name":"Test category",
            "slug":"test-category",
            "__v":0
        },
        "quantity": 100,
        "shipping": true,
        "createdAt":"2026-01-05T17:57:19.992Z",
        "updatedAt":"2026-01-05T17:57:19.992Z",
        "__v":0
    }
]

await jest.unstable_mockModule("../../../models/productModel.js", () => ({
    default: {
        find: jest.fn(),
    },
}));

const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() }); // Mock response

// =============== Imports ===============
const { default: productModel } = await import("../../../models/productModel.js");
const { getProductController } = await import("../../productController.js");

const mockFindChain = (resolvedValue, shouldReject = false) => {
    const sortMock = shouldReject
        ? jest.fn().mockRejectedValue(resolvedValue)
        : jest.fn().mockResolvedValue(resolvedValue);

    const limitMock = jest.fn(() => ({ sort: sortMock }));
    const selectMock = jest.fn(() => ({ limit: limitMock }));
    const populateMock = jest.fn(() => ({ select: selectMock }));

    productModel.find.mockReturnValue({
        populate: populateMock,
    });

    return { sortMock };
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

    describe("When there are no products in the database", () => {
        test("should return 200 with an empty array", async () => {
            mockFindChain([]); // return empty array

            await getProductController({}, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(
                {
                    success: true,
                    countTotal: 0,
                    message: "All products retrieved successfully.",
                    products: [],
                }
            );
        })
    })

    describe("When there is only one product in the database", () => {
        test("should return 200 with the single product", async () => {
            mockFindChain([testProducts[0]]); // return single product

            await getProductController({}, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(
                {
                    success: true,
                    countTotal: 1,
                    message: "All products retrieved successfully.",
                    products: [testProducts[0]],
                }
            );
        })
    })

    describe("When there are multiple products in the database", () => {
        test("should return 200 with the products", async () => {
            mockFindChain(testProducts); // return test products

            await getProductController({}, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(
                {
                    success: true,
                    countTotal: 2,
                    message: "All products retrieved successfully.",
                    products: testProducts,
                }
            );
        })
    })

    describe("When there is a database error", () => {
        test("should return 500 with an error message", async () => {
            mockFindChain(new Error("DB error"), true);

            await getProductController({}, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error in getting products",
                })
            );
        })
    })
})