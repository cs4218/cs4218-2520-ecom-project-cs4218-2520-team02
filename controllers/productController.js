import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";

import fs from "fs";
import slugify from "slugify";
import braintree from "braintree";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

// Payment gateway
let gateway;

const getGateway = () => {
  if (!gateway) {
    gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: process.env.BRAINTREE_MERCHANT_ID,
      publicKey: process.env.BRAINTREE_PUBLIC_KEY,
      privateKey: process.env.BRAINTREE_PRIVATE_KEY,
    });
  }
  return gateway;
};

export const createProductController = async (req, res) => {
  try {
    const raw = req.fields;
    const { photo } = req.files;

    const name = raw.name?.trim();
    const description = raw.description?.trim();
    const category = raw.category?.trim();
    const price = Number(raw.price);
    const quantity = Number(raw.quantity);
    const shipping = raw.shipping;

    // Validation
    if (!name) {
      return res.status(400).send({ error: "Name is Required" });
    }

    if (!description) {
      return res.status(400).send({ error: "Description is Required" });
    }

    if (raw.price === "" || Number.isNaN(price) || price < 0) {
      return res
        .status(400)
        .send({ error: "Price must be a valid non-negative number" });
    }

    if (!category) {
      return res.status(400).send({ error: "Category is Required" });
    }

    if (raw.quantity === "" || !Number.isInteger(quantity) || quantity < 0) {
      return res
        .status(400)
        .send({ error: "Quantity must be a valid non-negative integer" });
    }

    if (photo && photo.size > 1000000) {
      return res
        .status(400)
        .send({ error: "Photo size should be 1MB or less" });
    }

    const products = new productModel({
      name,
      description,
      price,
      category,
      quantity,
      shipping,
      slug: slugify(name),
    });

    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    res.status(201).send({
      success: true,
      message: "Product Created Successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in creating product",
    });
  }
};

//get all products
export const getProductController = async (req, res) => {
  try {
    const products = await productModel
      .find({})
      .populate("category")
      .select("-photo")
      .limit(12)
      .sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      countTotal: products.length,
      message: "All products retrieved successfully.",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in getting products",
      error,
    });
  }
};
// get single product
export const getSingleProductController = async (req, res) => {
  try {
    const raw = req.params?.slug;

    if (typeof raw !== "string" || raw.trim().length === 0) {
      return res.status(400).send({
        success: false,
        message: "Product slug is required",
      });
    }

    const slug = raw.trim();

    const product = await productModel
      .findOne({ slug: slug })
      .select("-photo")
      .populate("category");

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Single Product Fetched",
      product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting single product",
      error,
    });
  }
};

// get photo
export const productPhotoController = async (req, res) => {
  try {
    const { pid } = req.params ?? {};

    if (!pid) {
      return res.status(400).send({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).send({
        success: false,
        message: "Invalid Product ID",
      });
    }

    const product = await productModel.findById(req.params.pid).select("photo");

    if (!product?.photo?.data) {
      return res.status(404).send({
        success: false,
        message: "Photo not found",
      });
    }

    res.set("Content-Type", product.photo.contentType);
    return res.status(200).send(product.photo.data);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting photo",
      error,
    });
  }
};

// delete controller
export const deleteProductController = async (req, res) => {
  try {
    const { pid } = req.params ?? {};

    if (!pid) {
      return res.status(400).send({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).send({
        success: false,
        message: "Invalid Product ID",
      });
    }

    const deleted = await productModel
      .findByIdAndDelete(req.params.pid)
      .select("-photo");

    if (!deleted) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Product Deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while deleting product",
      error,
    });
  }
};

// update product
export const updateProductController = async (req, res) => {
  try {
    const raw = req.fields;
    const { photo } = req.files;
    const { pid } = req.params ?? {};

    if (!pid) {
      return res.status(400).send({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).send({
        success: false,
        message: "Invalid Product ID",
      });
    }

    const name = raw.name?.trim();
    const description = raw.description?.trim();
    const category = raw.category?.trim();
    const price = Number(raw.price);
    const quantity = Number(raw.quantity);
    const shipping = raw.shipping;

    // Validation
    if (!name) {
      return res.status(400).send({ error: "Name is Required" });
    }

    if (!description) {
      return res.status(400).send({ error: "Description is Required" });
    }

    if (raw.price === "" || Number.isNaN(price) || price < 0) {
      return res.status(400).send({ error: "Price must be a valid non-negative number" });
    }

    if (!category) {
      return res.status(400).send({ error: "Category is Required" });
    }

    if (raw.quantity === "" || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).send({ error: "Quantity must be a valid non-negative integer" });
    }

    if (photo && photo.size > 1000000) {
      return res.status(400).send({ error: "Photo size should be 1MB or less" });
    }

    const products = await productModel.findByIdAndUpdate(
      req.params.pid,
      { ...req.fields, slug: slugify(name) },
      { new: true },
    );

    if (!products) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    res.status(200).send({
      success: true,
      message: "Product Updated Successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while updating product",
    });
  }
};

