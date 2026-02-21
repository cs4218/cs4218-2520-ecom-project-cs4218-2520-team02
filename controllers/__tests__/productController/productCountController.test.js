import { jest } from "@jest/globals";
await import("../../__mocks__/jest.mocks.js");

const { default: productModel } =
  await import("../../../models/productModel.js");
const { productCountController } = await import("../../productController.js");

// =============== Helpers ===============
const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
});

const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

const makeFindChain = (impl) => ({
  estimatedDocumentCount: jest.fn(impl),
});

const expect200 = (res, total) => {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    success: true,
    total,
  });
};

const expect400 = (res) => {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith({
    message: "Error in product count",
    error: expect.any(Error),
    success: false,
  });
};

// =============== Tests ===============
describe("productCountController", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  describe("Equivalence Partitioning (EP)", () => {
    test("returns 200 with total when count succeeds", async () => {
      // Arrange
      const req = {};
      const res = mockRes();

      const chain = makeFindChain(() => Promise.resolve(123));
      productModel.find.mockReturnValue(chain);

      // Act
      await productCountController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(chain.estimatedDocumentCount).toHaveBeenCalledTimes(1);
      expect200(res, 123);
    });

    test("returns 400 when estimatedDocumentCount rejects", async () => {
      // Arrange
      const req = {};
      const res = mockRes();

      const chain = makeFindChain(() => Promise.reject(new Error("DB fail")));
      productModel.find.mockReturnValue(chain);

      // Act
      await productCountController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(chain.estimatedDocumentCount).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledTimes(1);
      expect400(res);
    });

    test("returns 400 when productModel.find throws synchronously", async () => {
      // Arrange
      const req = {};
      const res = mockRes();

      productModel.find.mockImplementation(() => {
        throw new Error("Find crashed");
      });

      // Act
      await productCountController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(console.log).toHaveBeenCalledTimes(1);
      expect400(res);
    });
  });

  describe("Boundary Value Analysis (BVA)", () => {
    test("handles 0 total (below boundary)", async () => {
      // Arrange
      const req = {};
      const res = mockRes();

      const chain = makeFindChain(() => Promise.resolve(0));
      productModel.find.mockReturnValue(chain);

      // Act
      await productCountController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(chain.estimatedDocumentCount).toHaveBeenCalledTimes(1);
      expect200(res, 0);
    });

    test("handles 1 total (on boundary)", async () => {
      // Arrange
      const req = {};
      const res = mockRes();

      const chain = makeFindChain(() => Promise.resolve(1));
      productModel.find.mockReturnValue(chain);

      // Act
      await productCountController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(chain.estimatedDocumentCount).toHaveBeenCalledTimes(1);
      expect200(res, 1);
    });

    test("handles 10 total (above boundary)", async () => {
      // Arrange
      const req = {};
      const res = mockRes();

      const chain = makeFindChain(() => Promise.resolve(10));
      productModel.find.mockReturnValue(chain);

      // Act
      await productCountController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(chain.estimatedDocumentCount).toHaveBeenCalledTimes(1);
      expect200(res, 10);
    });
  });
});
