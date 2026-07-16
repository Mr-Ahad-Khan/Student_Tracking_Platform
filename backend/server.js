import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import apiRouter from "./routes.js";
import { User } from "./models.js";

// Load environment configurations
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware setups
app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "https://ahadttutrackplatform-kf02tdh2o-ahad998867-4400s-projects.vercel.app/",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Create uploads folder if it doesn't exist (for CSV parsing uploads)
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Mount api routes
app.use("/api", apiRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date(),
    uptime: process.uptime(),
    dbState: mongoose.connection.readyState,
  });
});

// Global Error Handler
app.use((err, req, res, _next) => {
  console.error("Unhandled Server Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "An unexpected error occurred on the server.",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Database seeding function for initial administrator
const seedAdmin = async () => {
  try {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount === 0) {
      console.log("Seeding default administrator account...");
      const admin = new User({
        name: "System Admin",
        email: "admin@platform.com",
        password: "adminpassword", // Will be hashed by mongoose pre-save hook
        role: "admin",
      });
      await admin.save();
      console.log("----------------------------------------------------");
      console.log("Admin account seeded successfully!");
      console.log("Email: admin@platform.com");
      console.log("Password: adminpassword");
      console.log("----------------------------------------------------");
    }
  } catch (error) {
    console.error(
      "Failed to seed default administrator account:",
      error.message,
    );
  }
};

// Database Connection & Server Startup
console.log("Connecting to MongoDB database at:", process.env.MONGO_URI);
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connection established successfully.");

    // Seed initial database state
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(
        `Server is running and listening on http://localhost:${PORT}`,
      );
    });
  })
  .catch((error) => {
    console.error("MongoDB database connection error:", error.message);
    console.error(
      "Please verify your local MongoDB service is running, or check MONGO_URI in .env",
    );
    process.exit(1);
  });
