// Jovin Ang Yusheng, A0273460H
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
        findByIdAndDelete: jest.fn(),
    },
}));

const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });

// =============== Imports ===============
const { default: productModel } = await import("../../../models/productModel.js");
const { deleteProductController } = await import("../../productController.js");

const mockDeleteChain = (resolvedValue, shouldReject = false) => {
    const selectMock = shouldReject
        ? jest.fn().mockRejectedValue(resolvedValue)
        : jest.fn().mockResolvedValue(resolvedValue);

    productModel.findByIdAndDelete.mockReturnValue({
        select: selectMock,
    });

    return { selectMock };
};

// =============== Tests ===============
describe("deleteProductController", () => {
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

    describe("When valid pid is given", () => {
        test("should return 200 if the product exist", async () => {
            mockDeleteChain(testProduct);

            await deleteProductController({
                params: {
                    pid: testProduct._id
                }
            }, res);

            expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(testProduct._id);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Product Deleted successfully",
            });
        })

        test("should return 404 if the product does not exist", async () => {
            const nonExistentId = "5f1d7a3c9e12b4c6d8f0a1b2";
            mockDeleteChain(null);

            await deleteProductController({
                params: {
                    pid: nonExistentId
                }
            }, res);

            expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(nonExistentId);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Product not found",
            });
        })
    })

    describe("When invalid pid is given", () => {
        test("should return 400 if the pid is missing", async () => {
            await deleteProductController({
                params: {},
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Product ID is required",
                })
            );
        })

        test("should return 400 if the pid is an empty string", async () => {
            await deleteProductController({
                params: {
                    pid: "",
                },
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Product ID is required",
                })
            );
        })

        test("should return 400 if the pid is not a valid ObjectId", async () => {
            await deleteProductController({
                params: {
                    pid: "invalid-pid",
                },
            }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Invalid Product ID",
                })
            );
        })
    })

    describe("When there is a database error", () => {
        test("should return 500 with an error message", async () => {
            mockDeleteChain(new Error("DB error"), true);

            await deleteProductController({
                params: { pid: "7c9b1f04a8d2e6c3f5a7b901" },
            }, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error while deleting product",
                })
            );
        })
    })
})