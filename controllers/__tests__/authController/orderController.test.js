import { describe, jest } from "@jest/globals";

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

  test("returns 401 if user is not signed in", async () => {
    const req = { user: null };
    const res = mockRes();

    await getOrdersController(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Not signed in",
    });
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

    const { getAllOrdersController } = await import("../../authController.js");
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

    const { getAllOrdersController } = await import("../../authController.js");
    await getAllOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({});
    expect(query.populate).toHaveBeenCalledWith("products", "-photo");
    expect(query.populate).toHaveBeenCalledWith("buyer", "name");
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });

    expect500(res);
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

    const { updateOrderStatusController } = await import(
      "../../authController.js"
    );
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

    const { updateOrderStatusController } = await import(
      "../../authController.js"
    );
    await updateOrderStatusController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Order ID is required",
    });
  });

  test("returns 400 if status is missing", async () => {
    const req = {
      params: { orderId: "order-id" },
      body: {},
    };
    const res = mockRes();

    const { updateOrderStatusController } = await import(
      "../../authController.js"
    );
    await updateOrderStatusController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Status is required",
    });
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

    const { updateOrderStatusController } = await import(
      "../../authController.js"
    );
    await updateOrderStatusController(req, res);

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      "nonexistent-order-id",
      { status: "Shipped" },
      { new: true }
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Order not found",
    });
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
    const { updateOrderStatusController } = await import(
      "../../authController.js"
    );
    await updateOrderStatusController(req, res);

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      "order-id",
      { status: "Shipped" },
      { new: true }
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while updating order status",
      error: expect.any(String),
    });
  });
});


