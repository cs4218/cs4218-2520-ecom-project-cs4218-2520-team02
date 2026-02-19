import { jest } from "@jest/globals";

/* ---------------- MODULE MOCKS ---------------- */

await jest.unstable_mockModule("jsonwebtoken", () => {
  const verify = jest.fn();
  return { default: { verify }, verify };
});

await jest.unstable_mockModule("../models/userModel.js", () => {
  return {
    default: {
      findById: jest.fn(),
    },
  };
});


const { default: JWT } = await import("jsonwebtoken");
const { default: userModel } = await import("../models/userModel.js");
const { requireSignIn, isAdmin } = await import(
  "../middlewares/authMiddleware.js"
);

/* ---------------- HELPERS ---------------- */

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
  json: jest.fn(),
});

describe("requireSignIn middleware", () => {
  let req, res, next;
  const ORIGINAL_ENV = process.env;

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    process.env = { ...ORIGINAL_ENV, JWT_SECRET: "test-secret" };

    req = {
      headers: {
        authorization: "Bearer test-token",
      },
    };

    res = mockRes();
    next = jest.fn();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  test("should verify JWT, attach user, and call next()", async () => {
    JWT.verify.mockReturnValue({ _id: "123" });

    await requireSignIn(req, res, next);

    expect(JWT.verify).toHaveBeenCalledWith("test-token", "test-secret");
    expect(req.user).toEqual({ _id: "123" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("should support token without Bearer prefix", async () => {
    req.headers.authorization = "raw-token";

    JWT.verify.mockReturnValue({ _id: "123" });

    await requireSignIn(req, res, next);

    expect(JWT.verify).toHaveBeenCalledWith("raw-token", "test-secret");
    expect(next).toHaveBeenCalled();
  });

  test("should return 401 if token missing", async () => {
    req.headers.authorization = undefined;

    await requireSignIn(req, res, next);

    expect(JWT.verify).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("should return 401 if token invalid", async () => {
    JWT.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await requireSignIn(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("isAdmin middleware", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { _id: "admin-id" },
    };

    res = mockRes();
    next = jest.fn();
  });

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
  
  test("should allow admin user", async () => {
    userModel.findById.mockResolvedValue({
      _id: "admin-id",
      role: 1,
    });

    await isAdmin(req, res, next);

    expect(userModel.findById).toHaveBeenCalledWith("admin-id");
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("should return 403 if user is not admin", async () => {
    userModel.findById.mockResolvedValue({
      _id: "admin-id",
      role: 0,
    });

    await isAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
  test("should return 401 if user not signed in", async () => {
    req.user = null;

    await isAdmin(req, res, next);

    expect(userModel.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("should return 401 if user not found", async () => {
    userModel.findById.mockResolvedValue(null);

    await isAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("should return 500 on DB error", async () => {
    userModel.findById.mockRejectedValue(new Error("DB error"));

    await isAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
