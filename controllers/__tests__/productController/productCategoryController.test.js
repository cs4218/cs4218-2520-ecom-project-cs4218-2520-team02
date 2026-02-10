import { jest } from "@jest/globals";

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

  describe("Baseline behavior (happy path)", () => {
    test("finds category by slug, then finds products by that category and populates category", async () => {
      const req = { params: { slug: "electronics" } };
      const res = mockRes();

      const category = { _id: "c1", slug: "electronics", name: "Electronics" };
      categoryModel.findOne.mockResolvedValue(category);

      const products = [{ _id: "p1" }, { _id: "p2" }];
      const query = makeFindPopulateChain(products);
      productModel.find.mockReturnValue(query);

      await productCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({
        slug: "electronics",
      });
      expect(productModel.find).toHaveBeenCalledWith({ category });
      expect(query.populate).toHaveBeenCalledWith("category");

      expect200(res, category, products);
    });
  });

  describe("Error and defensive cases", () => {
    test("returns 400 when DB fails", async () => {
      const req = { params: { slug: "electronics" } };
      const res = mockRes();

      categoryModel.findOne.mockRejectedValue(new Error("DB fail"));

      await productCategoryController(req, res);

      expect400(res);
    });
  });
});
