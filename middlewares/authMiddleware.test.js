import { jest } from "@jest/globals";

import JWT from "jsonwebtoken";
import { requireSignIn } from "../middlewares/authMiddleware.js";

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
});