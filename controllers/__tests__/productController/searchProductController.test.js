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
  expect(res.send).not.toHaveBeenCalled();
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

  describe("Input Validation (EP)", () => {
    test.each([
      ["missing keyword (undefined)", { params: {} }],
      ["empty string", { params: { keyword: "" } }],
      ["whitespace-only", { params: { keyword: "   " } }],
    ])("returns 400 when keyword is invalid: %s", async (_name, req) => {
      // Arrange
      const res = mockRes();

      // Act
      await searchProductController(req, res);

      // Assert
      expect(productModel.find).not.toHaveBeenCalled();
      expect400KeywordRequired(res);
    });
  });

  describe("Valid Search (EP)", () => {
    test("trims white space", async () => {
      // Arrange
      const req = { params: { keyword: "   laptop   " } };
      const res = mockRes();

      const results = [{ _id: "p1", name: "Laptop Pro" }];
      const query = makeQuery(results);
      productModel.find.mockReturnValue(query);

      // Act
      await searchProductController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledTimes(1);
      expect(productModel.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: "laptop", $options: "i" } },
          { description: { $regex: "laptop", $options: "i" } },
        ],
      });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect200(res, results);
    });

    test("allows regex metacharacters", async () => {
      // Arrange
      const req = { params: { keyword: ".*" } };
      const res = mockRes();

      const results = [{ _id: "p1" }];
      const query = makeQuery(results);
      productModel.find.mockReturnValue(query);

      // Act
      await searchProductController(req, res);

      // Assert
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

  describe("Boundary Value Analysis (BVA): keyword length", () => {
    test("accepts a 1-character keyword (On Boundary: 1 char)", async () => {
      // Arrange
      const req = { params: { keyword: "a" } };
      const res = mockRes();

      const results = [{ _id: "p1" }];
      const query = makeQuery(results);
      productModel.find.mockReturnValue(query);

      // Act
      await searchProductController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: "a", $options: "i" } },
          { description: { $regex: "a", $options: "i" } },
        ],
      });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect200(res, results);
    });

    test("accepts a 2+ character keyword (Above Boundary: 2+ chars)", async () => {
      // Arrange
      const req = { params: { keyword: "ab" } };
      const res = mockRes();

      const results = [{ _id: "p1" }, { _id: "p2" }];
      const query = makeQuery(results);
      productModel.find.mockReturnValue(query);

      // Act
      await searchProductController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: "ab", $options: "i" } },
          { description: { $regex: "ab", $options: "i" } },
        ],
      });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect200(res, results);
    });
  });

  describe("Error handling (EP)", () => {
    test("returns 400 when select rejects", async () => {
      // Arrange
      const req = { params: { keyword: "laptop" } };
      const res = mockRes();

      const query = {
        select: jest.fn().mockRejectedValue(new Error("DB fail")),
      };
      productModel.find.mockReturnValue(query);

      // Act
      await searchProductController(req, res);

      // Assert
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
      // Arrange
      const req = { params: { keyword: "laptop" } };
      const res = mockRes();

      productModel.find.mockImplementation(() => {
        throw new Error("find crashed");
      });

      // Act
      await searchProductController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledTimes(1);
      expect400ApiError(res);
    });
  });
});
