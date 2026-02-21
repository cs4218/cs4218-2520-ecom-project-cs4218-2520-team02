import { jest } from "@jest/globals";
await import("../../__mocks__/jest.mocks.js");

const { default: productModel } =
  await import("../../../models/productModel.js");
const { productListController } = await import("../../productController.js");

// ================= Helpers =================
const PER_PAGE = 6;

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
});

const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

const makeQueryChain = (finalProducts = []) => ({
  select: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  sort: jest.fn().mockResolvedValue(finalProducts),
});

const expect200 = (res, expectedProducts) => {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    success: true,
    products: expectedProducts,
  });
};

const expect400Page = (res) => {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith({
    success: false,
    message: "Page must be a positive integer.",
  });
};

const expect400Error = (res) => {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      success: false,
      message: "Error in per page controller",
      error: expect.anything(),
    }),
  );
};

// ================= Tests =================
describe("productListController", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => restoreConsole());

  describe("Input validation (EP)", () => {
    test("returns 400 when page is missing", async () => {
      // Arrange
      const req = { params: {} };
      const res = mockRes();

      // Act
      await productListController(req, res);

      // Assert
      expect400Page(res);
      expect(productModel.find).not.toHaveBeenCalled();
    });

    test("returns 400 when page is 0", async () => {
      // Arrange
      const req = { params: { page: 0 } };
      const res = mockRes();

      // Act
      await productListController(req, res);

      // Assert
      expect400Page(res);
      expect(productModel.find).not.toHaveBeenCalled();
    });

    test("returns 400 when page is negative", async () => {
      // Arrange
      const req = { params: { page: -1 } };
      const res = mockRes();

      // Act
      await productListController(req, res);

      // Assert
      expect400Page(res);
      expect(productModel.find).not.toHaveBeenCalled();
    });
  });

  describe("Pagination calculation (BVA)", () => {
    test("page 1 uses skip = 0 and limit = 6 (On Boundary)", async () => {
      // Arrange
      const req = { params: { page: 1 } };
      const res = mockRes();

      const products = [{ _id: "p1" }, { _id: "p2" }];
      const query = makeQueryChain(products);
      productModel.find.mockReturnValue(query);

      // Act
      await productListController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect(query.skip).toHaveBeenCalledWith(0);
      expect(query.limit).toHaveBeenCalledWith(PER_PAGE);
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect200(res, products);
    });

    test("page 10 uses skip = 54 (Above Boundary)", async () => {
      // Arrange
      const req = { params: { page: 10 } };
      const res = mockRes();

      const products = [{ _id: "p61" }];
      const query = makeQueryChain(products);
      productModel.find.mockReturnValue(query);

      // Act
      await productListController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect(query.skip).toHaveBeenCalledWith(54);
      expect(query.limit).toHaveBeenCalledWith(PER_PAGE);
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect200(res, products);
    });
  });

  describe("Error handling (EP)", () => {
    test("returns 400 when query execution rejects", async () => {
      // Arrange
      const req = { params: { page: 1 } };
      const res = mockRes();

      const query = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(new Error("DB fail")),
      };
      productModel.find.mockReturnValue(query);

      // Act
      await productListController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect(query.skip).toHaveBeenCalledWith(0);
      expect(query.limit).toHaveBeenCalledWith(PER_PAGE);
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect400Error(res);
    });
  });
});
