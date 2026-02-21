// Song Jia Hui A0259494L
import { describe, jest } from "@jest/globals";
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

const expect200 = (res, orders) => {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ success: true, orders });
};

const expect400 = (res, message) => {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith({ success: false, message });
};

const expect401 = (res, message) => {
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.send).toHaveBeenCalledWith({ success: false, message });
};

const expect404 = (res, message) => {
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith({ success: false, message });
};

const expect500 = (res, message) => {
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith({
    message,
    error: expect.any(String),
    success: false,
  });
};

function mockPopulateChain(result) {
  return {
    populate: jest.fn().mockReturnValueOnce({
      populate: jest.fn().mockResolvedValue(result),
    }),
  };
}

function mockPopulateSortChain(result) {
  return {
    populate: jest.fn().mockReturnValueOnce({
      populate: jest.fn().mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue(result),
      }),
    }),
  };
}

function mockPopulateSortChainReject(error) {
  return {
    populate: jest.fn().mockReturnValueOnce({
      populate: jest.fn().mockReturnValueOnce({
        sort: jest.fn().mockRejectedValue(error),
      }),
    }),
  };
}


// =============== Tests ===============
describe("getOrdersController", () => {

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
  });

  // EP: authenticated user with existing orders partition
  test("[EP] returns orders for the authenticated user", async () => {
    // Arrange
    const req = { user: { _id: "user-id" } };
    const res = mockRes();
    const orders = [{ orderId: 1 }, { orderId: 2 }];
    jest.spyOn(orderModel, "find").mockReturnValue(mockPopulateChain(orders));

    // Act
    await getOrdersController(req, res);

    // Assert
    expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user-id" });
    expect200(res, orders);
  });

  // BVA: boundary of empty result set - zero orders returned
  test("[BVA] returns empty array when no orders found", async () => {
    // Arrange
    const req = { user: { _id: "user-id" } };
    const res = mockRes();
    jest.spyOn(orderModel, "find").mockReturnValue(mockPopulateChain([]));

    // Act
    await getOrdersController(req, res);

    // Assert
    expect200(res, []);
  });

  // EP: unauthenticated partition - req.user is null
  test("[EP] returns 401 if user is not signed in (req.user is null)", async () => {
    // Arrange
    const req = { user: null };
    const res = mockRes();

    // Act
    await getOrdersController(req, res);

    // Assert
    expect401(res, "Not signed in");
    expect(orderModel.find).not.toHaveBeenCalled();
  });

  // EP: unauthenticated partition - req.user exists but _id is missing
  test("[EP] returns 401 if user has no _id", async () => {
    // Arrange
    const req = { user: {} };
    const res = mockRes();

    // Act
    await getOrdersController(req, res);

    // Assert
    expect401(res, "Not signed in");
    expect(orderModel.find).not.toHaveBeenCalled();
  });

  // EP: database error partition - find throws an Error instance
  test("[EP] returns 500 when find throws an Error", async () => {
    // Arrange
    const req = { user: { _id: "user-id" } };
    const res = mockRes();
    jest.spyOn(orderModel, "find").mockImplementation(() => {
      throw new Error("DB error");
    });

    // Act
    await getOrdersController(req, res);

    // Assert
    expect500(res, "Error while getting orders");
  });

  // EP: database error partition - rejection with non-Error object (no .message) triggers fallback
  test("[EP] returns 'Unknown error' when find rejects with a non-Error object", async () => {
    // Arrange
    const req = { user: { _id: "user-id" } };
    const res = mockRes();
    jest.spyOn(orderModel, "find").mockReturnValue({
      populate: jest.fn().mockReturnValueOnce({
        populate: jest.fn().mockRejectedValue({}),
      }),
    });

    // Act
    await getOrdersController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting orders",
      error: "Unknown error",
    });
  });
});

