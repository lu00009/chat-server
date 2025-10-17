import * as http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { env } from './env';
import prisma from './prisma/prisma';
import { updateUserLastSeen } from './services/presence.service';
import { setIO } from './socket/io'; // <-- added
import { userConnected, userDisconnected } from './socket/presence';
import { verifyToken } from './utils/auth.utils';
import { setIO } from './socket/io';
import { RoleEnum } from '@prisma/client';
// Cloudinary uploader for media cleanup on delete
const cloudinaryModule: any = require('./config/cloudinary');
const cloudinaryUploader = cloudinaryModule.uploader || cloudinaryModule.default?.uploader;

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  path: env.SOCKET_PATH,
  transports: ["polling", "websocket"],
  allowEIO3: true,
  connectTimeout: parseInt(process.env.WS_PING_TIMEOUT || "60000"),
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || "60000"),
  pingInterval: parseInt(process.env.WS_PING_INTERVAL || "25000"),
  allowUpgrades: true,
  perMessageDeflate: false
});

// Register global instance so controllers can access it via getIO()
setIO(io);

// Middleware to attach Socket.IO instance to each request
app.use((req, res, next) => {
  req.io = io;
  next();
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

// Helper: can the user moderate messages in a group?
async function canModerateMessages(userId: string, groupId: string): Promise<boolean> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { role: true, permissions: true },
  });
  if (!membership) return false;
  if (membership.role === RoleEnum.CREATOR || membership.role === RoleEnum.ADMIN) return true;
  const perms = (membership.permissions as any) || {};
  return !!perms.manageMessages;
}

