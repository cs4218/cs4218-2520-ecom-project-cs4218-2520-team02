import { jest } from "@jest/globals";

// Mocks
await jest.unstable_mockModule("../models/productModel.js", () => {
  const productModel = { find: jest.fn() };

  const constructor = jest.fn(function (doc) {
    Object.assign(this, doc);
  });

  Object.assign(constructor, productModel);
  return { default: constructor };
});

await jest.unstable_mockModule("braintree", () => {
  return {
    default: {
      BraintreeGateway: jest.fn(function () {
        this.clientToken = { generate: jest.fn() };
        this.transaction = { sale: jest.fn() };
      }),
      Environment: { Sandbox: "sandbox" },
    },
  };
});

const { default: productModel } = await import("../models/productModel.js");
const { productFiltersController, productCountController } =
  await import("../controllers/productController.js");

// Mock DB
const MOCK_PRODUCTS = [
  { _id: "p1", name: "99-c1", description: "cheap", price: 99, category: "c1" },
  {
    _id: "p2",
    name: "100-c1",
    description: "edge",
    price: 100,
    category: "c1",
  },
  {
    _id: "p3",
    name: "100-c2",
    description: "edge",
    price: 100,
    category: "c2",
  },
  {
    _id: "p4",
    name: "101-c2",
    description: "edge",
    price: 101,
    category: "c2",
  },
  {
    _id: "p5",
    name: "500-c3",
    description: "expensive",
    price: 500,
    category: "c3",
  },
];

const applyFind = (args) => {
  const cat = args?.category;
  const price = args?.price;

  return MOCK_PRODUCTS.filter((p) => {
    if (cat !== undefined) {
      if (!Array.isArray(cat) || !cat.includes(p.category)) return false;
    }
    if (price !== undefined) {
      const { $gte, $lte } = price;
      if (p.price < $gte) return false;
      if (p.price > $lte) return false;
    }
    return true;
  });
};

// Helpers
const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
});

