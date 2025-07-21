import { Request, Response } from "express";
import prisma from '../prisma/prisma';
import { ReactionBody, SeenBody, SendMessageBody, UpdateMessageBody } from '../types/chats'; // Assuming types/chats.ts is the correct path

// Send a new message
export const sendMessage = async (req: Request<{}, {}, SendMessageBody>, res: Response) => {
  const { content, senderId, groupId, type, replyToId } = req.body;
  const mediaUrl = req.file?.filename ? `/uploads/${req.file.filename}` : null;
  try {
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        groupId,
        type,
        replyToId,
        mediaUrl,
      },
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: "Could not send message" });
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
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
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
  } catch (error) {
    res.status(500).json({ error: "Failed to update message" });
  }
};

// Delete message
export const deleteMessage = async (req: Request<{messageId: string}>, res: Response) => {
  const { messageId } = req.params;

  try {
    const message = await prisma.message.update({
      where: { id: messageId },
      data: { deleted: true },
    });

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// React to message
export const reactToMessage = async (req: Request<{messageId: string}, {}, ReactionBody>, res: Response) => {
  const { messageId } = req.params;
  const { userId, emoji } = req.body;

  try {
    const reaction = await prisma.reaction.upsert({
      where: {
        userId_messageId_emoji: { userId, messageId, emoji },
      },
      update: {},
      create: { userId, messageId, emoji },
    });

    res.status(201).json(reaction);
  } catch (error) {
    res.status(500).json({ error: "Failed to react to message" });
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
  } catch (error) {
    res.status(500).json({ error: "Failed to remove reaction" });
  }
};

// Mark as seen
export const markMessageSeen = async (req: Request<{messageId: string}, {}, SeenBody>, res: Response) => {
  const { messageId } = req.params;
  const { userId } = req.body;

  try {
    const seen = await prisma.messageSeen.upsert({
      where: { userId_messageId: { userId, messageId } },
      update: { seenAt: new Date() },
      create: { userId, messageId },
    });

    res.json(seen);
  } catch (error) {
    res.status(500).json({ error: "Failed to mark seen" });
  }
};