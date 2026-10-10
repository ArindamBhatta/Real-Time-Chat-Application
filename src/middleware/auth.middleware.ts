import type { NextFunction, Request, Response } from "express";
import { authService } from "../api/services/auth.service";
import { userService } from "../api/services/user.service";

export const protectRoute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = authService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const user = await userService.getById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("Error in protectRoute middleware: ", (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
};
