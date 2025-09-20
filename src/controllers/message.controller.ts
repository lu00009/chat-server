import { Request, Response } from "express";
import prisma from '../prisma/prisma';
import { ReactionBody, SeenBody, SendMessageBody, UpdateMessageBody } from '../types/chats'; // Assuming types/chats.ts is the correct path
// Import cloudinary in a way that works with both ESModule and CommonJS consumers
const cloudinaryModule: any = require('../config/cloudinary');
const cloudinaryUploader = cloudinaryModule.uploader || cloudinaryModule.default?.uploader;
import fs from 'fs/promises';

// Helper to normalize message type input (frontend sends lowercase like 'text')
function normalizeMessageType(raw?: string) {
  if (!raw) return 'TEXT';
  const upper = raw.toUpperCase();
  const allowed = ['TEXT','IMAGE','FILE','VIDEO'];
  return allowed.includes(upper) ? upper : 'TEXT';
}

// Send a new message
export const sendMessage = async (req: Request<{}, {}, SendMessageBody>, res: Response) => {
  const { content, senderId: bodySenderId, groupId, type, replyToId } = req.body;
  let mediaUrl = req.file?.filename ? `/uploads/${req.file.filename}` : null;
  let mediaPublicId: string | null = null;
  let mediaResourceType: string | null = null;
  const authUserId = (req as any).user?.id;
  const finalSenderId = authUserId || bodySenderId; // prefer authenticated user
  try {
    if (!finalSenderId) {
      res.status(400).json({ error: 'Missing senderId (auth required)' });
      return;
    }
    if (!groupId) {
      res.status(400).json({ error: 'Missing groupId' });
      return;
    }

    // (Optional) Validate membership
    const membership = await prisma.groupMember.findMany({
      where: { userId: finalSenderId, groupId },
    });
    if (!membership || membership.length === 0) {
      console.log('User not a member of group:', finalSenderId, groupId);
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    // If a file was uploaded by multer, upload to Cloudinary and remove local file
    if (req.file) {
      try {
        const uploadResult: any = await cloudinaryUploader.upload(req.file.path, {
          resource_type: 'auto',
          folder: 'chat_messages',
        });
        mediaUrl = uploadResult.secure_url || mediaUrl;
        mediaPublicId = uploadResult.public_id;
        mediaResourceType = uploadResult.resource_type;
        // remove local file
        await fs.unlink(req.file.path).catch(() => {});
      } catch (err: any) {
        console.warn('Cloudinary upload failed:', err.message || err);
      }
    }

    const normalizedType = normalizeMessageType(type);
    // Cast `data` to `any` as a short-term workaround so TypeScript doesn't fail
    // until you run `npx prisma generate` after migrating the schema.
    const message = await prisma.message.create({
      data: {
        content: content ?? '',
        senderId: finalSenderId,
        groupId,
        type: normalizedType as any,
        replyToId,
        mediaUrl,
        mediaPublicId,
        mediaResourceType,
      } as any,
      include: { sender: { select: { id: true, name: true, email: true } }, reactions: true, seenBy: true }
    });

    res.status(201).json(message);
  } catch (error: any) {
    console.error('sendMessage error:', error);
    res.status(500).json({ error: "Could not send message", details: error.message });
  }
};

// Get messages in a group
export const getGroupMessages = async (req: Request, res: Response) => {
  const { groupId } = req.params;

  try {
    const messages = await prisma.message.findMany({
      where: { groupId },
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

// Delete message
export const deleteMessage = async (req: Request<{messageId: string}>, res: Response) => {
  const { messageId } = req.params;

  try {
    const message = await prisma.message.delete({
      where: { id: messageId },
    });

    res.json({ message: "Deleted successfully" });
  } catch (error:any) {
    console.error('deleteMessage error:', error);
    res.status(500).json({ error: "Failed to delete message", details: error.message });
  }
};

// React to message
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