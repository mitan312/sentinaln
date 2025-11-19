// backend/src/lib/socket.js
import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// Use env var so you can set production frontend URL in Render/Vercel
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// map userId -> socketId
const userSocketMap = {};

// helper to get socket id of a user
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // read userId from either handshake auth or query (adjust depending on frontend)
  // recommended: frontend set auth: { userId } when connecting
  const userId =
    (socket.handshake && socket.handshake.auth && socket.handshake.auth.userId) ||
    (socket.handshake && socket.handshake.query && socket.handshake.query.userId);

  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log("User connected:", userId, "->", socket.id);
  }

  // broadcast current online users list to all clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // example private message event (adjust to your app events)
  socket.on("privateMessage", ({ toUserId, message }) => {
    const toSocketId = userSocketMap[toUserId];
    if (toSocketId) {
      io.to(toSocketId).emit("newMessage", { from: userId, message });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    if (userId) {
      delete userSocketMap[userId];
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
