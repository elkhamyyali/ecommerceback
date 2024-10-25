const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
require("colors");
const compression = require("compression");
const cors = require("cors");
const bodyParser = require("body-parser");

const ApiError = require("./utils/apiError");
const globalError = require("./middlewares/errorMiddleware");
const mountRoutes = require("./routes");
const { webhookCheckout } = require("./controllers/orderService");
const dbConnection = require("./config/database");

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === "production" ? ".env" : "config.env";
dotenv.config({ path: envFile });

// Initialize Express app
const app = express();

// Security and preprocessing middleware
app.set("trust proxy", 1);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

// Stripe webhook needs raw body
app.post(
  "/webhook-checkout",
  bodyParser.raw({ type: "application/json" }),
  webhookCheckout
);

// Standard middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

// Static files
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath));

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`Mode: ${process.env.NODE_ENV}`.yellow);
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", environment: process.env.NODE_ENV });
});

// Mount API routes
mountRoutes(app);

// 404 handler
app.all("*", (req, res, next) => {
  next(new ApiError(`Can't find this route: ${req.originalUrl}`, 404));
});

// Global error handler
app.use(globalError);

// Database connection and server startup
const startServer = async () => {
  try {
    await dbConnection();
    const PORT = process.env.PORT || 8000;
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`.green);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err) => {
      console.error("UNHANDLED REJECTION! 💥 Shutting down...".red);
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...".red);
      console.error(err.name, err.message);
      process.exit(1);
    });

    // Handle SIGTERM signal
    process.on("SIGTERM", () => {
      console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
      server.close(() => {
        console.log("💥 Process terminated!");
      });
    });
  } catch (error) {
    console.error("Failed to start server:".red, error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
