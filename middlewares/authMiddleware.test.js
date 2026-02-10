import { jest } from "@jest/globals";

import JWT from "jsonwebtoken";
import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";
import userModel from "../models/userModel.js";

describe("requireSignIn middleware", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {
                authorization: "Bearer access-token",
            },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        next = jest.fn();

        process.env.JWT_SECRET = "12345";
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should verify JWT, attach user to req, and call next()", async () => {
        const decodedUser = { id: "123", email: "test@test.com" };
        const token = JWT.sign(decodedUser, "12345");
        req.headers.authorization = `Bearer ${token}`;

        await requireSignIn(req, res, next);

        expect(req.user).toMatchObject(decodedUser);
        expect(next).toHaveBeenCalledTimes(1);
    });

    test("should return 401 if JWT verification fails", async () => {
        req.headers.authorization = "Bearer invalid";

        await requireSignIn(req, res, next);

        expect(req.user).toBeUndefined();
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: expect.any(Error),
            message: "Invalid token",
        });
    });

    test("should return 401 if no token is provided", async () => {
        req.headers.authorization = "";

        await requireSignIn(req, res, next);

        expect(req.user).toBeUndefined();
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "No token provided",
        });
    });
});

describe("isAdmin middleware", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { _id: "admin-id" },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("should allow access if user is admin", async () => {
        jest.spyOn(userModel, "findById").mockResolvedValue({
            _id: "admin-id",
            role: 1, // admin
        });

        await isAdmin(req, res, next);

        expect(userModel.findById).toHaveBeenCalledWith("admin-id");
        expect(next).toHaveBeenCalledTimes(1);
    });
});