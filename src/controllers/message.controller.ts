import { Request, Response } from "express";
import prisma from '../prisma/prisma';
import { ReactionBody, SeenBody, SendMessageBody, UpdateMessageBody } from '../types/chats';
import { getIO } from '../socket/io';
import { RoleEnum } from '@prisma/client';
// Import cloudinary in a way that works with both ESModule and CommonJS consumers
const cloudinaryModule: any = require('../config/cloudinary');
const cloudinaryUploader = cloudinaryModule.uploader || cloudinaryModule.default?.uploader;
import fs from 'fs/promises';

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

// Normalize message type sent from client
function normalizeMessageType(raw?: string) {
  if (!raw) return 'TEXT';
  const upper = raw.toUpperCase();
  const allowed = ['TEXT', 'IMAGE', 'FILE', 'VIDEO'];
  return allowed.includes(upper) ? upper : 'TEXT';
}

// Send a new message
export const sendMessage = async (req: Request<{}, {}, SendMessageBody>, res: Response) => {
  const { content, senderId: bodySenderId, groupId, type, replyToId } = req.body;
  const authUserId = (req as any).user?.id;
  const finalSenderId = authUserId || bodySenderId;

  let mediaUrl: string | null = null;
  let mediaPublicId: string | null = null;
  let mediaResourceType: string | null = null;

  try {
    if (!finalSenderId) {
      res.status(400).json({ error: 'Missing senderId (auth required)' });
      return;
    }
    if (!groupId) {
      res.status(400).json({ error: 'Missing groupId' });
      return;
    }

    // Validate membership (use findUnique on composite key if available)
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: finalSenderId, groupId } }
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    if (req.file) {
      try {
        const uploadResult: any = await cloudinaryUploader.upload(req.file.path, {
          resource_type: 'auto',
            folder: 'chat_messages',
        });
        mediaUrl = uploadResult.secure_url || null;
        mediaPublicId = uploadResult.public_id || null;
        mediaResourceType = uploadResult.resource_type || null;
        await fs.unlink(req.file.path).catch(() => {});
      } catch (err: any) {
        console.warn('Cloudinary upload failed:', err.message || err);
      }
    }

    // Determine final message type
    let normalizedType = normalizeMessageType(type);
    if (mediaUrl) {
      if (mediaResourceType === 'image') normalizedType = 'IMAGE';
      else if (mediaResourceType === 'video') normalizedType = 'VIDEO';
      else normalizedType = 'FILE';
    }

    const message = await prisma.message.create({
      data: {
        content: (content ?? '').trim(),
        senderId: finalSenderId,
        groupId,
        type: normalizedType as any,
        replyToId: replyToId || null,
        mediaUrl,
        mediaPublicId,
        mediaResourceType,
      } as any,
      include: {
        sender: { select: { id: true, name: true, email: true } },
        reactions: true,
        seenBy: true,
      }
    });

    // Emit real-time event to group room (both text & file messages)
    // Replaced req.io usage with global getIO()
    const io = getIO();
    if (io) {
      io.to(groupId).emit('message_received', message);
    } else {
      console.warn('Socket.IO global instance not set');
    }

    res.status(201).json(message);
  } catch (error: any) {
    console.error('sendMessage error:', error);
    res.status(500).json({ error: 'Could not send message', details: error.message });
  }
};

