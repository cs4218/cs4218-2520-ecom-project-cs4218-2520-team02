import { jest } from "@jest/globals";

const { default: productModel } =
  await import("../../../models/productModel.js");
const { relatedProductController } =
  await import("../../productController.js");

// =============== Helpers ===============
const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
});

const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

const expect200 = (res, expectedProducts) => {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    success: true,
    products: expectedProducts,
  });
};

const expect400 = (res) => {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      success: false,
      message: "Error while geting related products",
      error: expect.anything(),
    }),
  );
};

const makeQueryChain = (finalProducts = []) => ({
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  populate: jest.fn().mockResolvedValue(finalProducts),
});

// =============== Tests ===============
describe("relatedProductController", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => restoreConsole());

  describe("Baseline behavior (happy paths)", () => {
    test("builds query: same category, excludes pid, excludes photo, limits 3, populates category", async () => {
      const req = { params: { pid: "p1", cid: "c1" } };
      const res = mockRes();

      const products = [{ _id: "p2" }, { _id: "p3" }];
      const query = makeQueryChain(products);
      productModel.find.mockReturnValue(query);

      await relatedProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: "c1",
        _id: { $ne: "p1" },
      });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect(query.limit).toHaveBeenCalledWith(3);
      expect(query.populate).toHaveBeenCalledWith("category");

      expect200(res, products);

      // success-path should not use error response
      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.send).not.toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    test("returns 200 with empty array when no related products", async () => {
      const req = { params: { pid: "p1", cid: "c1" } };
      const res = mockRes();

      const query = makeQueryChain([]);
      productModel.find.mockReturnValue(query);

      await relatedProductController(req, res);

      expect200(res, []);
    });
  });

  describe("Error and defensive cases (EP)", () => {
    test("returns 400 when populate rejects", async () => {
      const req = { params: { pid: "p1", cid: "c1" } };
      const res = mockRes();

      const query = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockRejectedValue(new Error("DB fail")),
      };
      productModel.find.mockReturnValue(query);

      await relatedProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: "c1",
        _id: { $ne: "p1" },
      });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect(query.limit).toHaveBeenCalledWith(3);
      expect(query.populate).toHaveBeenCalledWith("category");

      expect400(res);
    });

    test("returns 400 when find throws synchronously", async () => {
      const req = { params: { pid: "p1", cid: "c1" } };
      const res = mockRes();

      productModel.find.mockImplementation(() => {
        throw new Error("find crashed");
      });

      await relatedProductController(req, res);

      expect(productModel.find).toHaveBeenCalled();
      expect400(res);
    });
  });
});
