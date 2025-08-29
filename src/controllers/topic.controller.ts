import { Request, Response } from 'express';
import prisma from '../prisma/prisma';
import type { } from '../types/express';

export const createTopic = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { groupId } = req.params;
  const { title } = req.body;
  const userId = req.user.id;
  try {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member) {
      res.status(404).json({ error: 'You are not a member of this group' });
      return;
    }
    const permissions = member.permissions as any;
    if (!permissions.manageTopics) {
      res.status(403).json({ error: 'You do not have permission to manage topics' });
      return;
    }
    const topic = await prisma.topic.create({
      data: {
        title,
        groupId,
        createdByUserId: userId,
      },
    });
    res.status(201).json(topic);
  } catch (err) {
    console.error('Error creating topic:', err);
    res.status(500).json({ error: 'Failed to create topic' });
  }
};

export const getTopics = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { groupId } = req.params;
  const userId = req.user.id;
  try {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member) {
      res.status(404).json({ error: 'You are not a member of this group' });
      return;
    }
    const topics = await prisma.topic.findMany({
      where: { groupId },
      // Ordering is removed to prevent potential database errors. Sort on the client instead.
    });
    res.json(topics);
  } catch (err) {
    console.error('Error getting topics:', err);
    res.status(500).json({ error: 'Failed to get topics' });
  }
};

export const updateTopic = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { groupId, topicId } = req.params;
  const { title } = req.body;
  const userId = req.user.id;
  try {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member) {
      res.status(404).json({ error: 'You are not a member of this group' });
      return;
    }

    const existingTopic = await prisma.topic.findFirst({
      where: { id: topicId, groupId },
    });
    if (!existingTopic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }

    const permissions = member.permissions as any;
    const isTopicCreator = existingTopic.createdByUserId === userId;

    if (!isTopicCreator && !permissions.manageTopics) {
      res.status(403).json({ error: 'You do not have permission to manage this topic' });
      return;
    }

    const updatedTopic = await prisma.topic.update({
      where: { id: topicId },
      data: { title },
    });
    res.json(updatedTopic);
  } catch (err) {
    console.error('Error updating topic:', err);
    res.status(500).json({ error: 'Failed to update topic' });
  }
};

export const deleteTopic = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { groupId, topicId } = req.params;
  const userId = req.user.id;
  try {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member) {
      res.status(404).json({ error: 'You are not a member of this group' });
      return;
    }
    const existingTopic = await prisma.topic.findFirst({
      where: { id: topicId, groupId },
    });
    if (!existingTopic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }

    const permissions = member.permissions as any;
    const isTopicCreator = existingTopic.createdByUserId === userId;

    if (!isTopicCreator && !permissions.manageTopics) {
      res.status(403).json({ error: 'You do not have permission to delete this topic' });
      return;
    }

    await prisma.topic.delete({
      where: { id: topicId },
    });
    res.json({ message: 'Topic deleted successfully' });
  } catch (err) {
    console.error('Error deleting topic:', err);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
};
