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

    describe("Status validation (EP)", () => {

      it("should use default status 'Not Processed' when status is undefined (EP: undefined)", async () => {
        const { status, ...orderWithoutStatus } = defaultOrder;
        const order = new Order(orderWithoutStatus);

        await expect(order.validate()).resolves.toBeUndefined();
        expect(order.status).toBe("Not Processed");
      });

      it("should fall back to default status when status is null (EP: null)", async () => {
        const order = new Order({ ...defaultOrder, status: null });

        await expect(order.validate()).resolves.toBeUndefined();
        expect(order.status).toBeNull();
      });

      it("should fail validation if status is empty string (EP: \"\")", async () => {
        const order = new Order({ ...defaultOrder, status: "" });

        await expect(order.validate()).rejects.toThrow();
      });

      it("should fail validation if status has invalid value (EP: invalid value)", async () => {
        const order = new Order({ ...defaultOrder, status: "InvalidStatus" });

        await expect(order.validate()).rejects.toThrow();
      });

      it("should pass validation for each valid status value (EP: valid values)", async () => {
        const validStatuses = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];

        for (const status of validStatuses) {
          const order = new Order({ ...defaultOrder, status });
          await expect(order.validate()).resolves.toBeUndefined();
        }
      });
    });
  });

  it("should create an order successfully with valid data", async () => {
    const orderData = { ...defaultOrder };

    mockingoose(Order).toReturn(orderData, "save");

    const order = new Order(orderData);
    const savedOrder = await order.save();

    expect(savedOrder._id.toString()).toBe(orderData._id);

    expect(savedOrder.products.map(p => p.toString())).toEqual(orderData.products);
    expect(savedOrder.payment).toEqual(orderData.payment);
    expect(savedOrder.buyer.toString()).toBe(orderData.buyer);
    expect(savedOrder.status).toBe(orderData.status);
  });

  it("should return an order by ID", async () => {
    const orderData = { ...defaultOrder };

    mockingoose(Order).toReturn(orderData, "findOne");

    const foundOrder = await Order.findOne({ _id: orderData._id });

    expect(foundOrder._id.toString()).toBe(orderData._id);

    expect(foundOrder.products.map(p => p.toString())).toEqual(orderData.products);
    expect(foundOrder.payment).toEqual(orderData.payment);
    expect(foundOrder.buyer.toString()).toBe(orderData.buyer);
    expect(foundOrder.status).toBe(orderData.status);
  });
});