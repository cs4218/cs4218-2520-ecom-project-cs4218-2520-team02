import { jest } from "@jest/globals";
await import("../../__mocks__/jest.mocks.js");

const { default: productModel } =
  await import("../../../models/productModel.js");
const { searchProductController } = await import("../../productController.js");

// =============== Helpers ===============
const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
  json: jest.fn(),
});

const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

const expect200 = (res, expectedResults) => {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({
    success: true,
    results: expectedResults,
  });
};

const expect400ApiError = (res) => {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      success: false,
      message: "Error In Search Product API",
      error: expect.anything(),
    }),
  );
};

const expect400KeywordRequired = (res) => {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith({
    success: false,
    message: "Keyword is required",
  });
  expect(res.json).not.toHaveBeenCalled();
};

const makeQuery = (finalResults = []) => ({
  select: jest.fn().mockResolvedValue(finalResults), // await ...select()
});

// =============== Tests ===============
describe("searchProductController", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => restoreConsole());

  describe("Baseline behavior (happy paths)", () => {
    test("trims keyword, builds escaped case-insensitive regex query over name OR description, excludes photo", async () => {
      const req = { params: { keyword: "   laptop   " } };
      const res = mockRes();

      const results = [{ _id: "p1", name: "Laptop Pro" }];
      const query = makeQuery(results);
      productModel.find.mockReturnValue(query);

      await searchProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: "laptop", $options: "i" } },
          { description: { $regex: "laptop", $options: "i" } },
        ],
      });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect200(res, results);
    });

    test("escapes regex metacharacters so they are treated literally", async () => {
      const req = { params: { keyword: ".*" } };
      const res = mockRes();

      const results = [{ _id: "p1" }];
      const query = makeQuery(results);
      productModel.find.mockReturnValue(query);

      await searchProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: "\\.\\*", $options: "i" } },
          { description: { $regex: "\\.\\*", $options: "i" } },
        ],
      });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect200(res, results);
    });
  });

  describe("Equivalence partitions (input validation)", () => {
    test.each([
      ["missing keyword (undefined)", { params: {} }],
      ["empty string", { params: { keyword: "" } }],
      ["whitespace-only", { params: { keyword: "   " } }],
      ["non-string keyword", { params: { keyword: 123 } }],
    ])("returns 400 when keyword is invalid: %s", async (_name, req) => {
      const res = mockRes();

      await searchProductController(req, res);

      expect(productModel.find).not.toHaveBeenCalled();
      expect400KeywordRequired(res);
    });
  });

  describe("Error and defensive cases", () => {
    test("returns 400 when select rejects", async () => {
      const req = { params: { keyword: "laptop" } };
      const res = mockRes();

      const query = {
        select: jest.fn().mockRejectedValue(new Error("DB fail")),
      };
      productModel.find.mockReturnValue(query);

      await searchProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: "laptop", $options: "i" } },
          { description: { $regex: "laptop", $options: "i" } },
        ],
      });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect400ApiError(res);
    });

    test("returns 400 when find throws synchronously", async () => {
      const req = { params: { keyword: "laptop" } };
      const res = mockRes();

      productModel.find.mockImplementation(() => {
        throw new Error("find crashed");
      });

      await searchProductController(req, res);

      expect(productModel.find).toHaveBeenCalled();
      expect400ApiError(res);
    });
  });
});
