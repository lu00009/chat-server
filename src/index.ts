import * as http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { env } from './env';

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  path: env.SOCKET_PATH, // Now matches exactly with client
  transports: ["websocket"], // Force WebSocket only
  allowEIO3: true, // Enable v3 compatibility
  connectTimeout: parseInt(process.env.WS_PING_TIMEOUT || "60000"),
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || "60000"),
  pingInterval: parseInt(process.env.WS_PING_INTERVAL || "25000"),
  // Disable protocol upgrades for Postman compatibility
  allowUpgrades: false,
  perMessageDeflate: false
});

// Root namespace handler
io.of("/").on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.on("join_group", (groupId: string, callback) => {
    socket.join(groupId);
    console.log(`${socket.id} joined ${groupId}`);
    callback({ status: "success", groupId });
    socket.to(groupId).emit("user_joined", socket.id);
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);
  });
});

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${env.PORT}${env.SOCKET_PATH}`);
});