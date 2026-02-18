import { jest } from "@jest/globals";
await import("../../__mocks__/jest.mocks.js");

const { default: orderModel } = await import("../../../models/orderModel.js");
const { testController } = await import("../../authController.js");

// =============== Helpers ===============
const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });

const silenceConsole = () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return () => spy.mockRestore();
};

const expect200 = (res, message) => {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    success: true,
    message: message,
  });
};

// =============== Tests ===============

describe("testController", () => {
  test("returns test message", async () => {
    const req = {};
    const res = mockRes();

    await testController(req, res);

    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Protected Routes",
    });
  });
});