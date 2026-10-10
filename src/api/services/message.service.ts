import cloudinary from "../../lib/cloudinary";
import { getReceiverSocketId, io } from "../../lib/socket";
import { messageRepository, type PaginatedMessages } from "../repositories/message.repository";
import type { Message } from "../entities/message.entity";
import { AuthError } from "./auth.service";

export const messageService = {
  getConversation: async (
    myId: string,
    otherUserId: string,
    page: number,
    limit: number
  ): Promise<PaginatedMessages & { chronological: Message[] }> => {
    const result = await messageRepository.findConversation(myId, otherUserId, page, limit);
    return { ...result, chronological: [...result.messages].reverse() };
  },

  search: async (userId: string, query: string, limit: number): Promise<Message[]> => {
    return messageRepository.search(userId, query, limit);
  },

  send: async (params: {
    senderId: string;
    receiverId: string;
    text?: string;
    image?: string;
  }): Promise<Message> => {
    const { senderId, receiverId, text, image } = params;

    let imageUrl: string | undefined;
    if (image) {
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        throw new AuthError("Cloudinary credentials are not configured in the backend .env file.", 400);
      }
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Determine initial status: "delivered" if receiver is online, otherwise "sent"
    const receiverSocketId = getReceiverSocketId(receiverId);
    const initialStatus = receiverSocketId ? "delivered" : "sent";

    const newMessage = await messageRepository.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      status: initialStatus,
    });

    // Real-time delivery to receiver
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    // Notify sender of the updated status (delivered vs sent) so their UI updates immediately
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId && initialStatus === "delivered") {
      io.to(senderSocketId).emit("messageStatusUpdate", {
        messageId: newMessage.id,
        status: "delivered",
      });
    }

    return newMessage;
  },

  markRead: async (messageId: string, readerId: string): Promise<Message> => {
    const message = await messageRepository.markReadIfUnread(messageId, readerId);
    if (!message) {
      throw new AuthError("Message not found or already read", 404);
    }

    const senderSocketId = getReceiverSocketId(message.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageReadAck", { messageId, readAt: message.readAt });
    }

    return message;
  },
};
