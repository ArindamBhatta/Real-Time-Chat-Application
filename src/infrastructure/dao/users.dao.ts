import { eq, ne } from "drizzle-orm";
import { db } from "../db";
import { usersTable, type NewUserRow, type UserRow } from "../schema/index";

export const usersDao = {
  findById: async (id: string): Promise<UserRow | undefined> => {
    const [row] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return row;
  },

  findByEmail: async (email: string): Promise<UserRow | undefined> => {
    const [row] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    return row;
  },

  findAllExcept: async (userId: string): Promise<UserRow[]> => {
    return db.select().from(usersTable).where(ne(usersTable.id, userId));
  },

  insert: async (data: NewUserRow): Promise<UserRow> => {
    const [row] = await db.insert(usersTable).values(data).returning();
    return row;
  },

  updateById: async (id: string, data: Partial<NewUserRow>): Promise<UserRow | undefined> => {
    const [row] = await db
      .update(usersTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();
    return row;
  },
};
