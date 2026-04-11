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
// Performance tests (stress/spike/capacity) set PERFORMANCE_TEST=true so the rate
// limiter is bypassed entirely. Without this, 1000 VUs exhaust the 10 000-request
// test-mode cap in ~4 seconds, causing 99%+ false-positive error rates.
const isPerformanceTest = process.env.PERFORMANCE_TEST === 'true';

//router object
const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDASTEnv || isTestEnv ? 30000 : 20,
  message: { success: false, message: "Too many login attempts, please try again later." },
  validate: { xForwardedForHeader: false },
  skip: () => isPerformanceTest,
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