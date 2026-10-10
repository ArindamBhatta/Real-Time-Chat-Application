import type { Request, Response } from "express";
import { messageService } from "../services/message.service";
import { userService } from "../services/user.service";
import { AuthError } from "../services/auth.service";

export const getUsersForSidebar = async (req: Request, res: Response) => {
  try {
    const loggedInUserId = req.user!.id;
    const filteredUsers = await userService.listAllExcept(loggedInUserId);

    res.status(200).json(filteredUsers.map((u) => u.toSafeJSON()));
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/messages/:id?page=1&limit=50
 * Returns paginated messages between the logged-in user and another user.
 * Newest messages come last (chronological order for the UI).
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userToChatId = req.params.id as string;
    const myId = req.user!.id;

    // Pagination params (defaults: page 1, 50 messages)
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

    const { chronological, total } = await messageService.getConversation(myId, userToChatId, page, limit);

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
    console.log("Error in getMessages controller: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/messages/search?q=hello&limit=20
 * Full-text search across messages the logged-in user sent or received.
 */
export const searchMessages = async (req: Request, res: Response) => {
  try {
    const { q, limit = "20" } = req.query as { q?: string; limit?: string };
    const myId = req.user!.id;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Search query 'q' is required" });
    }

    const results = await messageService.search(myId, q.trim(), Math.min(50, parseInt(limit)));

    res.status(200).json({ results, count: results.length });
  } catch (error) {
    console.log("Error in searchMessages controller: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/messages/send/:id
 * Sends a message to a user.
 * Auto-promotes status to "delivered" if the receiver is currently online.
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.id as string;
    const senderId = req.user!.id;

    const newMessage = await messageService.send({ senderId, receiverId, text, image });

    res.status(201).json(newMessage);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.log("Error in sendMessage controller: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PATCH /api/messages/:id/read
 * Marks a message as read and notifies the original sender via Socket.io.
 */
export const markMessageRead = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const readerId = req.user!.id;

    const message = await messageService.markRead(id, readerId);

    res.status(200).json(message);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.log("Error in markMessageRead controller: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};