// Root namespace handler
io.of("/").on("connection", (socket) => {
  console.log(`New connection: ${socket.id}, User: ${socket.data.user.name}`);
  // mark user online
  try { userConnected(socket.data.user.id); } catch {}

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

  // Join a topic room (requires membership in the group that owns the topic)
  socket.on("join_topic", async (data: { groupId: string; topicId: string }, callback) => {
    try {
      const { groupId, topicId } = data || ({} as any);
      if (!groupId || !topicId) return callback?.({ status: 'error', message: 'groupId and topicId required' });

      const [membership, topic] = await Promise.all([
        prisma.groupMember.findUnique({ where: { userId_groupId: { userId: socket.data.user.id, groupId } } }),
        prisma.topic.findUnique({ where: { id: topicId }, select: { id: true, groupId: true } }),
      ]);
      if (!membership) return callback?.({ status: 'error', message: 'Not a member of this group' });
      if (!topic || topic.groupId !== groupId) return callback?.({ status: 'error', message: 'Topic does not belong to this group' });

      socket.join(topicId);
      callback?.({ status: 'success', topicId });
    } catch (err) {
      console.error('join_topic error:', err);
      callback?.({ status: 'error', message: 'Failed to join topic' });
    }
  });

  // Add reaction via socket
  socket.on('add_reaction', async (data: { messageId: string; emoji: string }, callback) => {
    try {
      const { messageId, emoji } = data || ({} as any);
      const userId = socket.data.user.id;
      if (!messageId || !emoji) return callback?.({ status: 'error', message: 'messageId and emoji required' });

      await prisma.reaction.upsert({
        where: { userId_messageId_emoji: { userId, messageId, emoji } },
        update: {},
        create: { userId, messageId, emoji },
      });

      // Fetch updated reactions and message scope
      const [reactions, msg] = await Promise.all([
        prisma.reaction.findMany({ where: { messageId }, select: { userId: true, emoji: true } }),
        prisma.message.findUnique({ where: { id: messageId }, select: { groupId: true, topicId: true } }),
      ]);

      if (msg) {
        io.to(msg.groupId).emit('reaction_updated', { messageId, reactions });
        if (msg.topicId) io.to(msg.topicId).emit('reaction_updated', { messageId, reactions });
      }

      callback?.({ status: 'success' });
    } catch (err) {
      console.error('add_reaction error:', err);
      callback?.({ status: 'error', message: 'Failed to add reaction' });
    }
  });

  // Remove reaction via socket
  socket.on('remove_reaction', async (data: { messageId: string; emoji: string }, callback) => {
    try {
      const { messageId, emoji } = data || ({} as any);
      const userId = socket.data.user.id;
      if (!messageId || !emoji) return callback?.({ status: 'error', message: 'messageId and emoji required' });

      await prisma.reaction.delete({
        where: { userId_messageId_emoji: { userId, messageId, emoji } },
      }).catch(() => {});

      const [reactions, msg] = await Promise.all([
        prisma.reaction.findMany({ where: { messageId }, select: { userId: true, emoji: true } }),
        prisma.message.findUnique({ where: { id: messageId }, select: { groupId: true, topicId: true } }),
      ]);

      if (msg) {
        io.to(msg.groupId).emit('reaction_updated', { messageId, reactions });
        if (msg.topicId) io.to(msg.topicId).emit('reaction_updated', { messageId, reactions });
      }

      callback?.({ status: 'success' });
    } catch (err) {
      console.error('remove_reaction error:', err);
      callback?.({ status: 'error', message: 'Failed to remove reaction' });
    }
  });

  // Delete a single message via socket (owner or moderator), supports scope
  socket.on('delete_message', async (data: { messageId: string; scope?: 'me' | 'all' }, callback) => {
    try {
      const { messageId, scope = 'all' } = data || ({} as any);
      const userId = socket.data.user.id;
      if (!messageId) return callback?.({ status: 'error', message: 'messageId required' });

      const msg = await prisma.message.findUnique({
        where: { id: messageId },
        select: { id: true, senderId: true, groupId: true, topicId: true, mediaPublicId: true, mediaResourceType: true },
      });
      if (!msg) return callback?.({ status: 'error', message: 'Message not found' });

      if (scope === 'me') {
        await prisma.messageHidden.create({ data: { userId, messageId } }).catch(() => {});
        // Only tell this socket to hide the message locally
        socket.emit('message_hidden_for_user', { messageId });
        return callback?.({ status: 'success', scope });
      }

      const allowed = msg.senderId === userId || await canModerateMessages(userId, msg.groupId);
      if (!allowed) return callback?.({ status: 'error', message: 'Forbidden' });

      if (msg.mediaPublicId) {
        try {
          const rt = msg.mediaResourceType === 'image' || msg.mediaResourceType === 'video' ? msg.mediaResourceType : 'raw';
          await cloudinaryUploader.destroy(msg.mediaPublicId, { resource_type: rt });
        } catch {}
      }

      await prisma.$transaction([
        prisma.reaction.deleteMany({ where: { messageId } }),
        prisma.messageSeen.deleteMany({ where: { messageId } }),
        prisma.messageHidden.deleteMany({ where: { messageId } }),
        prisma.message.delete({ where: { id: messageId } }),
      ]);

      io.to(msg.groupId).emit('message_deleted', { messageId });
      if (msg.topicId) io.to(msg.topicId).emit('topic_message_deleted', { messageId });

      callback?.({ status: 'success', scope });
    } catch (err) {
      console.error('delete_message error:', err);
      callback?.({ status: 'error', message: 'Failed to delete message' });
    }
  });

  // Bulk delete messages via socket with scope
  socket.on('delete_messages_bulk', async (data: { ids: string[]; scope?: 'me' | 'all' }, callback) => {
    try {
      const { ids, scope = 'all' } = data || ({} as any);
      const userId = socket.data.user.id;
      if (!Array.isArray(ids) || !ids.length) return callback?.({ status: 'error', message: 'ids array required' });

      const messages = await prisma.message.findMany({
        where: { id: { in: ids } },
        select: { id: true, senderId: true, groupId: true, topicId: true, mediaPublicId: true, mediaResourceType: true },
      });
      if (!messages.length) return callback?.({ status: 'success', deleted: 0, ids: [] });

      if (scope === 'me') {
        await prisma.messageHidden.createMany({ data: messages.map(m => ({ userId, messageId: m.id })), skipDuplicates: true });
        // Only instruct this socket to hide these messages
        socket.emit('messages_hidden_for_user', { ids: messages.map(m => m.id) });
        return callback?.({ status: 'success', scope, hidden: messages.length, ids: messages.map(m => m.id) });
      }

      // Determine moderatable groups
      const uniqueGroupIds = Array.from(new Set(messages.map(m => m.groupId)));
      const memberships = await prisma.groupMember.findMany({
        where: { userId, groupId: { in: uniqueGroupIds } },
        select: { groupId: true, role: true, permissions: true },
      });
      const moderatableGroups = new Set(
        memberships
          .filter(m => m.role === RoleEnum.CREATOR || m.role === RoleEnum.ADMIN || (m.permissions as any)?.manageMessages)
          .map(m => m.groupId)
      );

      const deletable = messages.filter(m => m.senderId === userId || moderatableGroups.has(m.groupId));
      const deleteIds = deletable.map(m => m.id);
      if (!deleteIds.length) return callback?.({ status: 'error', message: 'No deletable messages' });

      // Cloudinary cleanup
      for (const m of deletable) {
        if (m.mediaPublicId) {
          try {
            const rt = m.mediaResourceType === 'image' || m.mediaResourceType === 'video' ? m.mediaResourceType : 'raw';
            await cloudinaryUploader.destroy(m.mediaPublicId, { resource_type: rt });
          } catch {}
        }
      }

      await prisma.$transaction([
        prisma.reaction.deleteMany({ where: { messageId: { in: deleteIds } } }),
        prisma.messageSeen.deleteMany({ where: { messageId: { in: deleteIds } } }),
        prisma.messageHidden.deleteMany({ where: { messageId: { in: deleteIds } } }),
        prisma.message.deleteMany({ where: { id: { in: deleteIds } } }),
      ]);

      // Emit per group and per topic
      const byGroup: Record<string, string[]> = {};
      const byTopic: Record<string, string[]> = {};
      for (const m of deletable) {
        byGroup[m.groupId] = byGroup[m.groupId] || [];
        byGroup[m.groupId].push(m.id);
        if (m.topicId) {
          byTopic[m.topicId] = byTopic[m.topicId] || [];
          byTopic[m.topicId].push(m.id);
        }
      }
      for (const [gid, mids] of Object.entries(byGroup)) io.to(gid).emit('messages_deleted', { ids: mids });
      for (const [tid, mids] of Object.entries(byTopic)) io.to(tid).emit('topic_messages_deleted', { ids: mids });

      callback?.({ status: 'success', scope, deleted: deleteIds.length, ids: deleteIds });
    } catch (err) {
      console.error('delete_messages_bulk error:', err);
      callback?.({ status: 'error', message: 'Failed to bulk delete messages' });
    }
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} (${socket.data.user?.name || 'Unknown'}) disconnected`);
    try {
      const uid = socket.data.user?.id;
      if (uid) {
        userDisconnected(uid);
        // Update last seen timestamp
        updateUserLastSeen(uid);
      }
    } catch {}
  });
});

server.listen(env.PORT, () => {
  console.log(`Server running on port http://localhost:${env.PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${env.PORT}${env.SOCKET_PATH}`);
});