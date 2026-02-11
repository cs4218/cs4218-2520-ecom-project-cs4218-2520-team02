import { jest } from "@jest/globals";

// productModel mock
await jest.unstable_mockModule("../models/productModel.js", () => {
  const productModel = { find: jest.fn() };

  const constructor = jest.fn(function (doc) {
    Object.assign(this, doc);
  });

  Object.assign(constructor, productModel);
  return { default: constructor };
});

// categoryModel mock
await jest.unstable_mockModule("../models/categoryModel.js", () => ({
  default: {
    findOne: jest.fn(),
  },
}));

// orderModel mock
await jest.unstable_mockModule("../models/orderModel.js", () => {
  const Model = jest.fn(function (doc) {
    Object.assign(this, doc);
    this.save = jest.fn();
  });

  return { default: Model };
});

await jest.unstable_mockModule("braintree", () => ({
  default: {
    BraintreeGateway: jest.fn(function () {
      this.clientToken = { generate: jest.fn() };
      this.transaction = { sale: jest.fn() };
    }),
    Environment: { Sandbox: "sandbox" },
  },
}));
