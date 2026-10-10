import cloudinary from "../../lib/cloudinary";
import { io } from "../../lib/socket";
import { groupRepository } from "../repositories/group.repository";
import { messageRepository, type PaginatedMessages } from "../repositories/message.repository";
import type { Group } from "../entities/group.entity";
import type { Message } from "../entities/message.entity";
import { AuthError } from "./auth.service";

export const groupService = {
  create: async (params: { name: string; description?: string; adminId: string; memberIds: string[] }): Promise<Group> => {
    const { name, description, adminId, memberIds } = params;

    if (!name || name.trim().length === 0) {
      throw new AuthError("Group name is required", 400);
    }

    // Ensure admin is in members + deduplicate
    const uniqueMembers = [...new Set([adminId, ...memberIds])];

    return groupRepository.create({
      name: name.trim(),
      description: description?.trim() || "",
      adminId,
      memberIds: uniqueMembers,
    });
  },

  listForUser: async (userId: string): Promise<Group[]> => {
    return groupRepository.listForUser(userId);
  },

  getForMember: async (groupId: string, userId: string): Promise<Group> => {
    const group = await groupRepository.findByIdForMember(groupId, userId);
    if (!group) {
      throw new AuthError("Group not found or you are not a member", 404);
    }
    return group;
  },

  addMember: async (groupId: string, requesterId: string, userId: string): Promise<Group> => {
    const group = await groupRepository.findById(groupId);
    if (!group) throw new AuthError("Group not found", 404);

    if (group.adminId !== requesterId) {
      throw new AuthError("Only the group admin can add members", 403);
    }

    if (group.memberIds.includes(userId)) {
      throw new AuthError("User is already a member", 400);
    }

    const updated = await groupRepository.addMember(groupId, userId);
    if (!updated) throw new AuthError("Group not found", 404);

    io.to(`group:${groupId}`).emit("groupMemberAdded", { groupId, userId });

    return updated;
  },

  removeMember: async (groupId: string, requesterId: string, userId: string): Promise<string> => {
    const group = await groupRepository.findById(groupId);
    if (!group) throw new AuthError("Group not found", 404);

    const isAdmin = group.adminId === requesterId;
    const isSelf = userId === requesterId;

    if (!isAdmin && !isSelf) {
      throw new AuthError("Only the admin can remove other members", 403);
    }

    if (isAdmin && isSelf) {
      throw new AuthError("Admin cannot leave — transfer ownership first", 400);
    }

    await groupRepository.removeMember(groupId, userId);

    io.to(`group:${groupId}`).emit("groupMemberRemoved", { groupId, userId });

    return groupId;
  },

  getMessages: async (
    groupId: string,
    userId: string,
    page: number,
    limit: number
  ): Promise<PaginatedMessages> => {
    const isMember = await groupRepository.isMember(groupId, userId);
    if (!isMember) throw new AuthError("Not a member of this group", 403);

    return messageRepository.findByGroup(groupId, page, limit);
  },

  sendMessage: async (params: {
    groupId: string;
    senderId: string;
    text?: string;
    image?: string;
  }): Promise<Message> => {
    const { groupId, senderId, text, image } = params;

    const isMember = await groupRepository.isMember(groupId, senderId);
    if (!isMember) throw new AuthError("Not a member of this group", 403);

    let imageUrl: string | undefined;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = await messageRepository.create({ senderId, groupId, text, image: imageUrl });

    io.to(`group:${groupId}`).emit("newGroupMessage", newMessage);

    return newMessage;
  },
};
