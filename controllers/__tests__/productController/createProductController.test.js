import { jest } from "@jest/globals";

// =============== Mocks ===============
const productModelMock = jest.fn(function (data) {
    Object.assign(this, data);
    this.photo = this.photo || { data: null, contentType: null };
    this.save = jest.fn().mockResolvedValue(undefined);
    return this;
});

jest.unstable_mockModule("../../../models/productModel.js", () => ({
    default: productModelMock,
}));

jest.unstable_mockModule("fs", () => ({
    default: {
        readFileSync: jest.fn(() => Buffer.from("file-bytes")),
    },
}));

jest.unstable_mockModule("slugify", () => ({
    default: jest.fn(() => "test-product"),
}));

const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() }); // Mock response

const baseReq = () => ({
    fields: {
        name: "Test Product",
        description: "Nice product",
        price: 99.99,
        category: "507f1f77bcf86cd799439011",
        quantity: 10,
        shipping: true,
    },
    files: {},
}); // Base request

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
    })

    describe("when creating a product without photo", () => {
        test("should return 201", async () => {
            const req = baseReq();

            await createProductController(req, res);

            expect(slugify).toHaveBeenCalledWith("Test Product");

            expect(productModel).toHaveBeenCalledTimes(1);

            // verify constructor input includes slug and fields
            expect(productModel.mock.calls[0][0]).toMatchObject({
                name: "Test Product",
                description: "Nice product",
                price: 99.99,
                category: "507f1f77bcf86cd799439011",
                quantity: 10,
                shipping: true,
                slug: "test-product",
            });

            expect(productModel.mock.instances[0].save).toHaveBeenCalledTimes(1);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Product Created Successfully",
                    products: expect.any(Object),
                })
            );

            expect(fs.default.readFileSync).not.toHaveBeenCalled();
        })
    })
})