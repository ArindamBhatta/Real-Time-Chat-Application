import { groupsDao } from "../../infrastructure/dao/groups.dao";
import type { GroupRow } from "../../infrastructure/schema/index";
import { Group } from "../entities/group.entity";

const toEntity = async (row: GroupRow): Promise<Group> => {
  const memberIds = await groupsDao.memberIds(row.id);
  return new Group(
    row.id,
    row.name,
    row.description,
    row.avatar,
    row.adminId,
    memberIds,
    row.createdAt,
    row.updatedAt
  );
};

export const groupRepository = {
  findById: async (id: string): Promise<Group | null> => {
    const row = await groupsDao.findById(id);
    return row ? toEntity(row) : null;
  },

  findByIdForMember: async (id: string, userId: string): Promise<Group | null> => {
    const row = await groupsDao.findByIdForMember(id, userId);
    return row ? toEntity(row) : null;
  },

  listForUser: async (userId: string): Promise<Group[]> => {
    const rows = await groupsDao.findForUser(userId);
    return Promise.all(rows.map(toEntity));
  },

  isMember: async (groupId: string, userId: string): Promise<boolean> => {
    return groupsDao.isMember(groupId, userId);
  },

  create: async (data: {
    name: string;
    description: string;
    adminId: string;
    memberIds: string[];
  }): Promise<Group> => {
    const row = await groupsDao.insert({
      name: data.name,
      description: data.description,
      adminId: data.adminId,
    });
    await groupsDao.addMembers(row.id, data.memberIds);
    return toEntity(row);
  },

  addMember: async (groupId: string, userId: string): Promise<Group | null> => {
    await groupsDao.addMembers(groupId, [userId]);
    await groupsDao.touchUpdatedAt(groupId);
    return groupRepository.findById(groupId);
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    await groupsDao.removeMember(groupId, userId);
    await groupsDao.touchUpdatedAt(groupId);
  },
};
