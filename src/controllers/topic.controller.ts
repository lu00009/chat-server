import { Request, Response } from 'express';
import prisma from '../prisma/prisma';

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
      data: { title, groupId, createdBy: userId },
    });
    res.status(201).json(topic);
  } catch (err) {
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
      orderBy: { createdAt: 'desc' },
    });
    res.json(topics);
  } catch (err) {
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
    const permissions = member.permissions as any;
    if (!permissions.manageTopics) {
      res.status(403).json({ error: 'You do not have permission to manage topics' });
      return;
    }
    const existingTopic = await prisma.topic.findFirst({
      where: { id: topicId, groupId },
    });
    if (!existingTopic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    const updatedTopic = await prisma.topic.update({
      where: { id: topicId },
      data: { title },
    });
    res.json(updatedTopic);
  } catch (err) {
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
    const permissions = member.permissions as any;
    if (!permissions.manageTopics) {
      res.status(403).json({ error: 'You do not have permission to manage topics' });
      return;
    }
    const existingTopic = await prisma.topic.findFirst({
      where: { id: topicId, groupId },
    });
    if (!existingTopic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    await prisma.topic.delete({
      where: { id: topicId },
    });
    res.json({ message: 'Topic deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete topic' });
  }
}; 