import * as http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { env } from './env';
import prisma from './prisma/prisma';
import { verifyToken } from './utils/auth.utils';

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  path: env.SOCKET_PATH,
  transports: ["websocket"],
  allowEIO3: true,
  connectTimeout: parseInt(process.env.WS_PING_TIMEOUT || "60000"),
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || "60000"),
  pingInterval: parseInt(process.env.WS_PING_INTERVAL || "25000"),
  allowUpgrades: false,
  perMessageDeflate: false
});

// Socket middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true }
      });

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      // Attach user to socket
      socket.data.user = user;
      next();
    } catch (error) {
      return next(new Error("Authentication error: Invalid token"));
    }
  } catch (error) {
    next(new Error("Server error during authentication"));
  }
});

// Root namespace handler
io.of("/").on("connection", (socket) => {
  console.log(`New connection: ${socket.id}, User: ${socket.data.user.name}`);

  // Join a group room
  socket.on("join_group", async (groupId: string, callback) => {
    try {
      // Check if user is a member of the group
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: socket.data.user.id,
            groupId
          }
        }
      });

      if (!membership) {
        callback({ status: "error", message: "You are not a member of this group" });
        return;
      }

      socket.join(groupId);
      console.log(`${socket.id} (${socket.data.user.name}) joined ${groupId}`);
      callback({ status: "success", groupId });
      
      // Notify others in the group
      socket.to(groupId).emit("user_joined", {
        userId: socket.data.user.id,
        name: socket.data.user.name
      });
    } catch (error) {
      console.error("Error joining group:", error);
      callback({ status: "error", message: "Failed to join group" });
    }
  });

  // Leave a group room
  socket.on("leave_group", (groupId: string, callback) => {
    socket.leave(groupId);
    console.log(`${socket.id} (${socket.data.user.name}) left ${groupId}`);
    callback({ status: "success", groupId });
    
    // Notify others in the group
    socket.to(groupId).emit("user_left", {
      userId: socket.data.user.id,
      name: socket.data.user.name
    });
  });

  // New message
  socket.on("new_message", async (data: { groupId: string, content: string, type?: string }, callback) => {
    try {
      const { groupId, content, type = "TEXT" } = data;
      
      // Create message in database
      const message = await prisma.message.create({
        data: {
          content,
          type: type as any,
          sender: { connect: { id: socket.data.user.id } },
          group: { connect: { id: groupId } }
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      // Broadcast to group
      io.to(groupId).emit("message_received", message);
      callback({ status: "success", message });
    } catch (error) {
      console.error("Error sending message:", error);
      callback({ status: "error", message: "Failed to send message" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} (${socket.data.user?.name || 'Unknown'}) disconnected`);
  });
});

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${env.PORT}${env.SOCKET_PATH}`);
});