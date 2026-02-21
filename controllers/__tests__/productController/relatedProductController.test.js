// Censon Lee Lemuel John Alejo, A0273436B
import { jest } from "@jest/globals";
await import("../../__mocks__/jest.mocks.js");

const { default: productModel } =
  await import("../../../models/productModel.js");
const { relatedProductController } = await import("../../productController.js");

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

  describe("Query construction (EP)", () => {
    test("builds query + chain: category match, excludes pid, excludes photo, limits 3, populates category", async () => {
      // Arrange
      const req = { params: { pid: "p1", cid: "c1" } };
      const res = mockRes();

      const products = [{ _id: "p2" }, { _id: "p3" }];
      const query = makeQueryChain(products);
      productModel.find.mockReturnValue(query);

      // Act
      await relatedProductController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({
        category: "c1",
        _id: { $ne: "p1" },
      });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect(query.limit).toHaveBeenCalledWith(3);
      expect(query.populate).toHaveBeenCalledWith("category");
      expect200(res, products);
    });
  });

  describe("Response partition (EP)", () => {
    test("returns 200 with empty array when there are no related products", async () => {
      // Arrange
      const req = { params: { pid: "p1", cid: "c1" } };
      const res = mockRes();

      const query = makeQueryChain([]);
      productModel.find.mockReturnValue(query);

      // Act
      await relatedProductController(req, res);

      // Assert
      expect200(res, []);
    });
  });

  describe("Error handling (EP)", () => {
    test("returns 400 when DB fails", async () => {
      // Arrange
      const req = { params: { pid: "p1", cid: "c1" } };
      const res = mockRes();

      const query = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockRejectedValue(new Error("DB fail")),
      };
      productModel.find.mockReturnValue(query);

      // Act
      await relatedProductController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({
        category: "c1",
        _id: { $ne: "p1" },
      });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect(query.limit).toHaveBeenCalledWith(3);
      expect(query.populate).toHaveBeenCalledWith("category");
      expect400(res);
    });
  });
});
