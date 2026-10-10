import express from "express";
import { register } from "../lib/metrics";

const router = express.Router();

// Prometheus metrics endpoint — returns metrics in text exposition format
router.get("/", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
