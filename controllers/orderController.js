import orderModel from "../models/orderModel.js";

// Get a user's orders
export const getOrdersController = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).send({
        success: false,
        message: "Not signed in",
      });
    }

    const userOrder = await orderModel
      .find({ buyer: req.user._id })
      .populate("products", "-photo")
      .populate("buyer", "name");

    return res.status(200).send({
      success: true,
      orders: userOrder,
    });
  } catch (error) {
    console.log("Error in retrieving user orders: ", error);
    return res.status(500).send({
      success: false,
      message: "Error while getting orders",
      error: error.message || "Unknown error",
    });
  }
};

// Get all users orders
export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({})
      .populate("products", "-photo")
      .populate("buyer", "name")
      .sort({ createdAt: -1 });

    return res.status(200).send({
      success: true,
      orders: orders,
    });

  } catch (error) {
    console.log("Error in retrieving all orders: ", error);
    return res.status(500).send({
      success: false,
      message: "Error while getting orders",
      error: error.message || "Unknown error",
    });
  }
};

// Update order status using orderId
export const updateOrderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId) {
      return res.status(400).send({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!status) {
      return res.status(400).send({
        success: false,
        message: "Status is required",
      });
    }

    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true },
    );

    if (!updatedOrder) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Order status updated",
      order: updatedOrder,
    });
  } catch (error) {
    console.log("Error in updating order status: ", error);
    return res.status(500).send({
      success: false,
      message: "Error while updating order status",
      error: error.message || "Unknown error",
    });
  }
};