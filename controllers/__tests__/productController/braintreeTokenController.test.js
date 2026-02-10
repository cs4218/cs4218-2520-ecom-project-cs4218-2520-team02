import { jest } from "@jest/globals";

// Mock braintree
const mockGenerate = jest.fn();

await jest.unstable_mockModule("braintree", () => ({
  default: {
    BraintreeGateway: jest.fn(function () {
      this.clientToken = {
        generate: mockGenerate,
      };
    }),
    Environment: {
      Sandbox: "sandbox",
    },
  },
}));

// Imports
const {
  braintreeTokenController,
} = await import("../../../controllers/productController.js");

describe("Product Controller Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    // Re-inititalize mocks 
    jest.resetAllMocks();

    // Set up default requests 
    req = {
        body: {},
        params: {},
    };

    // Mock response 
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    // Suppress console log
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console log to original behaviour
    console.log.mockRestore();
  });

  describe("braintreeTokenController", () => {

    describe("Token Generation (EP)", () => {

      it("should return 500 if Braintree throws an error (EP: Braintree failure)", async () => {

        // Arrange
        mockGenerate.mockImplementation((_, cb) => {
          cb(new Error("Failed to call Braintree gateway."), null);
        });

        // Act
        await braintreeTokenController(req, res);

        // Assert
        expect(mockGenerate).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Failed to generate payment token.",
        });
      });

      it("should create a token if generation succeeds (EP: valid token)", async () => {

        // Arrange
        mockGenerate.mockImplementation((_, cb) => {
          cb(null, { clientToken: "client-token" });
        });

        // Act
        await braintreeTokenController(req, res);

        // Assert
        expect(mockGenerate).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          token: "client-token",
        });
      });
    });

    describe("Unexpected Errors (EP)", () => {

      it("should return 500 if generate throws synchronously (EP: configuration error)", async () => {

        // Arrange
        mockGenerate.mockImplementation(() => {
          throw new Error("Failed to call braintree due to possible misconfiguration.");
        });

        // Act
        await braintreeTokenController(req, res);

        // Assert
        expect(mockGenerate).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Internal server error while generating token.",
        });
      });
    });
  });
});
