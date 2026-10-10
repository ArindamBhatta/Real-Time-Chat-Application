import express from "express";
import { protectRoute } from "../middleware/auth.middleware";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  searchMessages,
  markMessageRead,
} from "../api/controllers/message.controller";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/search", protectRoute, searchMessages); // GET /api/messages/search?q=hello
router.get("/:id", protectRoute, getMessages); // GET /api/messages/:userId?page=1&limit=50
router.post("/send/:id", protectRoute, sendMessage);
router.patch("/:id/read", protectRoute, markMessageRead); // PATCH /api/messages/:id/read

export default router;
