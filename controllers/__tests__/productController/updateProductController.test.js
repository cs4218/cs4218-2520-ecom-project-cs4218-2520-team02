import { jest } from "@jest/globals";

// =============== Mocks ===============
const testProductId = "7c9b1f04a8d2e6c3f5a7b901";

const testProduct = {
    name: "Test Product",
    description: "Nice product",
    price: 99.99,
    category: "507f1f77bcf86cd799439011",
    quantity: 10,
    shipping: true,
}

const baseReq = () => ({
    params: { pid: testProductId },
    fields: { ...testProduct },
    files: {
        photo: {
            path: "/fake/path.jpg",
            type: "image/jpeg",
        }
    },
}); // Base request

const testProductSlug = "test-product";

const nonExistentId = "5f1d7a3c9e12b4c6d8f0a1b2";

const testPhotoBytes = Buffer.from("file-bytes");

await jest.unstable_mockModule("../../../models/productModel.js", () => ({
    default: {
        findByIdAndUpdate: jest.fn(),
    },
}));

await jest.unstable_mockModule("fs", () => ({
    default: {
        readFileSync: jest.fn(() => testPhotoBytes),
    },
}));

await jest.unstable_mockModule("slugify", () => ({
    default: jest.fn(() => testProductSlug),
}));

const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() }); // Mock response

// =============== Imports ===============
const { default: productModel } = await import("../../../models/productModel.js");
const fs = await import("fs");
const { default: slugify } = await import("slugify");
const { updateProductController } = await import("../../productController.js");

// =============== Tests ===============
describe("updateProductController", () => {
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

    describe("When valid pid and fields are given", () => {
        test("should return 200 if product exists", async () => {
            const req = baseReq();

            const updatedProduct = {
                photo: {
                    data: null,
                    contentType: null,
                },
                save: jest.fn().mockResolvedValue(undefined),
            };

            productModel.findByIdAndUpdate.mockResolvedValueOnce(updatedProduct);

            await updateProductController(req, res);

            expect(slugify).toHaveBeenCalledWith(testProduct.name);

            expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
                testProductId,
                { ...testProduct, slug: testProductSlug },
                { new: true },
            );

            expect(fs.default.readFileSync).toHaveBeenCalledWith("/fake/path.jpg");

            expect(updatedProduct.save).toHaveBeenCalledTimes(1);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Product Updated Successfully",
                })
            );
        })

        test("should return 404 if product does not exist", async () => {
            const req = baseReq();
            req.params.pid = nonExistentId;

            productModel.findByIdAndUpdate.mockResolvedValueOnce(null);

            await updateProductController(req, res);

            expect(slugify).toHaveBeenCalledWith("Test Product");

            expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
                req.params.pid,
                { ...req.fields, slug: testProductSlug },
                { new: true },
            );

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Product not found",
            });
        })
    })

    describe("When invalid pid is given", () => {
        test("should return 400 if the pid is missing", async () => {
            const req = baseReq();
            delete req.params.pid;

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Product ID is required",
                })
            );
        })

        test("should return 400 if the pid is an empty string", async () => {
            const req = baseReq();
            req.params.pid = "";

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Product ID is required",
                })
            );
        })

        test("should return 400 if the pid is not a valid ObjectId", async () => {
            const req = baseReq();
            req.params.pid = "invalid-id";

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Invalid Product ID",
                })
            );
        })
    })

    describe("When valid pid but missing/invalid fields are given", () => {
        test("should return 200 if name contains leading/trailing whitespaces", async () => {
            const req = baseReq();
            req.fields.name = "  Test Product  ";

            const updatedProduct = {
                photo: {
                    data: null,
                    contentType: null,
                },
                save: jest.fn().mockResolvedValue(undefined),
            };

            productModel.findByIdAndUpdate.mockResolvedValueOnce(updatedProduct);

            await updateProductController(req, res);

            expect(slugify).toHaveBeenCalledWith(testProduct.name);

            expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
                testProductId,
                { ...testProduct, slug: testProductSlug },
                { new: true },
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Product Updated Successfully",
                })
            );
        })

        test("should return 400 if name is missing", async () => {
            const req = baseReq();
            delete req.fields.name;

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Name is Required",
                }
            );
        })

        test("should return 400 if description is missing", async () => {
            const req = baseReq();
            delete req.fields.description;

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Description is Required",
                }
            );
        })

        test("should return 400 if price is missing", async () => {
            const req = baseReq();
            delete req.fields.price;

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Price must be a valid non-negative number",
                }
            );
        })

        test("should return 400 if category is missing", async () => {
            const req = baseReq();
            delete req.fields.category;

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Category is Required",
                }
            );
        })

        test("should return 400 if quantity is missing", async () => {
            const req = baseReq();
            delete req.fields.quantity;

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Quantity must be a valid non-negative integer",
                }
            );
        })
    })

    describe("When there is a database error", () => {
        test("should return 500 with an error message when findByIdAndUpdate fails", async () => {
            const req = baseReq();

            productModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("DB error"));

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error while updating product",
                })
            );
        })

        test("should return 500 with an error message when save fails", async () => {
            const req = baseReq();

            productModel.findByIdAndUpdate.mockResolvedValueOnce({
                photo: {
                    data: null,
                    contentType: null,
                },
                save: jest.fn().mockRejectedValue(new Error("DB error")),
            });

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error while updating product",
                })
            );
        })
    })
})