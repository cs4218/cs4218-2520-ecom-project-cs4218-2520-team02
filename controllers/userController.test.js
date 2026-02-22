import { jest } from "@jest/globals";

await jest.unstable_mockModule("../models/userModel.js", () => {
  const UserMock = jest.fn(function (doc) {
    Object.assign(this, doc);

    this.save = jest.fn().mockResolvedValue(this);
  });
  UserMock.find = jest.fn();

  return { default: UserMock };
});

const { default: userModel } = await import("../models/userModel.js");
const { getNonAdminUsersController } = await import("./userController.js");

describe("UserController", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("getNonAdminUsersController", () => {
    it("should return only non admin users", async () => {
      const mockUsers = [
        { name: "testUser1", role: 0 },
        { name: "testUser2", role: 0 },
      ];
      userModel.find.mockResolvedValueOnce(mockUsers);

      await getNonAdminUsersController(req, res);

      expect(userModel.find).toHaveBeenCalledWith({ role: 0 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "All non admin users list",
        users: mockUsers,
      });
    });

    it("should return 500 when error is thrown", async () => {
      const error = new Error("db error");
      userModel.find.mockRejectedValueOnce(error);

      await getNonAdminUsersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error,
        message: "Error getting all non admin users",
      });
    });
  });
});
