import mockingoose from "mockingoose";
import mongoose from "mongoose";
import Order from "./orderModel.js";

describe("Order Model Unit Tests", () => {

  beforeEach(() => {
    mockingoose.resetAll();
  });

  const defaultOrder = {
    _id: new mongoose.Types.ObjectId().toString(),
    products: [new mongoose.Types.ObjectId().toString(), new mongoose.Types.ObjectId().toString()],
    payment: { method: "credit card", amount: 100 },
    buyer: new mongoose.Types.ObjectId().toString(),
    status: "Not Processed",
  };

  describe("Order validation", () => {

    describe("Status validation", () => {

      it("[EP] should default status to 'Not Processed' when status is omitted at instantiation", async () => {
        // Arrange
        const { status, ...orderWithoutStatus } = defaultOrder;
        const order = new Order(orderWithoutStatus);

        // Act & Assert
        await expect(order.validate()).resolves.toBeUndefined();
        expect(order.status).toBe("Not Processed");
      });

      it("[EP] should retain null status when status is explicitly set to null (null bypasses enum check)", async () => {
        // Arrange
        const order = new Order({ ...defaultOrder, status: null });

        // Act & Assert
        await expect(order.validate()).resolves.toBeUndefined();
        expect(order.status).toBeNull();
      });

      it("[EP] should fail validation with a ValidationError when status is an empty string", async () => {
        // Arrange
        const order = new Order({ ...defaultOrder, status: "" });

        // Act & Assert
        await expect(order.validate()).rejects.toThrow(mongoose.Error.ValidationError);
      });

      // EP: invalid string partition - arbitrary value not present in the enum list
      it("[EP] should fail validation with a ValidationError when status has an invalid value", async () => {
        // Arrange
        const order = new Order({ ...defaultOrder, status: "InvalidStatus" });

        // Act & Assert
        await expect(order.validate()).rejects.toThrow(mongoose.Error.ValidationError);
      });

      test.each([
        ["Not Processed"],
        ["Processing"],
        ["Shipped"],
        ["Delivered"],
        ["Cancelled"],
      ])("[EP] should pass validation for valid status: '%s'", async (status) => {
        // Arrange
        const order = new Order({ ...defaultOrder, status });

        // Act & Assert
        await expect(order.validate()).resolves.toBeUndefined();
      });
    });
  });

  it("[EP] should create and save an order successfully with valid data", async () => {
    // Arrange
    const orderData = { ...defaultOrder };
    mockingoose(Order).toReturn(orderData, "save");
    const order = new Order(orderData);

    // Act
    const savedOrder = await order.save();

    // Assert 
    expect(savedOrder._id.toString()).toBe(orderData._id);
    expect(savedOrder.products.map(p => p.toString())).toEqual(orderData.products);
    expect(savedOrder.payment).toEqual(orderData.payment);
    expect(savedOrder.buyer.toString()).toBe(orderData.buyer);
    expect(savedOrder.status).toBe(orderData.status);
  });

  it("[EP] should return an order with correct fields when found by ID", async () => {
    // Arrange
    const orderData = { ...defaultOrder };
    mockingoose(Order).toReturn(orderData, "findOne");

    // Act
    const foundOrder = await Order.findOne({ _id: orderData._id });

    // Assert
    expect(foundOrder._id.toString()).toBe(orderData._id);
    expect(foundOrder.products.map(p => p.toString())).toEqual(orderData.products);
    expect(foundOrder.payment).toEqual(orderData.payment);
    expect(foundOrder.buyer.toString()).toBe(orderData.buyer);
    expect(foundOrder.status).toBe(orderData.status);
  });

  it("[EP] should return null when no order matches the given ID", async () => {
    // Arrange
    mockingoose(Order).toReturn(null, "findOne");
    const nonExistentId = new mongoose.Types.ObjectId().toString();

    // Act
    const foundOrder = await Order.findOne({ _id: nonExistentId });

    // Assert
    expect(foundOrder).toBeNull();
  });
});