// Get messages in a group (exclude messages hidden by current user)
export const getGroupMessages = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = (req as any).user?.id;

  try {
    const messages = await prisma.message.findMany({
      where: {
        groupId,
        ...(userId ? { hiddenBy: { none: { userId } } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: true,
        reactions: true,
        seenBy: true,
      },
    });

    res.json(messages);
  } catch (error:any) {
    console.error('getGroupMessages error:', error);
    res.status(500).json({ error: "Failed to fetch messages", details: error.message });
  }
};

// Edit message
export const updateMessage = async (req: Request<{messageId: string}, {}, UpdateMessageBody>, res: Response) => {
  const { messageId } = req.params;
  const { newContent } = req.body;

  try {
    const message = await prisma.message.update({
      where: { id: messageId },
      data: { content: newContent },
    });
    
    res.json(message);
  } catch (error:any) {
    console.error('updateMessage error:', error);
    res.status(500).json({ error: "Failed to update message", details: error.message });
  }
};

// Delete message (for everyone or only me)
export const deleteMessage = async (req: Request<{messageId: string}, {}, { scope?: 'me' | 'all' }>, res: Response) => {
  const { messageId } = req.params;
  const scope = (req.query.scope as string) || (req.body?.scope as any) || 'all';
  const userId = (req as any).user?.id;

  try {
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, groupId: true, mediaPublicId: true, mediaResourceType: true }
    });

    if (!existing) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    if (scope === 'me') {
      // Hide for this user only
      await prisma.messageHidden.create({
        data: { userId, messageId: existing.id },
      }).catch(() => {});
      res.json({ message: 'Hidden for you' });
      return;
    }

    // Allow sender, admins/creator or users with manageMessages permission
    const isOwner = existing.senderId === userId;
    const allowed = isOwner || await canModerateMessages(userId, existing.groupId);
    if (!allowed) {
      res.status(403).json({ error: 'You do not have permission to delete this message' });
      return;
    }

    // Best-effort delete on Cloudinary
    if (existing.mediaPublicId) {
      try {
        const rt = existing.mediaResourceType === 'image' || existing.mediaResourceType === 'video' ? existing.mediaResourceType : 'raw';
        await cloudinaryUploader.destroy(existing.mediaPublicId, { resource_type: rt });
      } catch (e) {
        console.warn('Cloudinary destroy failed:', (e as any)?.message || e);
      }
    }

    // Delete dependent rows first, then the message (transaction)
    await prisma.$transaction([
      prisma.reaction.deleteMany({ where: { messageId: existing.id } }),
      prisma.messageSeen.deleteMany({ where: { messageId: existing.id } }),
      prisma.messageHidden.deleteMany({ where: { messageId: existing.id } }),
      prisma.message.delete({ where: { id: existing.id } }),
    ]);

    // Emit deletion event to everyone
    const io = getIO();
    if (io) io.to(existing.groupId).emit('message_deleted', { messageId: existing.id });

    res.json({ message: 'Deleted for everyone' });
  } catch (error:any) {
    console.error('deleteMessage error:', error);
    res.status(500).json({ error: 'Failed to delete message', details: error.message });
  }
};

// Bulk delete messages (and files) with scope
export const deleteMessagesBulk = async (req: Request<{}, {}, { ids: string[]; scope?: 'me' | 'all' }>, res: Response) => {
  const { ids, scope = 'all' } = (req.body || {}) as any;
  const userId = (req as any).user?.id;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required' });
    return;
  }

  try {
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { id: { in: ids } },
      select: { id: true, senderId: true, groupId: true, mediaPublicId: true, mediaResourceType: true }
    });

    if (messages.length === 0) {
      res.json({ deleted: 0, ids: [] });
      return;
    }

    if (scope === 'me') {
      await prisma.messageHidden.createMany({
        data: messages.map(m => ({ userId, messageId: m.id })),
        skipDuplicates: true,
      });
      res.json({ hidden: messages.length, ids: messages.map(m => m.id) });
      return;
    }

    // Compute which groups the user can moderate
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

    // Allow delete if owner or can moderate the group
    const deletable = messages.filter(m => m.senderId === userId || moderatableGroups.has(m.groupId));

    // Delete files first (best-effort)
    for (const m of deletable) {
      if (m.mediaPublicId) {
        try {
          const rt = m.mediaResourceType === 'image' || m.mediaResourceType === 'video' ? m.mediaResourceType : 'raw';
          await cloudinaryUploader.destroy(m.mediaPublicId, { resource_type: rt });
        } catch (e) {
          console.warn('Cloudinary destroy failed:', (e as any)?.message || e);
        }
      }
    }

    const deleteIds = deletable.map(m => m.id);
    if (deleteIds.length === 0) {
      res.status(403).json({ error: 'No deletable messages for your permission' });
      return;
    }

    // Delete dependent rows first, then the messages (transaction)
    await prisma.$transaction([
      prisma.reaction.deleteMany({ where: { messageId: { in: deleteIds } } }),
      prisma.messageSeen.deleteMany({ where: { messageId: { in: deleteIds } } }),
      prisma.messageHidden.deleteMany({ where: { messageId: { in: deleteIds } } }),
      prisma.message.deleteMany({ where: { id: { in: deleteIds } } }),
    ]);

    // Emit deletions per group (group by groupId)
    const io = getIO();
    if (io) {
      const byGroup = deletable.reduce<Record<string, string[]>>((acc, m) => {
        acc[m.groupId] = acc[m.groupId] || [];
        acc[m.groupId].push(m.id);
        return acc;
      }, {} as Record<string, string[]>);
      for (const [groupId, mids] of Object.entries(byGroup)) {
        io.to(groupId).emit('messages_deleted', { ids: mids });
      }
    }

    res.json({ deleted: deleteIds.length, ids: deleteIds });
  } catch (error:any) {
    console.error('deleteMessagesBulk error:', error);
    res.status(500).json({ error: 'Failed to bulk delete messages', details: error.message });
  }
};

