import express from "express";
import dotenv from 'dotenv';
import rateLimit from "express-rate-limit";
import {
  registerController,
  loginController,
  testController,
  forgotPasswordController,
  updateProfileController
} from "../controllers/authController.js";
import {
  getOrdersController,
  getAllOrdersController,
  updateOrderStatusController,
} from "../controllers/orderController.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";

dotenv.config();
const isDASTEnv = process.env.NODE_ENV === 'dast';
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'e2e';

//router object
const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDASTEnv || isTestEnv ? 30000 : 20,
  message: { success: false, message: "Too many login attempts, please try again later." },
  validate: { xForwardedForHeader: false },
});

//routing
//REGISTER || METHOD POST
router.post("/register", registerController);

//LOGIN || POST
router.post("/login", loginLimiter, loginController);

//Forgot Password || POST
router.post("/forgot-password", forgotPasswordController);

//test routes
router.get("/test", requireSignIn, isAdmin, testController);

//protected User route auth
router.get("/user-auth", requireSignIn, (req, res) => {
  res.status(200).send({ ok: true });
});
//protected Admin route auth
router.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({ ok: true });
});

//update profile
router.put("/profile", requireSignIn, updateProfileController);

//orders
router.get("/orders", requireSignIn, getOrdersController);

//all orders
router.get("/all-orders", requireSignIn, isAdmin, getAllOrdersController);

// order status update
router.put(
  "/order-status/:orderId",
  requireSignIn,
  isAdmin,
  updateOrderStatusController
);

export default router;