describe("productController", () => {
  describe("productFiltersController", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      productModel.find.mockImplementation(async (args) => applyFind(args));
    });

    const expect200 = (res, expectedProducts) => {
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: expectedProducts,
      });
    };

    const expect400 = (res) => {
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error While Filtering Products",
          error: expect.anything(),
        }),
      );
    };

    describe("Baseline behavior (happy paths)", () => {
      test("returns all products when no filters are selected", async () => {
        const req = { body: { checked: [], radio: [] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect200(res, MOCK_PRODUCTS);
      });

      test("filters by one selected category", async () => {
        const req = { body: { checked: ["c1"], radio: [] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({ category: ["c1"] });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.category === "c1"),
        );
      });

      test("filters by multiple selected categories", async () => {
        const req = { body: { checked: ["c1", "c2"], radio: [] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["c1", "c2"],
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => ["c1", "c2"].includes(p.category)),
        );
      });

      test("filters by a price range only", async () => {
        const req = { body: { checked: [], radio: [100, 500] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          price: { $gte: 100, $lte: 500 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.price >= 100 && p.price <= 500),
        );
      });

      test("filters by category and price range together", async () => {
        const req = { body: { checked: ["c2"], radio: [100, 500] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["c2"],
          price: { $gte: 100, $lte: 500 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter(
            (p) => p.category === "c2" && p.price >= 100 && p.price <= 500,
          ),
        );
      });
    });

    describe("Boundary Value Analysis (price boundaries)", () => {
      test("price range below 100 returns only products priced at 99 or less", async () => {
        const req = { body: { checked: [], radio: [0, 99] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          price: { $gte: 0, $lte: 99 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.price >= 0 && p.price <= 99),
        );
      });

      test("price range exactly 100 returns only products priced exactly 100", async () => {
        const req = { body: { checked: [], radio: [100, 100] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          price: { $gte: 100, $lte: 100 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.price === 100),
        );
      });

      test("price range exactly 101 returns only products priced exactly 101", async () => {
        const req = { body: { checked: [], radio: [101, 101] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          price: { $gte: 101, $lte: 101 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.price === 101),
        );
      });
    });

    describe("Boundary Value Analysis (category boundary)", () => {
      test("with only a price range set, category is not applied", async () => {
        const req = { body: { checked: [], radio: [100, 100] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          price: { $gte: 100, $lte: 100 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.price === 100),
        );
      });

      test("with category + exact-price range, returns only matching items in that category", async () => {
        const req = { body: { checked: ["c1"], radio: [100, 100] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["c1"],
          price: { $gte: 100, $lte: 100 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.category === "c1" && p.price === 100),
        );
      });
    });

    describe("2D BVA corner cases (category × price)", () => {
      test("category c1 with low price range returns only cheap c1 items", async () => {
        const req = { body: { checked: ["c1"], radio: [0, 99] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["c1"],
          price: { $gte: 0, $lte: 99 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter(
            (p) => p.category === "c1" && p.price >= 0 && p.price <= 99,
          ),
        );
      });

      test("category c1 with exact high price returns only that exact-priced c1 item", async () => {
        const req = { body: { checked: ["c1"], radio: [500, 500] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["c1"],
          price: { $gte: 500, $lte: 500 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.category === "c1" && p.price === 500),
        );
      });

      test("category c3 with exact high price returns only that exact-priced c3 item", async () => {
        const req = { body: { checked: ["c3"], radio: [500, 500] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["c3"],
          price: { $gte: 500, $lte: 500 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.category === "c3" && p.price === 500),
        );
      });

      test("category c2 with exact 101 price returns only that exact-priced c2 item", async () => {
        const req = { body: { checked: ["c2"], radio: [101, 101] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["c2"],
          price: { $gte: 101, $lte: 101 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.category === "c2" && p.price === 101),
        );
      });
    });

    describe("Error and defensive cases", () => {
      test("returns 400 if the database query throws an error", async () => {
        const req = { body: { checked: ["c1"], radio: [100, 500] } };
        const res = mockRes();

        productModel.find.mockImplementation(() => {
          throw new Error("DB error");
        });

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["c1"],
          price: { $gte: 100, $lte: 500 },
        });
        expect400(res);
      });

      test("returns 400 if 'checked' is missing from the request body", async () => {
        const req = { body: { radio: [100, 500] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect400(res);
      });

      test("returns 400 if 'radio' is missing from the request body", async () => {
        const req = { body: { checked: ["c1"] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect400(res);
      });

      test("ignores price filter when radio does not have exactly 2 values", async () => {
        const req = { body: { checked: ["c1"], radio: [100] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["c1"],
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.category === "c1"),
        );
      });

      test("normalizes reversed price range (min/max swapped)", async () => {
        const req = { body: { checked: [], radio: [500, 100] } };
        const res = mockRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          price: { $gte: 100, $lte: 500 },
        });
        expect200(
          res,
          MOCK_PRODUCTS.filter((p) => p.price >= 100 && p.price <= 500),
        );
      });
    });
  });

  describe("productCountController", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      console.log.mockRestore?.();
    });

    const expect200 = (res, expectedTotal) => {
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        total: expectedTotal,
      });
    };

    const expect400 = (res) => {
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Error in product count",
        error: expect.any(Error),
        success: false,
      });
    };

    test("returns the total product count", async () => {
      const req = {};
      const res = mockRes();

      const query = {
        estimatedDocumentCount: jest.fn().mockResolvedValue(123),
      };
      productModel.find.mockReturnValue(query);

      await productCountController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(query.estimatedDocumentCount).toHaveBeenCalled();

      expect200(res, 123);
    });

    test("returns 400 when estimatedDocumentCount rejects", async () => {
      const req = {};
      const res = mockRes();

      const query = {
        estimatedDocumentCount: jest
          .fn()
          .mockRejectedValue(new Error("DB fail")),
      };
      productModel.find.mockReturnValue(query);

      await productCountController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(query.estimatedDocumentCount).toHaveBeenCalled();

      expect400(res);
    });

    test("returns 400 when productModel.find throws synchronously", async () => {
      const req = {};
      const res = mockRes();

      productModel.find.mockImplementation(() => {
        throw new Error("Find crashed");
      });

      await productCountController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});

      expect400(res);
    });
  });
});
