// Yap Zhao Yi, A0277540B
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// Mocks
const mockClientTokenGenerate = jest.fn();
await jest.unstable_mockModule("braintree", () => ({
  default: {
    BraintreeGateway: jest.fn(function () {
      this.clientToken = { generate: mockClientTokenGenerate };
    }),
    Environment: { Sandbox: "sandbox" },
  },
}));

const { braintreeTokenController } = await import("../../../productController.js");

const createTestApp = () => {
  const app = express();
  app.get("/braintree/token", braintreeTokenController);
  return app;
};

describe("BraintreeTokenController Integration Test", () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it("should return a client token successfully", async () => {
    mockClientTokenGenerate.mockImplementation((_, cb) =>
      cb(null, { clientToken: "mock-token" })
    );

    const res = await request(app).get("/braintree/token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, token: "mock-token" });
    expect(mockClientTokenGenerate).toHaveBeenCalledTimes(1);
  });

  it("should return 500 if Braintree errors", async () => {
    mockClientTokenGenerate.mockImplementation((_, cb) => cb(new Error("gateway error"), null));

    const res = await request(app).get("/braintree/token");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Internal server error/);
  });
});