// Filters
export const productFiltersController = async (req, res) => {
  try {
    const { checked, radio } = req.body;
    let args = {};

    if (checked.length > 0) {
      args.category = checked;
    }

    if (radio.length === 2) {
      let min = radio[0];
      let max = radio[1];

      if (min > max) {
        [min, max] = [max, min];
      }
      args.price = { $gte: min, $lte: max };
    }

    const products = await productModel.find(args);
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error While Filtering Products",
      error,
    });
  }
};

// Product count
export const productCountController = async (req, res) => {
  try {
    const total = await productModel.find({}).estimatedDocumentCount();
    res.status(200).send({
      success: true,
      total,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      message: "Error in product count",
      error,
      success: false,
    });
  }
};

// Product list based on page
export const productListController = async (req, res) => {
  try {
    const perPage = 6;
    const page = req.params.page;

    if (page === undefined || page < 1) {
      return res.status(400).send({
        success: false,
        message: "Page must be a positive integer.",
      });
    }

    const products = await productModel
      .find({})
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error in per page controller",
      error,
    });
  }
};

// Search product
export const searchProductController = async (req, res) => {
  try {
    const raw = req.params.keyword;

    if (typeof raw !== "string" || raw.trim().length === 0) {
      return res.status(400).send({
        success: false,
        message: "Keyword is required",
      });
    }

    //Escapes Regex to allow searching via symbols
    const keyword = raw.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const results = await productModel
      .find({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      })
      .select("-photo");
    return res.status(200).json({
      success: true,
      results: results,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error In Search Product API",
      error,
    });
  }
};

// Similar products
export const relatedProductController = async (req, res) => {
  try {
    const { pid, cid } = req.params;
    const products = await productModel
      .find({
        category: cid,
        _id: { $ne: pid },
      })
      .select("-photo")
      .limit(3)
      .populate("category");
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error while geting related products",
      error,
    });
  }
};

// Get product by category
export const productCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    const products = await productModel.find({ category }).populate("category");
    res.status(200).send({
      success: true,
      category,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      error,
      message: "Error while getting products",
    });
  }
};

// --- Payment Gateway API ---
// Generate Token
export const braintreeTokenController = async (req, res) => {
  try {
    const gateway = getGateway();
    gateway.clientToken.generate({}, (error, response) => {
      if (error) {
        console.log("Failed to generate Braintree token: ", error);
        return res.status(500).send({
          success: false,
          message: "Internal server error while generating token.",
        });
      }

      return res.status(200).send({
        success: true,
        token: response.clientToken,
      });
    });

    // Misc errors
    // Note: likely to be configuration errors rather than braintree issues
  } catch (error) {
    console.log("Error generating Braintree token: ", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error while generating token.",
      error: error.message,
    });
  }
};

// Payment
export const braintreePaymentController = async (req, res) => {
  try {
    const { nonce, cart } = req.body;

    // Basic validation
    if (!nonce || !cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).send({
        success: false,
        message: "Payment nonce and cart are required.",
      });
    }

    // Sum cart
    const total = cart.reduce((acc, item) => acc + Number(item.price), 0);

    if (Number.isNaN(total)) {
      return res.status(400).send({
        success: false,
        message: "Invalid cart total.",
      });
    }

    const gateway = getGateway();
    gateway.transaction.sale(
      {
        amount: total.toFixed(2), // Braintree expects string with 2 decimals
        paymentMethodNonce: nonce,
        options: { submitForSettlement: true },
      },
      async function (error, result) {
        if (error) {
          console.log("Error processing transaction:", error);
          return res.status(500).send({
            success: false,
            message: "Internal server error while processing transaction.",
          });
        }

        try {
          const order = await new orderModel({
            products: cart,
            payment: result,
            buyer: req.user._id,
          }).save();

          return res.status(200).send({
            success: true,
            message: "Payment completed successfully.",
            transaction: result,
            orderId: order._id,
          });

          // Misc errors
          // Note: likely to be saving errors
        } catch (error) {
          console.log("Error saving order:", error);
          return res.status(500).send({
            success: false,
            message:
              "Internal server error while saving order after transaction.",
            error: error.message,
          });
        }
      },
    );

    // Misc errors
    // Note: likely to be configuration errors rather than braintree issues
  } catch (error) {
    console.log("Error processing payment: ", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error while starting transaction.",
      error: error.message,
    });
  }
};