describe("getAllOrdersController", () => {

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
  });

  // EP: valid request partition - orders exist and are returned sorted
  test("[EP] returns all orders sorted by createdAt descending", async () => {
    // Arrange
    const req = {};
    const res = mockRes();
    const orders = [{ orderId: 1 }, { orderId: 2 }];
    jest.spyOn(orderModel, "find").mockReturnValue(mockPopulateSortChain(orders));

    // Act
    await getAllOrdersController(req, res);

    // Assert
    expect(orderModel.find).toHaveBeenCalledWith({});
    expect200(res, orders);
  });

  // BVA: boundary of empty result set - zero orders in the system
  test("[BVA] returns empty array when no orders exist", async () => {
    // Arrange
    const req = {};
    const res = mockRes();
    jest.spyOn(orderModel, "find").mockReturnValue(mockPopulateSortChain([]));

    // Act
    await getAllOrdersController(req, res);

    // Assert
    expect200(res, []);
  });

  // EP: database error partition - sort rejects with an Error instance
  test("[EP] returns 500 when sort rejects with an Error", async () => {
    // Arrange
    const req = {};
    const res = mockRes();
    jest.spyOn(orderModel, "find").mockReturnValue(
      mockPopulateSortChainReject(new Error("DB error"))
    );

    // Act
    await getAllOrdersController(req, res);

    // Assert
    expect(orderModel.find).toHaveBeenCalledWith({});
    expect500(res, "Error while getting orders");
  });

  // EP: database error partition - rejection with non-Error object triggers fallback
  test("[EP] returns 'Unknown error' when sort rejects with a non-Error object", async () => {
    // Arrange
    const req = {};
    const res = mockRes();
    jest.spyOn(orderModel, "find").mockReturnValue(mockPopulateSortChainReject({}));

    // Act
    await getAllOrdersController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting orders",
      error: "Unknown error",
    });
  });
});

describe("updateOrderStatusController", () => {

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
  });

  // EP: valid request partition - both orderId and status present, order exists
  test("[EP] updates order status successfully", async () => {
    // Arrange
    const req = {
      params: { orderId: "order-id" },
      body: { status: "Shipped" },
    };
    const res = mockRes();
    const updatedOrder = { orderId: "order-id", status: "Shipped" };
    const findByIdAndUpdateMock = jest
      .spyOn(orderModel, "findByIdAndUpdate")
      .mockResolvedValue(updatedOrder);

    // Act
    await updateOrderStatusController(req, res);

    // Assert
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

  // EP: missing orderId partition - validation fires before DB is touched
  test("[EP] returns 400 if orderId is missing", async () => {
    // Arrange
    const req = {
      params: {},
      body: { status: "Shipped" },
    };
    const res = mockRes();

    // Act
    await updateOrderStatusController(req, res);

    // Assert
    expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect400(res, "Order ID is required");
  });

  // EP: missing status partition - validation fires before DB is touched
  test("[EP] returns 400 if status is missing", async () => {
    // Arrange
    const req = {
      params: { orderId: "order-id" },
      body: {},
    };
    const res = mockRes();

    // Act
    await updateOrderStatusController(req, res);

    // Assert
    expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect400(res, "Status is required");
  });

  // EP: both orderId and status missing - first guard (orderId) fires
  test("[EP] returns 400 for orderId check when both orderId and status are missing", async () => {
    // Arrange
    const req = {
      params: {},
      body: {},
    };
    const res = mockRes();

    // Act
    await updateOrderStatusController(req, res);

    // Assert
    expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect400(res, "Order ID is required");
  });

  // EP: order not found partition - findByIdAndUpdate resolves null
  test("[EP] returns 404 if order is not found", async () => {
    // Arrange
    const req = {
      params: { orderId: "nonexistent-order-id" },
      body: { status: "Shipped" },
    };
    const res = mockRes();
    jest.spyOn(orderModel, "findByIdAndUpdate").mockResolvedValue(null);

    // Act
    await updateOrderStatusController(req, res);

    // Assert
    expect404(res, "Order not found");
  });

  // EP: database error partition - findByIdAndUpdate rejects with an Error instance
  test("[EP] returns 500 when database throws an Error", async () => {
    // Arrange
    const req = {
      params: { orderId: "order-id" },
      body: { status: "Shipped" },
    };
    const res = mockRes();
    jest
      .spyOn(orderModel, "findByIdAndUpdate")
      .mockRejectedValue(new Error("DB error"));

    // Act
    await updateOrderStatusController(req, res);

    // Assert
    expect500(res, "Error while updating order status");
  });

  // EP: database error partition - rejection with non-Error object triggers fallback
  test("[EP] returns 'Unknown error' when update rejects with a non-Error object", async () => {
    // Arrange
    const req = {
      params: { orderId: "order-id" },
      body: { status: "Shipped" },
    };
    const res = mockRes();
    jest.spyOn(orderModel, "findByIdAndUpdate").mockRejectedValue({});

    // Act
    await updateOrderStatusController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while updating order status",
      error: "Unknown error",
    });
  });
});