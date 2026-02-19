import { describe, jest } from "@jest/globals";
import { model } from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
await import("../../__mocks__/jest.mocks.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelPath = path.resolve(__dirname, "../../../models/orderModel.js");

await jest.unstable_mockModule(modelPath, () => ({
  default: {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

const { default: orderModel } = (await import("../../../models/orderModel.js"));
const { getOrdersController, getAllOrdersController, updateOrderStatusController } = 
  await import("../../authController.js");

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

function mockMongooseQuery(result) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
  };

  chain.populate
    .mockReturnValueOnce(chain) 
    .mockReturnValueOnce(Promise.resolve(result)); 

  return chain;
}


// =============== Tests ===============
describe("getOrdersController", () => {
  let restoreConsole;

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    restoreConsole = silenceConsole();
  });

  afterEach(() => restoreConsole());

  test("returns orders for the authenticated user", async () => {
    const req = { user: { _id: "user-id" } };
    const res = mockRes();

    const orders = [{ orderId: 1 }, { orderId: 2 }];
    const mockQuery = mockMongooseQuery(orders);

    jest.spyOn(orderModel, 'find').mockReturnValue(mockQuery);

    await getOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user-id" });
    expect(mockQuery.populate).toHaveBeenCalledWith("products", "-photo");
    expect(mockQuery.populate).toHaveBeenCalledWith("buyer", "name");

    expect200(res, [{ orderId: 1 }, { orderId: 2 }]);
  });

  test("returns empty array when no orders found", async () => {
    const req = { user: { _id: "user-id" } };
    const res = mockRes();

    const mockQuery = mockMongooseQuery([]);
    jest.spyOn(orderModel, "find").mockReturnValue(mockQuery);

    await getOrdersController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      orders: [],
    });
  });

  test("returns 401 if user is not signed in", async () => {
    const req = { user: null };
    const res = mockRes();

    await getOrdersController(req, res);

    expect401(res, "Not signed in");
    expect(orderModel.find).not.toHaveBeenCalled();
  });

  test("returns 401 if user has no _id", async () => {
    const req = { user: {} };
    const res = mockRes();

    await getOrdersController(req, res);

    expect401(res, "Not signed in");
    expect(orderModel.find).not.toHaveBeenCalled();
  });

  test("returns 500 when find rejects", async () => {
    const req = { user: { _id: "user-id" } };
    const res = mockRes();

    jest.spyOn(orderModel, 'find').mockImplementation(() => { {
      throw new Error("DB error");
    }});

    await getOrdersController(req, res);

    expect500(res, "Error while getting orders");
  });
});

describe("getAllOrdersController", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test("returns all orders", async () => {
    const req = {};
    const res = mockRes();

    const orders = [{ orderId: 1 }, { orderId: 2 }];
    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(orders),
    }
    jest.spyOn(orderModel, 'find').mockReturnValue(mockQuery);

    await getAllOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({});
    expect(mockQuery.populate).toHaveBeenCalledWith("products", "-photo");
    expect(mockQuery.populate).toHaveBeenCalledWith("buyer", "name");
    expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });

    expect200(res, [{ orderId: 1 }, { orderId: 2 }]);
  });

  test("returns empty array when no orders found", async () => {
    const req = {};
    const res = mockRes();

    const orders = [];
    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(orders),
    }
    jest.spyOn(orderModel, 'find').mockReturnValue(mockQuery);

    await getAllOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({});
    expect(mockQuery.populate).toHaveBeenCalledWith("products", "-photo");
    expect(mockQuery.populate).toHaveBeenCalledWith("buyer", "name");
    expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });

    expect200(res, []);
  });

  test("returns 500 when find rejects", async () => {
    const req = {};
    const res = mockRes();

    const query = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockRejectedValue(new Error("DB error")),
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test("updates order status successfully", async () => {
    const req = {
      params: { orderId: "order-id" },
      body: { status: "Shipped" },
    };
    const res = mockRes();

    const updatedOrder = { orderId: "order-id", status: "Shipped" };

    const findByIdAndUpdateMock = jest
      .spyOn(orderModel, "findByIdAndUpdate")
      .mockResolvedValue(updatedOrder);

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
      order: updatedOrder,
    });
  });

  test("returns 400 if orderId is missing", async () => {
    const req = {
      params: {},
      body: { status: "Shipped" },
    };
    const res = mockRes();

    await updateOrderStatusController(req, res);

    expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect400(res, "Order ID is required");
  });

  test("returns 400 if status is missing", async () => {
    const req = {
      params: { orderId: "order-id" },
      body: {},
    };
    const res = mockRes();

    await updateOrderStatusController(req, res);

    expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
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

  test("returns 500 when database throws", async () => {
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
