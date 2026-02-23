import userModel from "../models/userModel.js";

export const getNonAdminUsersController = async (req, res) => {
  try {
    const users = await userModel.find({ role: 0 });
    res.status(200).send({
      success: true,
      message: "All non admin users list",
      users,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      error,
      message: "Error getting all non admin users",
    });
  }
};
