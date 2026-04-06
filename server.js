import express from "express";
import colors from "colors";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoute.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoute.js";
import cors from "cors";
import helmet from "helmet";
// express-mongo-sanitize@2.2.0 is incompatible with Express 5 (tries to reassign
// read-only req.query). Replaced with an inline body-only sanitizer that strips
// MongoDB operator keys (starting with $) from req.body.
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$")) {
      delete obj[key];
    } else {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
}
function mongoSanitizeBody(req, _res, next) {
  if (req.body) sanitizeObject(req.body);
  next();
}

// configure env
dotenv.config();

//database config
connectDB();

const app = express();

//middlewares
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      mediaSrc: ["'none'"],
      workerSrc: ["'none'"],
      manifestSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      "navigate-to": ["'none'"],
    },
  },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(express.json());
app.use(mongoSanitizeBody);
app.use(morgan("dev"));

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/user", userRoutes);

// rest api

app.get("/", (req, res) => {
  res.send("<h1>Welcome to ecommerce app</h1>");
});

const PORT = process.env.PORT || 6060;

app.listen(PORT, () => {
  console.log(
    `Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white,
  );
});

// Export app for testing
export default app;
