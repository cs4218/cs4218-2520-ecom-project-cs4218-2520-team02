import { jest } from "@jest/globals";
await import("../../__mocks__/jest.mocks.js");

const { default: productModel } = await import("../../../models/productModel.js");
const { productListController } =
  await import("../../productController.js");

// =============== Helpers ===============
const PER_PAGE = 6;

const mkRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });

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
      message: "error in per page ctrl",
      error: expect.anything(),
    }),
  );
};

const makeQueryChain = (finalProducts = []) => ({
  select: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  sort: jest.fn().mockResolvedValue(finalProducts), // await ...sort(...)
});

// =============== Tests ===============
describe("productListController", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => restoreConsole());

  test("defaults to page 1 when req.params.page is missing", async () => {
    const req = { params: {} };
    const res = mkRes();

    const products = [{ _id: "p1" }, { _id: "p2" }];
    const query = makeQueryChain(products);
    productModel.find.mockReturnValue(query);

    await productListController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(query.select).toHaveBeenCalledWith("-photo");
    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(PER_PAGE);
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });

    expect200(res, products);
  });

  test("uses correct skip for page 2", async () => {
    const req = { params: { page: 2 } };
    const res = mkRes();

    const products = [{ _id: "p7" }];
    const query = makeQueryChain(products);
    productModel.find.mockReturnValue(query);

    await productListController(req, res);

    expect(query.skip).toHaveBeenCalledWith(6);
    expect(query.limit).toHaveBeenCalledWith(PER_PAGE);
    expect200(res, products);
  });

  test("treats page param string like a number via coercion", async () => {
    const req = { params: { page: "3" } };
    const res = mkRes();

    const products = [{ _id: "p13" }];
    const query = makeQueryChain(products);
    productModel.find.mockReturnValue(query);

    await productListController(req, res);

    expect(query.skip).toHaveBeenCalledWith(12);
    expect200(res, products);
  });

  test("returns 400 when sort rejects", async () => {
    const req = { params: { page: 1 } };
    const res = mkRes();

    const query = {
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockRejectedValue(new Error("DB fail")),
    };
    productModel.find.mockReturnValue(query);

    await productListController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect400(res);
  });

  test("returns 400 when find throws synchronously", async () => {
    const req = { params: { page: 1 } };
    const res = mkRes();

    productModel.find.mockImplementation(() => {
      throw new Error("find crashed");
    });

    await productListController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect400(res);
  });
});
