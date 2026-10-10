import type { NextFunction, Request, Response } from "express";
import { httpRequestDuration, httpRequestsTotal } from "../lib/metrics";

/**
 * Express middleware that records Prometheus metrics for every request.
 * Tracks request duration (histogram) and total count (counter).
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip metrics endpoint to avoid self-referential recording
  if (req.path === "/metrics") {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;

    // Normalize route to avoid high cardinality (e.g., /api/messages/123 → /api/messages/:id)
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;

    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode,
    };

    httpRequestDuration.observe(labels, durationSec);
    httpRequestsTotal.inc(labels);
  });

  next();
};
