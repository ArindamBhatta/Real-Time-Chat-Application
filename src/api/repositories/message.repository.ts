import { messagesDao } from "../../infrastructure/dao/messages.dao";
import type { MessageRow } from "../../infrastructure/schema/index";
import { Message, type MessageStatus } from "../entities/message.entity";

const toEntity = (row: MessageRow): Message =>
  new Message(
    row.id,
    row.senderId,
    row.receiverId,
    row.groupId,
    row.text,
    row.image,
    row.status,
    row.readAt,
    row.createdAt,
    row.updatedAt
  );

export interface PaginatedMessages {
  messages: Message[];
  total: number;
}

export const messageRepository = {
  findConversation: async (
    userAId: string,
    userBId: string,
    page: number,
    limit: number
  ): Promise<PaginatedMessages> => {
    const offset = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      messagesDao.findConversation(userAId, userBId, limit, offset),
      messagesDao.countConversation(userAId, userBId),
    ]);
    return { messages: rows.map(toEntity), total };
  },

  findByGroup: async (
    groupId: string,
    page: number,
    limit: number
  ): Promise<PaginatedMessages> => {
    const offset = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      messagesDao.findByGroup(groupId, limit, offset),
      messagesDao.countByGroup(groupId),
    ]);
    return { messages: rows.map(toEntity), total };
  },

  search: async (userId: string, query: string, limit: number): Promise<Message[]> => {
    const rows = await messagesDao.searchForUser(userId, query, limit);
    return rows.map(toEntity);
  },

  create: async (data: {
    senderId: string;
    receiverId?: string | null;
    groupId?: string | null;
    text?: string | null;
    image?: string | null;
    status?: MessageStatus;
  }): Promise<Message> => {
    const row = await messagesDao.insert({
      senderId: data.senderId,
      receiverId: data.receiverId ?? null,
      groupId: data.groupId ?? null,
      text: data.text ?? null,
      image: data.image ?? null,
      status: data.status ?? "sent",
    });
    return toEntity(row);
  },

  markReadIfUnread: async (messageId: string, readerId: string): Promise<Message | null> => {
    const row = await messagesDao.markReadIfUnread(messageId, readerId);
    return row ? toEntity(row) : null;
  },
};
