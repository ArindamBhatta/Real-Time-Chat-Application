import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users.schema";

export const groupsTable = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }).notNull().default(""),
  avatar: text("avatar").notNull().default(""),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembersTable = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groupsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("group_members_group_id_idx").on(table.groupId),
    index("group_members_user_id_idx").on(table.userId),
  ]
);

export type GroupRow = typeof groupsTable.$inferSelect;
export type NewGroupRow = typeof groupsTable.$inferInsert;
export type GroupMemberRow = typeof groupMembersTable.$inferSelect;
export type NewGroupMemberRow = typeof groupMembersTable.$inferInsert;
