import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../api/entities/user.entity";

/**
 * Role-based access control middleware.
 *
 * Usage:
 *   router.delete("/user/:id", protectRoute, requireRole("admin"), deleteUser);
 *   router.get("/dashboard", protectRoute, requireRole("admin", "moderator"), getStats);
 *
 * Must be used AFTER protectRoute (which sets req.user).
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden - Requires one of the following roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
};
