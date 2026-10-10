import express from "express";
import { protectRoute } from "../middleware/auth.middleware";
import {
  createGroup,
  getMyGroups,
  getGroup,
  addMember,
  removeMember,
  getGroupMessages,
  sendGroupMessage,
} from "../api/controllers/group.controller";

const router = express.Router();

// All group routes require authentication
router.use(protectRoute);

router.post("/", createGroup); // POST   /api/groups
router.get("/", getMyGroups); // GET    /api/groups
router.get("/:id", getGroup); // GET    /api/groups/:id
router.post("/:id/members", addMember); // POST   /api/groups/:id/members
router.delete("/:id/members/:userId", removeMember); // DELETE /api/groups/:id/members/:userId
router.get("/:id/messages", getGroupMessages); // GET    /api/groups/:id/messages?page=1
router.post("/:id/messages", sendGroupMessage); // POST   /api/groups/:id/messages

export default router;
