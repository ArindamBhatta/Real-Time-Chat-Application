import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/messages/:id?page=1&limit=50
 * Returns paginated messages between the logged-in user and another user.
 * Newest messages come last (chronological order for the UI).
 */
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Pagination params (defaults: page 1, 50 messages)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({
        $or: [
          { senderId: myId, receiverId: userToChatId },
          { senderId: userToChatId, receiverId: myId },
        ],
      })
        .sort({ createdAt: -1 }) // newest first from DB
        .skip(skip)
        .limit(limit),
      Message.countDocuments({
        $or: [
          { senderId: myId, receiverId: userToChatId },
          { senderId: userToChatId, receiverId: myId },
        ],
      }),
    ]);

    // Reverse so UI gets chronological order (oldest at top)
    const chronological = messages.reverse();

    res.status(200).json({
      messages: chronological,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/messages/search?q=hello&limit=20
 * Full-text search across messages the logged-in user sent or received.
 */
export const searchMessages = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const myId = req.user._id;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Search query 'q' is required" });
    }

    const results = await Message.find({
      $text: { $search: q.trim() },
      $or: [{ senderId: myId }, { receiverId: myId }],
    })
      .select({ score: { $meta: "textScore" }, text: 1, senderId: 1, receiverId: 1, createdAt: 1 })
      .sort({ score: { $meta: "textScore" } })
      .limit(Math.min(50, parseInt(limit)));

    res.status(200).json({ results, count: results.length });
  } catch (error) {
    console.log("Error in searchMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/messages/send/:id
 * Sends a message to a user.
 * Auto-promotes status to "delivered" if the receiver is currently online.
 */
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(400).json({ message: "Cloudinary credentials are not configured in the backend .env file." });
      }
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Determine initial status: "delivered" if receiver is online, otherwise "sent"
    const receiverSocketId = getReceiverSocketId(receiverId);
    const initialStatus = receiverSocketId ? "delivered" : "sent";

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      status: initialStatus,
    });

    await newMessage.save();

    // Real-time delivery to receiver
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    // Notify sender of the updated status (delivered vs sent) so their UI updates immediately
    const senderSocketId = getReceiverSocketId(senderId.toString());
    if (senderSocketId && initialStatus === "delivered") {
      io.to(senderSocketId).emit("messageStatusUpdate", {
        messageId: newMessage._id,
        status: "delivered",
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PATCH /api/messages/:id/read
 * Marks a message as read and notifies the original sender via Socket.io.
 */
export const markMessageRead = async (req, res) => {
  try {
    const { id } = req.params;
    const readerId = req.user._id;

    const message = await Message.findOneAndUpdate(
      { _id: id, receiverId: readerId, status: { $ne: "read" } },
      { status: "read", readAt: new Date() },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: "Message not found or already read" });
    }

    // Notify sender that their message was read
    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageReadAck", { messageId: id, readAt: message.readAt });
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in markMessageRead controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
