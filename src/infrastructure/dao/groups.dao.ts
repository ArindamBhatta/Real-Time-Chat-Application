import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  groupMembersTable,
  groupsTable,
  type GroupRow,
  type NewGroupRow,
} from "../schema/index";

export const groupsDao = {
  findById: async (id: string): Promise<GroupRow | undefined> => {
    const [row] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
    return row;
  },

  findByIdForMember: async (id: string, userId: string): Promise<GroupRow | undefined> => {
    const [row] = await db
      .select({ group: groupsTable })
      .from(groupsTable)
      .innerJoin(
        groupMembersTable,
        and(eq(groupMembersTable.groupId, groupsTable.id), eq(groupMembersTable.userId, userId))
      )
      .where(eq(groupsTable.id, id))
      .then((rows) => rows.map((r) => r.group));
    return row;
  },

  findForUser: async (userId: string): Promise<GroupRow[]> => {
    return db
      .select({ group: groupsTable })
      .from(groupsTable)
      .innerJoin(
        groupMembersTable,
        and(eq(groupMembersTable.groupId, groupsTable.id), eq(groupMembersTable.userId, userId))
      )
      .orderBy(desc(groupsTable.updatedAt))
      .then((rows) => rows.map((r) => r.group));
  },

  memberIds: async (groupId: string): Promise<string[]> => {
    const rows = await db
      .select({ userId: groupMembersTable.userId })
      .from(groupMembersTable)
      .where(eq(groupMembersTable.groupId, groupId));
    return rows.map((r) => r.userId);
  },

  isMember: async (groupId: string, userId: string): Promise<boolean> => {
    const [row] = await db
      .select({ userId: groupMembersTable.userId })
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
    return Boolean(row);
  },

  insert: async (data: NewGroupRow): Promise<GroupRow> => {
    const [row] = await db.insert(groupsTable).values(data).returning();
    return row;
  },

  addMembers: async (groupId: string, userIds: string[]): Promise<void> => {
    if (userIds.length === 0) return;
    await db
      .insert(groupMembersTable)
      .values(userIds.map((userId) => ({ groupId, userId })))
      .onConflictDoNothing();
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    await db
      .delete(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
  },

  touchUpdatedAt: async (groupId: string): Promise<void> => {
    await db.update(groupsTable).set({ updatedAt: new Date() }).where(eq(groupsTable.id, groupId));
  },
};
