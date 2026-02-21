// Song Jia Hui A0259494L
import { jest } from "@jest/globals";
await import("../../__mocks__/jest.mocks.js");

const { testController } = await import("../../authController.js");

// =============== Helpers ===============
const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });

const expect200 = (res, message) => {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    success: true,
    message: message,
  });
};

// =============== Tests ===============

describe("testController", () => {

  test("[EP] returns 200 with Protected Routes message", async () => {
    // Arrange
    const req = {};
    const res = mockRes();

    // Act
    await testController(req, res);

    // Assert
    expect200(res, "Protected Routes");
  });

  test("[EP] does not call any external model or service", async () => {
    // Arrange
    const req = {};
    const res = mockRes();

    // Act
    await testController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  test("[EP] returns the result of res.send (supports chaining)", async () => {
    // Arrange
    const req = {};
    const res = mockRes();

    // Act
    const returnValue = testController(req, res);

    // Assert
    expect(returnValue).toBe(res.send.mock.results[0].value);
  });
});