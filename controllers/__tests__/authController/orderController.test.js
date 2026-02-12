import { describe, jest } from "@jest/globals";

const { default: orderModel } = (await import("../../../models/orderModel.js"));
const { getOrdersController, getAllOrdersController, 
  testController, updateOrderStatusController } = await import("../../authController.js");

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

const expect400 = (res, message) => {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith({
    success: false,
    message: message,
  });
};

const expect401 = (res, message) => {
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.send).toHaveBeenCalledWith({
    success: false,
    message: message,
  });
};

const expect404 = (res, message) => {
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith({
    success: false,
    message: message,
  });
};

const expect500 = (res, message) => {
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith({
    message: message,
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

  test("returns 401 if user is not signed in", async () => {
    const req = { user: null };
    const res = mockRes();

    await getOrdersController(req, res);

    expect401(res, "Not signed in");
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

    expect500(res, "Error while getting orders");
  });
});

describe("getAllOrdersController", () => {
  let restoreConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => restoreConsole());

  test("returns all orders", async () => {
    const req = {};
    const res = mockRes();

    const query = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      then: function(resolve) { resolve([{ orderId: 1 }, { orderId: 2 }]); },
    };
    jest.spyOn(orderModel, 'find').mockReturnValue(query);

    await getAllOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({});
    expect(query.populate).toHaveBeenCalledWith("products", "-photo");
    expect(query.populate).toHaveBeenCalledWith("buyer", "name");
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });

    expect200(res, [{ orderId: 1 }, { orderId: 2 }]);
  });

  test("returns 500 when find rejects", async () => {
    const req = {};
    const res = mockRes();

    const query = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      then: function(resolve, reject) { reject(new Error("DB error")); },
    };
    jest.spyOn(orderModel, 'find').mockReturnValue(query);

    await getAllOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({});
    expect(query.populate).toHaveBeenCalledWith("products", "-photo");
    expect(query.populate).toHaveBeenCalledWith("buyer", "name");
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });

    expect500(res, "Error while getting orders");
  });
});

describe("updateOrderStatusController", () => {
  test("updating order status", async () => {
    const req = {
      params: { orderId: "order-id" },
      body: { status: "Shipped" },
    };
    const res = mockRes();

    const findByIdAndUpdateMock = jest
      .spyOn(orderModel, "findByIdAndUpdate")
      .mockResolvedValue({ orderId: "order-id", status: "Shipped" });

    await updateOrderStatusController(req, res);

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      "order-id",
      { status: "Shipped" },
      { new: true }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Order status updated",
      order: { orderId: "order-id", status: "Shipped" },
    });

  });

  test("returns 400 if orderId is missing", async () => {
    const req = {
      params: {},
      body: { status: "Shipped" },
    };
    const res = mockRes();

    await updateOrderStatusController(req, res);

    expect400(res, "Order ID is required");
  });

  test("returns 400 if status is missing", async () => {
    const req = {
      params: { orderId: "order-id" },
      body: {},
    };
    const res = mockRes();

    await updateOrderStatusController(req, res);

    expect400(res, "Status is required");
  });
  
  test("returns 404 if order not found", async () => {
    const req = {
      params: { orderId: "nonexistent-order-id" },
      body: { status: "Shipped" },
    };
    const res = mockRes();

    const findByIdAndUpdateMock = jest
      .spyOn(orderModel, "findByIdAndUpdate")
      .mockResolvedValue(null);

    await updateOrderStatusController(req, res);

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      "nonexistent-order-id",
      { status: "Shipped" },
      { new: true }
    );

    expect404(res, "Order not found");
  });

  test("returns 500 when findByIdAndUpdate rejects", async () => {
    const req = {
      params: { orderId: "order-id" },
      body: { status: "Shipped" },
    };
    const res = mockRes();
    
    const findByIdAndUpdateMock = jest
      .spyOn(orderModel, "findByIdAndUpdate")
      .mockRejectedValue(new Error("DB error"));

    await updateOrderStatusController(req, res);

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      "order-id",
      { status: "Shipped" },
      { new: true }
    );

    expect500(res, "Error while updating order status");
  });
});

