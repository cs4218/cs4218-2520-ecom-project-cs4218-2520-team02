// Jovin Ang Yusheng, A0273460H
import { jest } from "@jest/globals";

// =============== Mocks ===============
await jest.unstable_mockModule("../../../models/productModel.js", () => ({
    default: {
        findById: jest.fn(),
    },
}));

const mockRes = () => ({ set: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() }); // Mock response

// =============== Imports ===============
const { default: productModel } = await import("../../../models/productModel.js");
const { productPhotoController } = await import("../../productController.js");

const mockFindByIdChain = (resolvedValue, shouldReject = false) => {
    const selectMock = shouldReject
        ? jest.fn().mockRejectedValue(resolvedValue)
        : jest.fn().mockResolvedValue(resolvedValue);

    productModel.findById.mockReturnValue({
        select: selectMock,
    });

    return { selectMock };
};

// =============== Tests ===============
describe("productPhotoController", () => {
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

    describe("When provided product ID exists", () => {
        test("should return photo with correct headers if photo exist", async () => {
            const mockProduct = {
                photo: {
                    data: Buffer.from("image-bytes"),
                    contentType: "image/jpeg",
                },
                _id: "7c9b1f04a8d2e6c3f5a7b901"
            };

            mockFindByIdChain(mockProduct);

            await productPhotoController({
                params: {
                    pid: mockProduct._id
                }
            }, res);

            expect(productModel.findById).toHaveBeenCalledWith(mockProduct._id);

            expect(res.set).toHaveBeenCalledWith(
                "Content-Type",
                mockProduct.photo.contentType
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(
                mockProduct.photo.data
            );
        });

        test("should return 404 if no photo", async () => {
            const mockProduct = {
                _id: "7c9b1f04a8d2e6c3f5a7b901"
            };

            mockFindByIdChain(mockProduct);

            await productPhotoController({
                params: {
                    pid: mockProduct._id
                }
            }, res);

            expect(productModel.findById).toHaveBeenCalledWith(mockProduct._id);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Photo not found",
            });
        })
    })

    describe("When provided product ID does not exist", () => {
        test("should return 404", async () => {
            const nonExistentId = "5f1d7a3c9e12b4c6d8f0a1b2";
            mockFindByIdChain(null);

            await productPhotoController({
                params: {
                    pid: nonExistentId
                }
            }, res);

            expect(productModel.findById).toHaveBeenCalledWith(nonExistentId);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Photo not found",
            });
        })
    })

    describe("When no product ID is provided", () => {
        test("should return 400 with an error message", async () => {
            await productPhotoController({
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
    })

    describe("When invalid product ID is provided", () => {
        test("should return 400 with an error message", async () => {
            await productPhotoController({
                params: {
                    pid: "invalid-id"
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
            mockFindByIdChain(new Error("DB error"), true);

            await productPhotoController({
                params: { pid: "7c9b1f04a8d2e6c3f5a7b901" },
            }, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error while getting photo",
                })
            );
        })
    })
})