// React to message (emit socket reaction_updated)
export const reactToMessage = async (req: Request<{messageId: string}, {}, ReactionBody>, res: Response) => {
  const { messageId } = req.params;
  const { userId: bodyUserId, emoji } = req.body;
  const authUserId = (req as any).user?.id;
  const userId = authUserId || bodyUserId;

  try {
    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }

    const reaction = await prisma.reaction.upsert({
      where: {
        userId_messageId_emoji: { userId, messageId, emoji },
      },
      update: {},
      create: { userId, messageId, emoji },
    });

    // Fetch updated reactions and message scope for socket emission
    const [reactions, msg] = await Promise.all([
      prisma.reaction.findMany({
        where: { messageId },
        select: { userId: true, emoji: true },
      }),
      prisma.message.findUnique({
        where: { id: messageId },
        select: { groupId: true, topicId: true },
      }),
    ]);

    const io = getIO();
    if (io && msg) {
      if (msg.topicId) io.to(msg.topicId).emit('reaction_updated', { messageId, reactions });
      io.to(msg.groupId).emit('reaction_updated', { messageId, reactions });
    }

    res.status(201).json(reaction);
  } catch (error:any) {
    console.error('reactToMessage error:', error);
    res.status(500).json({ error: "Failed to react to message", details: error.message });
  }
};

// Remove reaction
export const removeReaction = async (req: Request<{messageId: string, emoji: string}, {}, Pick<ReactionBody, 'userId'>>, res: Response) => {
  const { messageId, emoji } = req.params;
  const { userId } = req.body;

  try {
    await prisma.reaction.delete({
      where: {
        userId_messageId_emoji: { userId, messageId, emoji },
      },
    });

    // Fetch updated reactions and message scope for socket emission
    const [reactions, msg] = await Promise.all([
      prisma.reaction.findMany({
        where: { messageId },
        select: { userId: true, emoji: true },
      }),
      prisma.message.findUnique({
        where: { id: messageId },
        select: { groupId: true, topicId: true },
      }),
    ]);

    const io = getIO();
    if (io && msg) {
      if (msg.topicId) io.to(msg.topicId).emit('reaction_updated', { messageId, reactions });
      io.to(msg.groupId).emit('reaction_updated', { messageId, reactions });
    }

    res.json({ message: "Reaction removed" });
  } catch (error:any) {
    console.error('removeReaction error:', error);
    res.status(500).json({ error: "Failed to remove reaction", details: error.message });
  }
};

// Mark as seen
export const markMessageSeen = async (req: Request<{messageId: string}, {}, SeenBody>, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user?.id;
if (!userId) {
  res.status(400).json({ error: 'Missing userId (auth required)' });
  return;
}
  try {
    const seen = await prisma.messageSeen.upsert({
      where: { userId_messageId: { userId, messageId } },
      update: { seenAt: new Date() },
      create: { userId, messageId },
    });

    res.json(seen);
  } catch (error:any) {
    console.error('markMessageSeen error:', error);
    res.status(500).json({ error: "Failed to mark seen", details: error.message });
  }
};