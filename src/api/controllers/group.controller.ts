import type { Request, Response } from "express";
import { groupService } from "../services/group.service";
import { AuthError } from "../services/auth.service";

/**
 * POST /api/groups
 * Creates a new group. The creator is automatically set as admin and first member.
 */
export const createGroup = async (req: Request, res: Response) => {
  try {
    const { name, description, memberIds = [] } = req.body;
    const adminId = req.user!.id;

    const group = await groupService.create({ name, description, adminId, memberIds });

    res.status(201).json(group);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.log("Error in createGroup: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/groups
 * Returns all groups the logged-in user is a member of.
 */
export const getMyGroups = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const groups = await groupService.listForUser(userId);

    res.status(200).json(groups);
  } catch (error) {
    console.log("Error in getMyGroups: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/groups/:id
 * Returns a single group (must be a member).
 */
export const getGroup = async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id as string;
    const group = await groupService.getForMember(groupId, req.user!.id);
    res.status(200).json(group);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.log("Error in getGroup: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/groups/:id/members
 * Admin adds a new member to the group.
 */
export const addMember = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const groupId = req.params.id as string;
    const group = await groupService.addMember(groupId, req.user!.id, userId);

    res.status(200).json(group);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.log("Error in addMember: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/groups/:id/members/:userId
 * Admin removes a member, or a member removes themselves (leave group).
 */
export const removeMember = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const groupId = req.params.id as string;
    await groupService.removeMember(groupId, req.user!.id, userId);

    res.status(200).json({ message: "Member removed", groupId });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.log("Error in removeMember: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/groups/:id/messages?page=1&limit=50
 * Returns paginated messages for a group (must be a member).
 */
export const getGroupMessages = async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id as string;
    const userId = req.user!.id;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

    const { messages, total } = await groupService.getMessages(groupId, userId, page, limit);

    res.status(200).json({
      messages: [...messages].reverse(),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.log("Error in getGroupMessages: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/groups/:id/messages
 * Sends a message to a group (must be a member).
 */
export const sendGroupMessage = async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id as string;
    const senderId = req.user!.id;
    const { text, image } = req.body;

    const newMessage = await groupService.sendMessage({ groupId, senderId, text, image });

    res.status(201).json(newMessage);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.log("Error in sendGroupMessage: ", (error as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
};
