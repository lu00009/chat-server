import { Request, Response } from 'express';
import prisma from '../prisma/prisma';
import type { } from '../types/express';
import fs from 'fs/promises';
import { SendMessageBody } from '../types/chats';
import { getIO } from '../socket/io';
import { RoleEnum } from '@prisma/client';

const cloudinaryModule: any = require('../config/cloudinary');
const cloudinaryUploader = cloudinaryModule.uploader || cloudinaryModule.default?.uploader;


function normalizeMessageType(raw?: string) {
  if (!raw) return 'TEXT';
  const upper = raw.toUpperCase();
  const allowed = ['TEXT','IMAGE','FILE','VIDEO'];
  return allowed.includes(upper) ? upper : 'TEXT';
}

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

export const sendMessageInTopic = async (req: Request, res: Response) => {
  const { groupId, topicId } = req.params;
  const { content, type, replyToId } = req.body;
  const senderId = req.user?.id;

  if (!senderId) {
    res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    return;
  }

  try {
    // Validate that the user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: senderId, groupId } },
    });
    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this group.' });
      return;
    }

    let mediaUrl: string | undefined;
    let mediaPublicId: string | undefined;
    let mediaResourceType: string | undefined;

    // If a file was uploaded, handle the Cloudinary upload
    if (req.file) {
      try {
        const uploadResult = await cloudinaryUploader.upload(req.file.path, {
          folder: 'topic_media',
          resource_type: 'auto',
        });
        mediaUrl = uploadResult.secure_url;
        mediaPublicId = uploadResult.public_id;
        mediaResourceType = uploadResult.resource_type;
        await fs.unlink(req.file.path); // Clean up the temporary file
      } catch (err: any) {
        console.warn('Cloudinary upload failed:', err.message || err);
        // Depending on requirements, you might want to stop or continue without the file
      }
    }

    // Create the message in the database, now including the topicId
    const message = await prisma.message.create({
      data: {
        content,
        type: req.file ? 'IMAGE' : (normalizeMessageType(type) as any),
        mediaUrl,
        mediaPublicId,
        mediaResourceType,
        senderId,
        groupId,
        topicId, // Storing the message in the topic
        replyToId,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        reactions: true,
        seenBy: true,
      },
    });

    // Emit the new message to topic & group rooms
    const io = getIO();
    if (io) {
      io.to(topicId).emit('topic_message_received', message); // topic specific
      io.to(groupId).emit('message_received', message);       // group feed fallback
    } else {
      console.warn('Socket.IO global instance not set');
    }

    res.status(201).json(message);
  } catch (error: any) {
    console.error('Error in sendMessageInTopic:', error);
    res.status(500).json({ error: "Could not send message", details: error.message });
  }
};

// Get all messages in a topic
export const getMessagesInTopic = async (req: Request, res: Response): Promise<void> => {
  const { topicId } = req.params;
  const userId = req.user?.id;

  try {
    const messages = await prisma.message.findMany({
      where: {
        topicId,
        ...(userId ? { hiddenBy: { none: { userId } } } : {}),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
        reactions: true,
        replyTo: {
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error getting messages from topic:', error);
    res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
};

// Delete a message in a topic (also supports scope=me)
export const deleteMessageInTopic = async (req: Request<{ groupId: string; topicId: string; messageId: string }, {}, { scope?: 'me' | 'all' }>, res: Response): Promise<void> => {
  const { messageId } = req.params;
  const scope = (req.query.scope as string) || (req.body?.scope as any) || 'all';
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, groupId: true, topicId: true, mediaPublicId: true, mediaResourceType: true }
    });

    if (!message) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }

    if (scope === 'me') {
      await prisma.messageHidden.create({ data: { userId, messageId: message.id } }).catch(() => {});
      res.status(200).json({ message: 'Hidden for you' });
      return;
    }

    const isOwner = message.senderId === userId;
    const allowed = isOwner || await canModerateMessages(userId, message.groupId);
    if (!allowed) {
      res.status(403).json({ error: 'You do not have permission to delete this message.' });
      return;
    }

    if (message.mediaPublicId) {
      try {
        const rt = message.mediaResourceType === 'image' || message.mediaResourceType === 'video' ? message.mediaResourceType : 'raw';
        await cloudinaryUploader.destroy(message.mediaPublicId, { resource_type: rt });
      } catch (e) {
        console.warn('Cloudinary destroy failed:', (e as any)?.message || e);
      }
    }

    await prisma.$transaction([
      prisma.reaction.deleteMany({ where: { messageId: message.id } }),
      prisma.messageSeen.deleteMany({ where: { messageId: message.id } }),
      prisma.messageHidden.deleteMany({ where: { messageId: message.id } }),
      prisma.message.delete({ where: { id: message.id } }),
    ]);

    const io = getIO();
    if (io) {
      if (message.topicId) io.to(message.topicId).emit('topic_message_deleted', { messageId: message.id });
      io.to(message.groupId).emit('message_deleted', { messageId: message.id });
    }

    res.status(200).json({ message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Error deleting message in topic:', error);
    res.status(500).json({ error: 'Failed to delete message.' });
  }
};

export const deleteMessagesInTopicBulk = async (
  req: Request<{ groupId: string; topicId: string }, {}, { ids: string[]; scope?: 'me' | 'all' }>,
  res: Response
) => {
  const { groupId, topicId } = req.params;
  const { ids, scope = 'all' } = req.body || ({} as any);
  const userId = req.user?.id;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required' });
    return;
  }
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const messages = await prisma.message.findMany({
      where: { id: { in: ids }, topicId },
      select: { id: true, senderId: true, groupId: true, topicId: true, mediaPublicId: true, mediaResourceType: true }
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

    const canModerate = await canModerateMessages(userId, groupId);
    const deletable = messages.filter(m => m.senderId === userId || canModerate);

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

    await prisma.$transaction([
      prisma.reaction.deleteMany({ where: { messageId: { in: deleteIds } } }),
      prisma.messageSeen.deleteMany({ where: { messageId: { in: deleteIds } } }),
      prisma.messageHidden.deleteMany({ where: { messageId: { in: deleteIds } } }),
      prisma.message.deleteMany({ where: { id: { in: deleteIds }, topicId } }),
    ]);

    const io = getIO();
    if (io) {
      io.to(topicId).emit('topic_messages_deleted', { ids: deleteIds });
      const byGroup = deletable.reduce<Record<string, string[]>>((acc, m) => {
        acc[m.groupId] = acc[m.groupId] || [];
        acc[m.groupId].push(m.id);
        return acc;
      }, {} as Record<string, string[]>);
      for (const [gid, mids] of Object.entries(byGroup)) {
        io.to(gid).emit('messages_deleted', { ids: mids });
      }
    }

    res.json({ deleted: deleteIds.length, ids: deleteIds });
  } catch (error: any) {
    console.error('deleteMessagesInTopicBulk error:', error);
    res.status(500).json({ error: 'Failed to bulk delete topic messages', details: error.message });
  }
};
