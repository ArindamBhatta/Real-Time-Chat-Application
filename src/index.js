import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import healthRoutes from "./routes/health.route.js";
import metricsRoutes from "./routes/metrics.route.js";
import { metricsMiddleware } from "./middleware/metrics.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { app, server } from "./lib/socket.js";

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const defaultOrigins =
  process.env.NODE_ENV === "production"
    ? ["http://localhost"]
    : ["http://localhost:5173"];
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : defaultOrigins;

// ─── RATE LIMITERS ────────────────────────────────────────────────────────────

// Strict limiter for auth endpoints — prevents brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Please try again in 15 minutes." },
});

// General API limiter — prevents abuse of all API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // 100 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(cors({ origin: corsOrigins, credentials: true }));

// Prometheus metrics middleware — must be before routes
app.use(metricsMiddleware);

// Apply general rate limiter to all API routes
app.use("/api/", apiLimiter);

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);   // extra strict on auth
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/health", healthRoutes);
app.use("/metrics", metricsRoutes);

// ─── STATIC (Production) ──────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// ─── GLOBAL ERROR HANDLER (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── START SERVER ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});
