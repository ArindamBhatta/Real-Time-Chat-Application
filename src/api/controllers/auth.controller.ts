import type { Request, Response } from "express";
import { generateToken } from "../../lib/utils";
import { authService, AuthError } from "../services/auth.service";
import { userService } from "../services/user.service";

export const signup = async (req: Request, res: Response) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const newUser = await authService.signup(fullName, email, password);

    generateToken(newUser.id, res);

    res.status(201).json(newUser.toSafeJSON());
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.log("Error in signup controller", (error as Error).message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await authService.login(email, password);

    generateToken(user.id, res);

    res.status(200).json(user.toSafeJSON());
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.log("Error in login controller", (error as Error).message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req: Request, res: Response) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", (error as Error).message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user!.id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const updatedUser = await userService.updateProfilePic(userId, profilePic);

    res.status(200).json(updatedUser.toSafeJSON());
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req: Request, res: Response) => {
  try {
    res.status(200).json(req.user!.toSafeJSON());
  } catch (error) {
    console.log("Error in checkAuth controller", (error as Error).message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
