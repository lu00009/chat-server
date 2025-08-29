import { RoleEnum } from '@prisma/client';
import { Request, Response } from 'express';
import { CREATOR_PERMISSIONS, DEFAULT_MEMBER_PERMISSIONS } from '../middlewares/group/permission';
import prisma from '../prisma/prisma';
import type { } from '../types/express';

// Add member to group
export const addMember = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { userId, role } = req.body;
  
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const existingMember = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (existingMember) {
      res.status(400).json({ error: 'User is already a member of this group' });
      return;
    }

    const newMember = await prisma.groupMember.create({
      data: {
        userId,
        groupId,
        role: role || RoleEnum.MEMBER,
        permissions: role === RoleEnum.ADMIN ? CREATOR_PERMISSIONS : DEFAULT_MEMBER_PERMISSIONS,
      },
    });

    res.status(201).json(newMember);
  } catch (err: any) {
    console.error("Error adding member:", err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'User is already a member of this group.' });
    }
    res.status(500).json({ error: 'Failed to add member' });
  }
};

// Remove member from group by user ID
export const removeMemberFromGroup = async (req: Request, res: Response): Promise<void> => {
  const { groupId, userId } = req.params;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { createdBy: true },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if the member to remove is the group creator
    if (group.createdBy?.id === userId) {
      res.status(403).json({ error: 'The creator cannot be removed' });
      return;
    }

    // Check if the current user has permission to remove other members
    const currentMember = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: currentUserId, groupId } },
    });
    
    if (currentMember?.role !== RoleEnum.CREATOR) {
       res.status(403).json({ error: 'Only the creator can remove members.' });
       return;
    }

    await prisma.groupMember.delete({
      where: { userId_groupId: { userId, groupId } },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (err: any) {
    console.error("Error removing member:", err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

// Update member role
export const updateMemberRole = async (req: Request, res: Response) => {
  const { groupId, userId } = req.params;
  const { role } = req.body;

  if (!Object.values(RoleEnum).includes(role as RoleEnum)) {
    return res.status(400).json({ error: `Invalid role specified. Must be one of: ${Object.values(RoleEnum).join(', ')}` });
  }
  
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const memberToUpdate = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!memberToUpdate) {
      res.status(404).json({ error: 'Member not found in this group' });
      return;
    }

    if (memberToUpdate.role === RoleEnum.CREATOR) {
      res.status(403).json({ error: 'Cannot change the creator\'s role' });
      return;
    }

    const updatedMember = await prisma.groupMember.update({
      where: { userId_groupId: { userId, groupId } },
      data: { role, permissions: role === RoleEnum.ADMIN ? CREATOR_PERMISSIONS : DEFAULT_MEMBER_PERMISSIONS },
    });

    res.json(updatedMember);
  } catch (err: any) {
    console.error("Error updating member role:", err);
    res.status(500).json({ error: 'Failed to update member role' });
  }
};

// Promote member to admin
export const promoteToAdmin = async (req: Request, res: Response): Promise<void> => {
  const { groupId, memberId } = req.params;
  
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

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
        permissions: CREATOR_PERMISSIONS, // Use the imported constant
      },
    });
    res.json({ message: 'User promoted to admin', updated });
    return;
  } catch (err: any) {
    console.error('Error promoting to admin:', err);
    res.status(500).json({ error: 'Failed to promote user' });
    return;
  }
};

// Demote member to regular member
export const demoteToMember = async (req: Request, res: Response): Promise<void> => {
  const { groupId, memberId } = req.params;
  
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

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
        permissions: DEFAULT_MEMBER_PERMISSIONS, // Use the imported constant
      },
    });
    res.json({ message: 'User demoted to member', updated });
    return;
  } catch (err: any) {
    console.error('Error demoting to member:', err);
    res.status(500).json({ error: 'Failed to demote user' });
    return;
  }
};

// Get members of a group
export const getGroupMembers = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

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
  } catch (err: any) {
    console.error('Error fetching group members:', err);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
};
