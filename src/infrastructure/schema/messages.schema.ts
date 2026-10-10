import { pgTable, uuid, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users.schema";
import { groupsTable } from "./groups.schema";

export const messageStatusEnum = pgEnum("message_status", ["sent", "delivered", "read"]);

export const messagesTable = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => usersTable.id),
    receiverId: uuid("receiver_id").references(() => usersTable.id),
    groupId: uuid("group_id").references(() => groupsTable.id),
    text: text("text"),
    image: text("image"),
    status: messageStatusEnum("status").notNull().default("sent"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Compound index for fast 1-to-1 conversation lookup (most frequent query)
    index("messages_sender_receiver_created_idx").on(
      table.senderId,
      table.receiverId,
      table.createdAt.desc()
    ),
    // Index for group messages, newest first
    index("messages_group_created_idx").on(table.groupId, table.createdAt.desc()),
    // Full-text search index on message content (GIN over to_tsvector)
    index("messages_text_fts_idx").using("gin", sql`to_tsvector('english', ${table.text})`),
  ]
);

export type MessageRow = typeof messagesTable.$inferSelect;
export type NewMessageRow = typeof messagesTable.$inferInsert;
