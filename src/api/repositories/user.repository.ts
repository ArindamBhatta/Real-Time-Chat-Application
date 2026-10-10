import { usersDao } from "../../infrastructure/dao/users.dao";
import type { NewUserRow, UserRow } from "../../infrastructure/schema/index";
import { User } from "../entities/user.entity";

const toEntity = (row: UserRow): User =>
  new User(
    row.id,
    row.email,
    row.fullName,
    row.password,
    row.profilePic,
    row.role,
    row.lastSeen,
    row.createdAt,
    row.updatedAt
  );

export const userRepository = {
  findById: async (id: string): Promise<User | null> => {
    const row = await usersDao.findById(id);
    return row ? toEntity(row) : null;
  },

  findByEmail: async (email: string): Promise<User | null> => {
    const row = await usersDao.findByEmail(email);
    return row ? toEntity(row) : null;
  },

  listAllExcept: async (userId: string): Promise<User[]> => {
    const rows = await usersDao.findAllExcept(userId);
    return rows.map(toEntity);
  },

  create: async (data: { email: string; fullName: string; password: string }): Promise<User> => {
    const insert: NewUserRow = {
      email: data.email,
      fullName: data.fullName,
      password: data.password,
    };
    const row = await usersDao.insert(insert);
    return toEntity(row);
  },

  updateProfilePic: async (id: string, profilePic: string): Promise<User | null> => {
    const row = await usersDao.updateById(id, { profilePic });
    return row ? toEntity(row) : null;
  },
};
