import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { db } from "../db";
import { messagesTable, type MessageRow, type NewMessageRow } from "../schema/index";

export const messagesDao = {
  findConversation: async (
    userAId: string,
    userBId: string,
    limit: number,
    offset: number
  ): Promise<MessageRow[]> => {
    return db
      .select()
      .from(messagesTable)
      .where(
        or(
          and(eq(messagesTable.senderId, userAId), eq(messagesTable.receiverId, userBId)),
          and(eq(messagesTable.senderId, userBId), eq(messagesTable.receiverId, userAId))
        )
      )
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit)
      .offset(offset);
  },

  countConversation: async (userAId: string, userBId: string): Promise<number> => {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messagesTable)
      .where(
        or(
          and(eq(messagesTable.senderId, userAId), eq(messagesTable.receiverId, userBId)),
          and(eq(messagesTable.senderId, userBId), eq(messagesTable.receiverId, userAId))
        )
      );
    return row?.count ?? 0;
  },

  findByGroup: async (groupId: string, limit: number, offset: number): Promise<MessageRow[]> => {
    return db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.groupId, groupId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit)
      .offset(offset);
  },

  countByGroup: async (groupId: string): Promise<number> => {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messagesTable)
      .where(eq(messagesTable.groupId, groupId));
    return row?.count ?? 0;
  },

  searchForUser: async (userId: string, query: string, limit: number): Promise<MessageRow[]> => {
    return db
      .select()
      .from(messagesTable)
      .where(
        and(
          sql`to_tsvector('english', ${messagesTable.text}) @@ plainto_tsquery('english', ${query})`,
          or(eq(messagesTable.senderId, userId), eq(messagesTable.receiverId, userId))
        )
      )
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit);
  },

  insert: async (data: NewMessageRow): Promise<MessageRow> => {
    const [row] = await db.insert(messagesTable).values(data).returning();
    return row;
  },

  markReadIfUnread: async (
    messageId: string,
    readerId: string
  ): Promise<MessageRow | undefined> => {
    const [row] = await db
      .update(messagesTable)
      .set({ status: "read", readAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(messagesTable.id, messageId),
          eq(messagesTable.receiverId, readerId),
          ne(messagesTable.status, "read")
        )
      )
      .returning();
    return row;
  },
};
