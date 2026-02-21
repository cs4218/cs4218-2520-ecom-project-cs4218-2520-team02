// Censon Lee Lemuel John Alejo, A0273436B
import { jest } from "@jest/globals";
await import("../../__mocks__/jest.mocks.js");

const { default: categoryModel } =
  await import("../../../models/categoryModel.js");
const { default: productModel } =
  await import("../../../models/productModel.js");
const { productCategoryController } =
  await import("../../productController.js");

// ================= Helpers =================
const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
});

const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

const expect200 = (res, expectedCategory, expectedProducts) => {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    success: true,
    category: expectedCategory,
    products: expectedProducts,
  });
};

const expect400 = (res) => {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      success: false,
      message: "Error while getting products",
      error: expect.anything(),
    }),
  );
};

const makeFindPopulateChain = (finalProducts = []) => ({
  populate: jest.fn().mockResolvedValue(finalProducts),
});

// ================= Tests =================
describe("productCategoryController", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => restoreConsole());

  describe("Success (EP + BVA: product list size 0,1,10)", () => {
    test.each([
      ["0 products", []],
      ["1 product", [{ _id: "p1" }]],
      [
        "10 products",
        Array.from({ length: 10 }, (_, i) => ({ _id: `p${i + 1}` })),
      ],
    ])("finds category by slug, then returns %s", async (_name, products) => {
      // Arrange
      const req = { params: { slug: "electronics" } };
      const res = mockRes();

      const category = { _id: "c1", slug: "electronics", name: "Electronics" };
      categoryModel.findOne.mockResolvedValue(category);

      const query = makeFindPopulateChain(products);
      productModel.find.mockReturnValue(query);

      // Act
      await productCategoryController(req, res);

      // Assert
      expect(categoryModel.findOne).toHaveBeenCalledWith({
        slug: "electronics",
      });
      expect(productModel.find).toHaveBeenCalledWith({ category });
      expect(query.populate).toHaveBeenCalledWith("category");
      expect200(res, category, products);
    });
  });

  describe("Error handling (EP)", () => {
    test("returns 400 when DB query fails", async () => {
      // Arrange
      const req = { params: { slug: "electronics" } };
      const res = mockRes();

      categoryModel.findOne.mockRejectedValue(new Error("DB fail"));

      // Act
      await productCategoryController(req, res);

      // Assert
      expect(categoryModel.findOne).toHaveBeenCalledWith({
        slug: "electronics",
      });
      expect(productModel.find).not.toHaveBeenCalled();
      expect400(res);
    });
  });
});
