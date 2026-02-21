// Song Jia Hui A0259494L
import { jest } from "@jest/globals";

// ============== Mocks ===============
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

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
  json: jest.fn(),
});

// ============== Tests ===============

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

  // EP: valid token partition - token is present and verifiable
  test("[EP] should verify JWT, attach user, and call next() when token is valid", async () => {
    // Arrange
    JWT.verify.mockReturnValue({ _id: "123" });

    // Act
    await requireSignIn(req, res, next);

    // Assert
    expect(JWT.verify).toHaveBeenCalledWith("test-token", "test-secret");
    expect(req.user).toEqual({ _id: "123" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  // EP: token without "Bearer " prefix - still a valid token string partition
  test("[EP] should support token without Bearer prefix", async () => {
    // Arrange
    req.headers.authorization = "raw-token";
    JWT.verify.mockReturnValue({ _id: "123" });

    // Act
    await requireSignIn(req, res, next);

    // Assert
    expect(JWT.verify).toHaveBeenCalledWith("raw-token", "test-secret");
    expect(next).toHaveBeenCalled();
  });

  // EP: missing token partition - authorization header is absent
  test("[EP] should return 401 if token is missing", async () => {
    // Arrange
    req.headers.authorization = undefined;

    // Act
    await requireSignIn(req, res, next);

    // Assert
    expect(JWT.verify).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // EP: invalid/malformed token partition - JWT.verify throws
  test("[EP] should return 401 if token is invalid", async () => {
    // Arrange
    JWT.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    // Act
    await requireSignIn(req, res, next);

    // Assert
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

  // EP: admin role partition - role === 1 grants access
  test("[EP] should allow access when user has admin role (role === 1)", async () => {
    // Arrange
    userModel.findById.mockResolvedValue({
      _id: "admin-id",
      role: 1,
    });

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(userModel.findById).toHaveBeenCalledWith("admin-id");
    expect(next).toHaveBeenCalledTimes(1);
  });

  // BVA: role boundary - role === 0 is just below the admin threshold
  test("[BVA] should return 403 when user role is 0 (boundary below admin)", async () => {
    // Arrange
    userModel.findById.mockResolvedValue({
      _id: "admin-id",
      role: 0,
    });

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // EP: unauthenticated partition - req.user is null (no signed-in user)
  test("[EP] should return 401 if user is not signed in (req.user is null)", async () => {
    // Arrange
    req.user = null;

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(userModel.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // EP: user not found partition - findById resolves to null
  test("[EP] should return 401 if user is not found in the database", async () => {
    // Arrange
    userModel.findById.mockResolvedValue(null);

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // EP: database error partition - findById rejects
  test("[EP] should return 500 on database error", async () => {
    // Arrange
    userModel.findById.mockRejectedValue(new Error("DB error"));

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});