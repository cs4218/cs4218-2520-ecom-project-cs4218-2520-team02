import express from "express";
import { isAdmin, requireSignIn } from "./../middlewares/authMiddleware.js";
import { getNonAdminUsersController } from "../controllers/userController.js";

const router = express.Router();

router.get("/all", requireSignIn, isAdmin, getNonAdminUsersController);

export default router;
