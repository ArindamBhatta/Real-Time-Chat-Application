import jwt from "jsonwebtoken";
import type { Response } from "express";

export const generateToken = (userId: string, res: Response): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    httpOnly: true, // prevents XSS — JS cannot access this cookie
    sameSite: "lax", // "strict" breaks Safari on http://localhost; "lax" is safe for same-site nav
    secure: false, // must be false for http:// (localhost) — Safari rejects secure cookies on non-HTTPS
  });

  return token;
};
