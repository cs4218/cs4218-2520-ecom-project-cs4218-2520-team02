import { jest } from "@jest/globals";

const orderModel = (await import("../../../models/orderModel.js")).default;
const { getOrdersController } = await import("../../authController.js");

// =============== Helpers ===============
const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });

const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

const expect200 = (res, orders) => {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ success: true, orders });
};

const expect500 = (res) => {
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith({
    message: "Error while getting orders",
    error: expect.any(String),
    success: false,
  });
};

// =============== Tests ===============
describe("getOrdersController", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => restoreConsole());

  test("returns orders for the authenticated user", async () => {
    const req = { user: { _id: "user-id" } };
    const res = mockRes();

    const query = {
      populate: jest.fn().mockReturnThis(),
      then: function(resolve) { resolve([{ orderId: 1 }, { orderId: 2 }]); },
    };
    jest.spyOn(orderModel, 'find').mockReturnValue(query);

    await getOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user-id" });
    expect(query.populate).toHaveBeenCalledWith("products", "-photo");
    expect(query.populate).toHaveBeenCalledWith("buyer", "name");

    expect200(res, [{ orderId: 1 }, { orderId: 2 }]);
  });

  test("returns 500 when find rejects", async () => {
    const req = { user: { _id: "user-id" } };
    const res = mockRes();

    const query = {
      populate: jest.fn().mockReturnThis(),
      then: function(resolve, reject) { reject(new Error("DB error")); },
    };
    jest.spyOn(orderModel, 'find').mockReturnValue(query);

    await getOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user-id" });
    expect(query.populate).toHaveBeenCalledWith("products", "-photo");
    expect(query.populate).toHaveBeenCalledWith("buyer", "name");

    expect500(res);
  });
});