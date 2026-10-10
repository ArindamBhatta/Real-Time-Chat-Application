import { Server } from "socket.io";
import http from "http";
import express from "express";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { websocketConnectionsGauge } from "./metrics";

const app = express();
// Create an HTTP server to attach Socket.io to
const server = http.createServer(app);

// Parse CORS origins from environment or use defaults
const defaultOrigins = ["http://localhost:5173", "http://localhost:8080", "http://localhost"];
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : defaultOrigins;

// creating the Socket.io server
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
});

// ─── REDIS ADAPTER (optional — graceful fallback if REDIS_URL not set) ────────
if (process.env.REDIS_URL) {
  try {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) => console.warn("[Redis] pub error:", err.message));
    subClient.on("error", (err) => console.warn("[Redis] sub error:", err.message));

    io.adapter(createAdapter(pubClient, subClient));
    console.log("[Socket.io] Redis adapter enabled — horizontal scaling active");
  } catch (err) {
    console.warn("[Socket.io] Redis adapter failed, falling back to in-memory:", (err as Error).message);
  }
} else {
  console.log("[Socket.io] REDIS_URL not set — using in-memory adapter (single instance only)");
}

// Maps userId → socketId for fast 1-to-1 delivery
const userSocketMap: Record<string, string> = {};

export function getReceiverSocketId(userId: string): string | undefined {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId as string | undefined;
  if (userId) userSocketMap[userId] = socket.id;

  // Track active WebSocket connections for Prometheus
  websocketConnectionsGauge.inc();

  // Broadcast updated online users list to everyone
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // ─── TYPING INDICATORS (1-to-1) ──────────────────────────────────────────
  socket.on("typing", ({ to }: { to: string }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { from: userId });
    }
  });

  socket.on("stopTyping", ({ to }: { to: string }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStopTyping", { from: userId });
    }
  });

  // ─── GROUP TYPING INDICATORS ──────────────────────────────────────────────
  socket.on("typingInGroup", ({ groupId }: { groupId: string }) => {
    socket.to(`group:${groupId}`).emit("userTypingInGroup", { from: userId, groupId });
  });

  socket.on("stopTypingInGroup", ({ groupId }: { groupId: string }) => {
    socket.to(`group:${groupId}`).emit("userStopTypingInGroup", { from: userId, groupId });
  });

  // ─── JOIN/LEAVE GROUP ROOMS ───────────────────────────────────────────────
  socket.on("joinGroups", ({ groupIds }: { groupIds: string[] }) => {
    if (Array.isArray(groupIds)) {
      groupIds.forEach((gid) => socket.join(`group:${gid}`));
    }
  });

  socket.on("leaveGroup", ({ groupId }: { groupId: string }) => {
    socket.leave(`group:${groupId}`);
  });

  // ─── READ RECEIPTS (bulk mark-read via socket — no HTTP round-trip) ───────
  // Payload: { messageIds: string[], senderId: string }
  // Marks multiple messages as read and notifies the original sender in real time.
  socket.on("markRead", ({ messageIds, senderId }: { messageIds: string[]; senderId: string }) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;

    // Notify the original sender that their messages were read
    const senderSocketId = userSocketMap[senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", {
        messageIds,
        readBy: userId,
        readAt: new Date().toISOString(),
      });
    }
  });

  // ─── DISCONNECT ───────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    if (userId) delete userSocketMap[userId];
    websocketConnectionsGauge.dec();
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
