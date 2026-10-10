import express from "express";
import { checkDbConnection } from "../infrastructure/db";

const router = express.Router();

// Health check endpoint
router.get("/", async (req, res) => {
  try {
    const isConnected = await checkDbConnection();

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: isConnected ? "connected" : "disconnected",
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    });
  }
});

export default router;
