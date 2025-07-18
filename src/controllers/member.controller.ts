import { Request, Response } from 'express';
import prisma from '../prisma/prisma';
import { DEFAULT_MEMBER_PERMISSIONS } from '../middlewares/group/permission';
export const promoteToAdmin = async (req: Request, res: Response): Promise<void> => {
  const { groupId, memberId } = req.params;
  try {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: memberId, groupId } },
    });
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    if (member.role === 'CREATOR') {
      res.status(400).json({ error: 'Creator cannot be promoted' });
      return;
    }
    const updated = await prisma.groupMember.update({
      where: { userId_groupId: { userId: memberId, groupId } },
      data: {
        role: 'ADMIN',
        permissions: {
          sendMessage: true,
          uploadFiles: true,
          createTopics: true,
          inviteMembers: true,
          viewMembers: true,
          manageMembers: true,
          managePermissions: true,
          manageTopics: true,
        },
      },
    });
    res.json({ message: 'User promoted to admin', updated });
    return;
  } catch (err) {
    res.status(500).json({ error: 'Failed to promote user' });
    return;
  }
};

export const updatePermissions = async (req: Request, res: Response): Promise<void> => {
  const { groupId, memberId } = req.params;
  const permissions = req.body.permissions;
  try {
    if (typeof permissions !== 'object' || permissions === null) {
      res.status(400).json({ error: 'Invalid permissions object provided. Must be a JSON object.' });
      return;
    }
    const updated = await prisma.groupMember.update({
      where: { userId_groupId: { userId: memberId, groupId } },
      data: { permissions },
    });
    res.json({ message: 'Permissions updated successfully', updated });
    return;
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Group member not found with the provided user and group IDs.' });
    } else if (err.code === 'P2003') {
      res.status(400).json({ error: 'Invalid user or group ID referenced.' });
    } else {
      res.status(500).json({ error: 'Failed to update permissions.' });
    }
    return;
  }
};

export const getMembers = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  try {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    res.json(members);
    return;
  } catch (err) {
    res.status(500).json({ error: 'Failed to get members' });
    return;
  }
};

export const demoteToMember = async (req: Request, res: Response): Promise<void> => {
  const { groupId, memberId } = req.params;
  try {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: memberId, groupId } },
    });
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    if (member.role === 'CREATOR') {
      res.status(400).json({ error: 'Creator cannot be demoted' });
      return;
    }
    const updated = await prisma.groupMember.update({
      where: { userId_groupId: { userId: memberId, groupId } },
      data: {
        role: 'MEMBER',
        permissions: {
          sendMessage: true,
          uploadFiles: false,
          createTopics: false,
          inviteMembers: false,
          viewMembers: true,
        },
      },
    });
    res.json({ message: 'User demoted to member', updated });
    return;
  } catch (err) {
    res.status(500).json({ error: 'Failed to demote user' });
    return;
  }
};

export const addMember = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const { userId } = req.body;
  try {
    const existing = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (existing) {
      res.status(400).json({ error: 'User is already a member' });
      return;
    }
    const member = await prisma.groupMember.create({
      data: {
        name: '',
        userId,
        groupId,
        role: 'MEMBER',
        permissions: DEFAULT_MEMBER_PERMISSIONS,
      },
    });
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add member' });
  }
}; 