import cloudinary from "../../lib/cloudinary";
import { userRepository } from "../repositories/user.repository";
import type { User } from "../entities/user.entity";
import { AuthError } from "./auth.service";

export const userService = {
  getById: async (id: string): Promise<User | null> => {
    return userRepository.findById(id);
  },

  listAllExcept: async (userId: string): Promise<User[]> => {
    return userRepository.listAllExcept(userId);
  },

  updateProfilePic: async (userId: string, profilePicDataUrl: string): Promise<User> => {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new AuthError("Cloudinary credentials are not configured in the backend .env file.", 400);
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePicDataUrl);
    const updatedUser = await userRepository.updateProfilePic(userId, uploadResponse.secure_url);
    if (!updatedUser) {
      throw new AuthError("User not found", 404);
    }
    return updatedUser;
  },
};
