import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userRepository } from "../repositories/user.repository";
import type { User } from "../entities/user.entity";

export class AuthError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export const authService = {
  signup: async (fullName: string, email: string, password: string): Promise<User> => {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AuthError("Email already exists", 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    return userRepository.create({ fullName, email, password: hashedPassword });
  },

  login: async (email: string, password: string): Promise<User> => {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AuthError("Invalid credentials", 400);
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      throw new AuthError("Invalid credentials", 400);
    }

    return user;
  },

  verifyToken: (token: string): { userId: string } => {
    if (!process.env.JWT_SECRET) {
      throw new AuthError("JWT_SECRET environment variable is required", 500);
    }
    return jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
  },
};
