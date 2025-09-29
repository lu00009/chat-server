import { Request, Response } from 'express';
import prisma from '../prisma/prisma';
import type { } from '../types/express';
import fs from 'fs/promises';
import { SendMessageBody } from '../types/chats';
import { getIO } from '../socket/io';


const cloudinaryModule: any = require('../config/cloudinary');
const cloudinaryUploader = cloudinaryModule.uploader || cloudinaryModule.default?.uploader;


function normalizeMessageType(raw?: string) {
  if (!raw) return 'TEXT';
  const upper = raw.toUpperCase();
  const allowed = ['TEXT','IMAGE','FILE','VIDEO'];
  return allowed.includes(upper) ? upper : 'TEXT';
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

  try {
    const messages = await prisma.message.findMany({
      where: { topicId },
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

// Delete a message in a topic
export const deleteMessageInTopic = async (req: Request, res: Response): Promise<void> => {
  const { messageId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }

    // Check if the user is the sender of the message
    if (message.senderId !== userId) {
      res.status(403).json({ error: 'You can only delete your own messages.' });
      return;
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    // Here you would typically emit a socket event to notify other clients of the deletion
    // For example: req.io.to(message.topicId).emit('deleted_topic_message', { messageId });

    res.status(200).json({ message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Error deleting message in topic:', error);
    res.status(500).json({ error: 'Failed to delete message.' });
  }
};
