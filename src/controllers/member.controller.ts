import { RoleEnum } from '@prisma/client'; // IMPORTANT: Import RoleEnum here
import { Request, Response } from 'express';
import prisma from '../prisma/prisma';

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
    if (member.role === RoleEnum.CREATOR) {
      res.status(400).json({ error: 'Creator cannot be promoted' });
      return;
    }
    const updated = await prisma.groupMember.update({
      where: { userId_groupId: { userId: memberId, groupId } },
      data: {
        role: RoleEnum.ADMIN,
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
  } catch (err: any) { // Cast 'err' to 'any'
    console.error('Error promoting to admin:', err);
    res.status(500).json({ error: 'Failed to promote user' });
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
    if (member.role === RoleEnum.CREATOR) {
      res.status(400).json({ error: 'Creator cannot be demoted' });
      return;
    }
    const updated = await prisma.groupMember.update({
      where: { userId_groupId: { userId: memberId, groupId } },
      data: {
        role: RoleEnum.MEMBER,
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
  } catch (err: any) { // Cast 'err' to 'any'
    console.error('Error demoting to member:', err);
    res.status(500).json({ error: 'Failed to demote user' });
    return;
  }
};

export const addMember = async (req: Request, res: Response) => { // Using 'addMember' as per route error
  const { groupId } = req.params;
  const { userId, role } = req.body;
  try {
    const existing = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (existing) {
      res.status(400).json({ error: 'User is already a member' });
      return;
    }

    const groupMember = await prisma.groupMember.create({
      data: {
        userId,
        groupId,
        role: role || RoleEnum.MEMBER,
      },
    });
    res.status(201).json(groupMember);
  } catch (error: any) { // Cast 'error' to 'any'
    console.error('Error adding member to group:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User is already a member of this group.' });
    }
    res.status(500).json({ error: 'Failed to add member to group' });
  }
};

export const updateMemberRole = async (req: Request, res: Response) => {
  const { groupId, userId } = req.params;
  const { role } = req.body;

  if (!Object.values(RoleEnum).includes(role as RoleEnum)) {
    return res.status(400).json({ error: `Invalid role specified. Must be one of: ${Object.values(RoleEnum).join(', ')}` });
  }

  try {
    const updatedMember = await prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      data: {
        role: role as RoleEnum,
      },
    });
    res.json(updatedMember);
  } catch (error: any) { // Cast 'error' to 'any'
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
};

export const removeMemberFromGroup = async (req: Request, res: Response) => {
  const { groupId, userId } = req.params;

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { createdBy: true },
    });

    if (group?.createdBy === userId) {
      return res.status(403).json({ error: 'Cannot remove the group creator.' });
    }

    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });
    res.status(204).send();
  } catch (error: any) { // Cast 'error' to 'any'
    console.error('Error removing member from group:', error);
    res.status(500).json({ error: 'Failed to remove member from group' });
  }
};

export const getGroupMembers = async (req: Request, res: Response) => { // Using 'getGroupMembers'
  const { groupId } = req.params;

  try {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    res.json(members);
  } catch (error: any) { // Cast 'error' to 'any'
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
};