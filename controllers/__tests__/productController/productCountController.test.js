import { jest } from "@jest/globals";

const { default: productModel } = await import("../../../models/productModel.js");
const { productCountController } =
  await import("../../productController.js");

// =============== Helpers ===============
const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });

const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

const expect200 = (res, total) => {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ success: true, total });
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

  afterEach(() => restoreConsole());

  test("returns the total product count", async () => {
    const req = {};
    const res = mockRes();

    const query = {
      estimatedDocumentCount: jest.fn().mockResolvedValue(123),
    };
    productModel.find.mockReturnValue(query);

    await productCountController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(query.estimatedDocumentCount).toHaveBeenCalled();

    expect200(res, 123);
  });

  test("returns 400 when estimatedDocumentCount rejects", async () => {
    const req = {};
    const res = mockRes();

    const query = {
      estimatedDocumentCount: jest.fn().mockRejectedValue(new Error("DB fail")),
    };
    productModel.find.mockReturnValue(query);

    await productCountController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(query.estimatedDocumentCount).toHaveBeenCalled();

    expect400(res);
  });

  test("returns 400 when productModel.find throws synchronously", async () => {
    const req = {};
    const res = mockRes();

    productModel.find.mockImplementation(() => {
      throw new Error("Find crashed");
    });

    await productCountController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});

    expect400(res);
  });
});
