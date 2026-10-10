import type { NextFunction, Request, Response } from "express";

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

/**
 * Global Express error handler.
 *
 * Must be registered as the LAST app.use() in index.ts so it catches
 * errors thrown from all routes and middleware above it.
 *
 * Usage in a route/controller:
 *   next(new Error("Something went wrong"));   // 500
 *   const err: HttpError = new Error("Not found"); err.status = 404; next(err);
 */
export const errorHandler = (err: HttpError, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log full error in dev, stack trace helps with debugging
  if (process.env.NODE_ENV !== "production") {
    console.error(`[Error] ${req.method} ${req.originalUrl} — ${message}`);
    console.error(err.stack);
  } else {
    // In production, only log the message (no stack trace to stdout)
    console.error(`[Error] ${req.method} ${req.originalUrl} — ${message}`);
  }

  res.status(status).json({
    error: {
      message,
      // Only expose stack trace in development for security
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    },
  });
};
