// Jovin Ang Yusheng, A0273460H
import { jest } from "@jest/globals";

// =============== Mocks ===============
const testProduct = {
    name: "Test Product",
    description: "Nice product",
    price: 99.99,
    category: "507f1f77bcf86cd799439011",
    quantity: 10,
    shipping: true,
}

const testPhotoBytes = Buffer.from("file-bytes");

const baseReq = () => ({
    fields: { ...testProduct },
    files: {},
}); // Base request

const productModelMock = jest.fn(function (data) {
    Object.assign(this, data);
    this.photo = this.photo || { data: null, contentType: null };
    this.save = jest.fn().mockResolvedValue(undefined);
    return this;
});

await jest.unstable_mockModule("../../../models/productModel.js", () => ({
    default: productModelMock,
}));

await jest.unstable_mockModule("fs", () => ({
    default: {
        readFileSync: jest.fn(() => testPhotoBytes),
    },
}));

await jest.unstable_mockModule("slugify", () => ({
    default: jest.fn(() => "test-product"),
}));

const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() }); // Mock response

// =============== Imports ===============
const { default: productModel } = await import("../../../models/productModel.js");
const fs = await import("fs");
const { default: slugify } = await import("slugify");
const { createProductController } = await import("../../productController.js");

// =============== Tests ===============
describe("createProductController", () => {
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

    describe("when creating a product without photo", () => {
        test("should return 201", async () => {
            const req = baseReq();

            await createProductController(req, res);

            expect(productModel).toHaveBeenCalledTimes(1);

            // verify constructor input includes slug and fields
            expect(productModel.mock.calls[0][0]).toMatchObject({
                ...testProduct,
                slug: "test-product",
            });

            expect(productModel.mock.instances[0].save).toHaveBeenCalledTimes(1);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Product Created Successfully",
                    products: expect.objectContaining(testProduct),
                })
            );
        })

        test("should return 500 if productModel save throws an error", async () => {
            const req = baseReq();

            productModelMock.mockImplementationOnce(function (data) {
                Object.assign(this, data);
                this.save = jest.fn().mockRejectedValue(new Error("DB error"));
                return this;
            });

            await createProductController(req, res);

            expect(productModel).toHaveBeenCalledTimes(1);

            // verify constructor input includes slug and fields
            expect(productModel.mock.calls[0][0]).toMatchObject({
                ...testProduct,
                slug: "test-product",
            });

            expect(productModel.mock.instances[0].save).toHaveBeenCalledTimes(1);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error in creating product",
                })
            );
        })
    })

    describe("when creating a product with photo of 1MB", () => {
        test("should return 201", async () => {
            const req = baseReq();
            req.files.photo = {
                size: 1000000,
                path: "/fake/path.jpg",
                type: "image/jpeg",
            };

            await createProductController(req, res);

            const instance = productModel.mock.instances[0];

            // verify constructor input includes slug and fields
            expect(productModel.mock.calls[0][0]).toMatchObject({
                ...testProduct,
                slug: "test-product",
            });

            expect(fs.default.readFileSync).toHaveBeenCalledWith("/fake/path.jpg");

            expect(instance.photo.data).toEqual(testPhotoBytes);
            expect(instance.photo.contentType).toBe("image/jpeg");

            expect(instance.save).toHaveBeenCalledTimes(1);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Product Created Successfully",
                    products: expect.objectContaining({
                        ...testProduct,
                        photo: {
                            data: testPhotoBytes,
                            contentType: "image/jpeg",
                        },
                    }),
                })
            );
        });
    })

    describe("when creating a product with photo below 1MB", () => {
        test("should return 201", async () => {
            const req = baseReq();
            req.files.photo = {
                size: 999999,
                path: "/fake/path.jpg",
                type: "image/jpeg",
            };

            await createProductController(req, res);

            const instance = productModel.mock.instances[0];

            // verify constructor input includes slug and fields
            expect(productModel.mock.calls[0][0]).toMatchObject({
                ...testProduct,
                slug: "test-product",
            });

            expect(fs.default.readFileSync).toHaveBeenCalledWith("/fake/path.jpg");

            expect(instance.photo.data).toEqual(testPhotoBytes);
            expect(instance.photo.contentType).toBe("image/jpeg");

            expect(instance.save).toHaveBeenCalledTimes(1);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Product Created Successfully",
                    products: expect.objectContaining({
                        ...testProduct,
                        photo: {
                            data: testPhotoBytes,
                            contentType: "image/jpeg",
                        },
                    }),
                })
            );
        });
    })

    describe("when creating a product with photo above 1MB", () => {
        test("should return 400", async () => {
            const req = baseReq();
            req.files.photo = {
                size: 1000001,
                path: "/fake/path.jpg",
                type: "image/jpeg",
            };

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Photo size should be 1MB or less",
                }
            );
        });
    })

    describe("when creating product with name containing leading/trailing whitespaces", () => {
        test("should trim name and return 201", async () => {
            const req = baseReq();
            req.fields.name = "  Test Product  ";

            await createProductController(req, res);

            expect(slugify).toHaveBeenCalledWith("Test Product");

            expect(productModel).toHaveBeenCalledTimes(1);

            // verify constructor input includes slug and fields
            expect(productModel.mock.calls[0][0]).toMatchObject({
                ...testProduct,
                slug: "test-product",
            });

            expect(productModel.mock.instances[0].save).toHaveBeenCalledTimes(1);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Product Created Successfully",
                    products: expect.objectContaining(testProduct),
                })
            );
        })
    })

    describe("when creating product without name", () => {
        test("should return 400", async () => {
            const req = baseReq();
            delete req.fields.name;

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Name is Required",
                }
            );
        });
    })

    describe("when creating product with null name", () => {
        test("should return 400", async () => {
            const req = baseReq();
            req.fields.name = null;

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Name is Required",
                }
            );
        });
    })

    describe("when creating product with empty name", () => {
        test("should return 400", async () => {
            const req = baseReq();
            req.fields.name = "";

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Name is Required",
                }
            );
        });
    })

    describe("when creating product with name containing only whitespaces", () => {
        test("should return 400", async () => {
            const req = baseReq();
            req.fields.name = " ";

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Name is Required",
                }
            );
        });
    })

    describe("when creating product without description", () => {
        test("should return 400", async () => {
            const req = baseReq();
            delete req.fields.description;

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Description is Required",
                }
            );
        });
    })

    describe("when creating product with $0 price", () => {
        test("should return 201", async () => {
            const req = baseReq();
            req.fields.price = 0;

            await createProductController(req, res);

            expect(productModel).toHaveBeenCalledTimes(1);

            // verify constructor input includes slug and fields
            expect(productModel.mock.calls[0][0]).toMatchObject({
                ...testProduct,
                price: 0,
                slug: "test-product",
            });

            expect(productModel.mock.instances[0].save).toHaveBeenCalledTimes(1);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Product Created Successfully",
                    products: expect.objectContaining({
                        ...testProduct,
                        price: 0,
                    }),
                })
            );
        });
    })

    describe("when creating product with negative price", () => {
        test("should return 400", async () => {
            const req = baseReq();
            req.fields.price = -0.1;

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Price must be a valid non-negative number",
                }
            );
        });
    })

    describe("when creating a product with a non-numeric price", () => {
        test("should return 400", async () => {
            const req = baseReq();
            req.fields.price = "test";

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Price must be a valid non-negative number",
                }
            );
        });
    })

    describe("when creating product without price", () => {
        test("should return 400", async () => {
            const req = baseReq();
            delete req.fields.price;

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Price must be a valid non-negative number",
                }
            );
        });
    })

    describe("when creating product with empty price", () => {
        test("should return 400", async () => {
            const req = baseReq();
            req.fields.price = "";

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Price must be a valid non-negative number",
                }
            );
        });
    })

    describe("when creating product without category", () => {
        test("should return 400", async () => {
            const req = baseReq();
            delete req.fields.category;

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Category is Required",
                }
            );
        });
    })

    describe("when creating product with 0 quantity", () => {
        test("should return 201", async () => {
            const req = baseReq();
            req.fields.quantity = 0;

            await createProductController(req, res);

            expect(productModel).toHaveBeenCalledTimes(1);

            // verify constructor input includes slug and fields
            expect(productModel.mock.calls[0][0]).toMatchObject({
                ...testProduct,
                quantity: 0,
                slug: "test-product",
            });

            expect(productModel.mock.instances[0].save).toHaveBeenCalledTimes(1);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Product Created Successfully",
                    products: expect.objectContaining({
                        ...testProduct,
                        quantity: 0,
                    }),
                })
            );
        });
    })

    describe("when creating product with negative quantity", () => {
        test("should return 400", async () => {
            const req = baseReq();
            req.fields.quantity = -1;

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Quantity must be a valid non-negative integer",
                }
            );
        });
    })

    describe("when creating a product with a non-integer quantity", () => {
        test("should return 400 when quantity is a float", async () => {
            const req = baseReq();
            req.fields.quantity = 10.90;

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Quantity must be a valid non-negative integer",
                }
            );
        });

        test("should return 400 when quantity is a non-numeric string", async () => {
            const req = baseReq();
            req.fields.quantity = "test";

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Quantity must be a valid non-negative integer",
                }
            );
        });
    })

    describe("when creating product without quantity", () => {
        test("should return 400", async () => {
            const req = baseReq();
            delete req.fields.quantity;

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Quantity must be a valid non-negative integer",
                }
            );
        });
    })

    describe("when creating product with empty quantity", () => {
        test("should return 400", async () => {
            const req = baseReq();
            req.fields.quantity = "";

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                {
                    error: "Quantity must be a valid non-negative integer",
                }
            );
        });
    })
})