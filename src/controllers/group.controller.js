import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";

/**
 * POST /api/groups
 * Creates a new group. The creator is automatically set as admin and first member.
 */
export const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds = [] } = req.body;
    const adminId = req.user._id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Group name is required" });
    }

    // Ensure admin is in members + deduplicate
    const uniqueMembers = [...new Set([adminId.toString(), ...memberIds])];

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || "",
      admin: adminId,
      members: uniqueMembers,
    });

    await group.save();
    await group.populate("members", "-password");
    await group.populate("admin", "-password");

    res.status(201).json(group);
  } catch (error) {
    console.log("Error in createGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/groups
 * Returns all groups the logged-in user is a member of.
 */
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ members: userId })
      .populate("admin", "-password")
      .populate("members", "-password")
      .sort({ updatedAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.log("Error in getMyGroups: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/groups/:id
 * Returns a single group (must be a member).
 */
export const getGroup = async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id })
      .populate("admin", "-password")
      .populate("members", "-password");

    if (!group) {
      return res.status(404).json({ error: "Group not found or you are not a member" });
    }

    res.status(200).json(group);
  } catch (error) {
    console.log("Error in getGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/groups/:id/members
 * Admin adds a new member to the group.
 */
export const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) return res.status(404).json({ error: "Group not found" });

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the group admin can add members" });
    }

    if (group.members.map(String).includes(userId)) {
      return res.status(400).json({ error: "User is already a member" });
    }

    group.members.push(userId);
    await group.save();
    await group.populate("members", "-password");

    // Notify the group room of new member
    io.to(`group:${group._id}`).emit("groupMemberAdded", { groupId: group._id, userId });

    res.status(200).json(group);
  } catch (error) {
    console.log("Error in addMember: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/groups/:id/members/:userId
 * Admin removes a member, or a member removes themselves (leave group).
 */
export const removeMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user._id.toString();
    const group = await Group.findById(req.params.id);

    if (!group) return res.status(404).json({ error: "Group not found" });

    const isAdmin = group.admin.toString() === requesterId;
    const isSelf = userId === requesterId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Only the admin can remove other members" });
    }

    if (isAdmin && isSelf) {
      return res.status(400).json({ error: "Admin cannot leave — transfer ownership first" });
    }

    group.members = group.members.filter((m) => m.toString() !== userId);
    await group.save();

    io.to(`group:${group._id}`).emit("groupMemberRemoved", { groupId: group._id, userId });

    res.status(200).json({ message: "Member removed", groupId: group._id });
  } catch (error) {
    console.log("Error in removeMember: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/groups/:id/messages?page=1&limit=50
 * Returns paginated messages for a group (must be a member).
 */
export const getGroupMessages = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user._id;

    const group = await Group.findOne({ _id: groupId, members: userId });
    if (!group) return res.status(403).json({ error: "Not a member of this group" });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ groupId })
        .populate("senderId", "fullName profilePic")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ groupId }),
    ]);

    res.status(200).json({
      messages: messages.reverse(),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.log("Error in getGroupMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/groups/:id/messages
 * Sends a message to a group (must be a member).
 */
export const sendGroupMessage = async (req, res) => {
  try {
    const groupId = req.params.id;
    const senderId = req.user._id;
    const { text, image } = req.body;

    const group = await Group.findOne({ _id: groupId, members: senderId });
    if (!group) return res.status(403).json({ error: "Not a member of this group" });

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({ senderId, groupId, text, image: imageUrl });
    await newMessage.save();
    await newMessage.populate("senderId", "fullName profilePic");

    // Broadcast to all group members in the Socket.io room
    io.to(`group:${groupId}`).emit("newGroupMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendGroupMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
