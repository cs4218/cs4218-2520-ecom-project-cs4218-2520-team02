// Yap Zhao Yi, A0277540B
import { jest } from "@jest/globals";
await import("../../__mocks__/jest.mocks.js");

// Mock braintree
let saleImplementation = null;
let mockSale = jest.fn();

// Mock braintree
await jest.unstable_mockModule("braintree", () => ({
  default: {
    BraintreeGateway: jest.fn(function () {
      this.clientToken = { generate: jest.fn() };

      this.transaction = {
        sale: (...args) => mockSale(...args),
      };
    }),
    Environment: { Sandbox: "sandbox" },
  },
}));

// Imports
const { braintreePaymentController } = await import(
  "../../../controllers/productController.js"
);
const { default: orderModel } = await import("../../../models/orderModel.js");

describe("Product Controller Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    
    // Re-initalize
    jest.clearAllMocks();
    saleImplementation = null;

    mockSale = jest.fn((opts, cb) => {
      if (saleImplementation) {
        return saleImplementation(opts, cb);
      }
      return cb(null, {
        success: true,
        transaction: { id: "txn_default" },
      });
    });

    // Set up default requests
    req = { 
      body: {}, 
      params: {}, 
      user: { _id: "user001" } 
    };
    
    // Mock responses
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    // Suppress console log
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("braintreePaymentController", () => {
    
    // Special cases: nonce is null, nonce is undefined, nonce is an empty string
    // Not required to be tested: very long nonce string
    describe("Nonce Validation (EP)", () => {
      it("should return 400 if nonce is missing (EP: missing nonce)", async () => {

        // Arrange
        req.body = { cart: [{ price: 10 }] };

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(0);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Payment nonce and cart are required.",
        });
      });

      it("should return 400 if nonce is an empty string (EP: \"\" nonce)", async () => {
        
        // Arrange
        req.body = { nonce: "", cart: [{ price: 10 }] };

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(0);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Payment nonce and cart are required.",
        });
      });

      it("should return 400 if nonce is null (EP: null nonce)", async () => {
        
        // Arrange
        req.body = { nonce: null, cart: [{ price: 10 }] };

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(0);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Payment nonce and cart are required.",
        });
      });
    });

    // Boundary for cart: length 0 and length 1
    // Special cases: cart is null, cart is undefined (missing input), cart is not an array
    // Not required to be tested: very long arrays 
    describe("Cart Validation (BVA)", () => {

      it("should return 400 if cart is not supplied (Boundary: missing input)", async () => {
        
        // Arrange
        req.body = { nonce: "nonce" };

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(0);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Payment nonce and cart are required.",
        });
      });

      it("should return 400 if cart is null (Boundary: null)", async () => {
        
        // Arrange
        req.body = { nonce: "nonce123", cart: null };

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(0);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Payment nonce and cart are required.",
        });
      });

      it("should return 400 if cart is not an array (Boundary: not an array)", async () => {
        
        // Arrange
        req.body = { nonce: "nonce123", cart: 3 };

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(0);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Payment nonce and cart are required.",
        });
      });

      it("should return 400 if cart is empty (Below Boundary: empty array)", async () => {
        
        // Arrange
        req.body = { nonce: "nonce123", cart: [] };

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(0);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Payment nonce and cart are required.",
        });
      });

      it("should processes payment for single-item cart (On Boundary: 1 item)", async () => {
        
        // Arrange
        req.body = { nonce: "nonce123", cart: [{ price: 10 }] };

        saleImplementation = (opts, cb) =>
          cb(null, { success: true, transaction: { id: "txn001" } });

        orderModel.mockImplementation(function (doc) {
          Object.assign(this, doc);
          this.save = jest.fn().mockResolvedValue({ _id: "order001" });
        });

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(1);
        expect(mockSale).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: "10.00",
            paymentMethodNonce: "nonce123",
          }),
          expect.any(Function)
        )
        expect(orderModel).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: "Payment completed successfully.",
            transaction: { success: true, transaction: { id: "txn001" } },
            orderId: "order001",
          }),
        );
      });

      it("should processes payment for two-item cart (Above Boundary: 2 item)", async () => {
        
        // Arrange
        req.body = { nonce: "nonce123", cart: [{ price: 10 }, { price: 20 }] };

        saleImplementation = (opts, cb) =>
          cb(null, { success: true, transaction: { id: "txn001" } });

        orderModel.mockImplementation(function (doc) {
          Object.assign(this, doc);
          this.save = jest.fn().mockResolvedValue({ _id: "order001" });
        });

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(1);
        expect(mockSale).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: "30.00",
            paymentMethodNonce: "nonce123",
          }),
          expect.any(Function)
        );
        expect(orderModel).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: "Payment completed successfully.",
            transaction: { success: true, transaction: { id: "txn001" } },
            orderId: "order001",
          }),
        );
      });
    });

    // Success case already covered in Cart Validation (BVA)
    describe("Total Validation (EP)", () => {
      it("should return 400 if cart total is NaN", async () => {
        
        // Arrange
        req.body = { 
          nonce: "nonce123", 
          cart: [{ price: "invalid" }]
        };

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(0);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid cart total.",
        });
      });
    });

    // Success case already covered in Cart Validation (BVA)
    describe("Transaction (EP)", () => {
      it("should return 500 if transaction sale fails", async () => {
        
        // Arrange
        req.body = { nonce: "nonce123", cart: [{ price: 10 }] };

        mockSale.mockImplementation((opts, cb) => {
          cb(new Error("Braintree error"));
        });

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Internal server error while processing transaction.",
          })
        );
      });
    });

    // Success case already covered in Cart Validation (BVA)
    describe("Saving (EP)", () => {
      it("should return 500 if saving the order fails", async () => {
        // Arrange
        req.body = { nonce: "nonce123", cart: [{ price: 10 }] };

        // Mock Braintree transaction to succeed
        saleImplementation = (opts, cb) =>
          cb(null, { success: true, transaction: { id: "txn001" } });

        // Mock orderModel save to fail
        orderModel.mockImplementation(function (doc) {
          Object.assign(this, doc);
          this.save = jest.fn().mockRejectedValue(new Error("Failed to save order to database."));
        });

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(mockSale).toHaveBeenCalledTimes(1);
        expect(orderModel).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Internal server error while saving order after transaction.",
          })
        );
      });
    });
    
    // Success case already covered in Cart Validation (BVA)
    describe("Braintree configuration (EP)", () => {
      it("should return 500 if an unexpected error occurs before starting the transaction", async () => {
        
        // Arrange
        req.body = { nonce: "nonce123", cart: [{ price: 10 }] };

        mockSale.mockImplementationOnce(() => {
          throw new Error("Unexpected transaction error");
        });

        // Act
        await braintreePaymentController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Internal server error while starting transaction.",
          })
        );
      });
    });
  });
});