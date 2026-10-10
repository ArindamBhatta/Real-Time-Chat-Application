import type { User } from "../api/entities/user.entity";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
