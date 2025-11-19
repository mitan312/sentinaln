// backend/src/lib/socket.js
import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// Use env var for deploy
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

console.log("🚀 FRONTEND_URL SOCKET CORS:", FRONTEND_URL);

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL],
    credentials: true,
  },
});

// map userId -> socketId
const userSocketMap = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  const userId =
    socket.handshake?.auth?.userId ||
    socket.handshake?.query?.userId;

  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log("User connected:", userId, "->", socket.id);
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("privateMessage", ({ toUserId, message }) => {
    const toSocketId = userSocketMap[toUserId];
    if (toSocketId) {
      io.to(toSocketId).emit("newMessage", { from: userId, message });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (userId) delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
