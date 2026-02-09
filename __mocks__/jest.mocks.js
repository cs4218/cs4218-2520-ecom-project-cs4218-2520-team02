import { jest } from "@jest/globals";

await jest.unstable_mockModule("../models/productModel.js", () => {
  const productModel = { find: jest.fn() };

  const constructor = jest.fn(function (doc) {
    Object.assign(this, doc);
  });

  Object.assign(constructor, productModel);
  return { default: constructor };
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
