// Get all public groups (isPrivate: false)
export const getPublicGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await prisma.group.findMany({
      where: { isPrivate: false },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        members: {
          select: {
            userId: true,
            role: true,
            permissions: true,
            user: { select: { name: true, email: true } },
          },
        },
        messages: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    const transformed = groups.map(g => ({
      id: g.id,
      slug: g.slug,
      inviteCode: g.inviteCode,
      name: g.name,
      description: g.description,
      memberCount: g.members.length,
      createdAt: g.createdAt,
      lastMessageTime: g.updatedAt,
      members: g.members.map(m => ({
        userId: m.userId,
        role: m.role,
        permissions: m.permissions,
        name: m.user?.name,
        email: m.user?.email,
      })),
    }));
    res.json(transformed);
  } catch (err: any) {
    console.error('Error getting public groups:', err);
    res.status(500).json({ error: 'Failed to get public groups' });
  }
};
import { RoleEnum } from '@prisma/client';
import { Request, Response } from 'express';
import { CREATOR_PERMISSIONS } from '../middlewares/group/permission';
import prisma from '../prisma/prisma';
import type { } from '../types/express';
import { generateInviteCode, randomSuffix, slugify } from '../utils/slugify';

// Create group: creator is assigned automatically as CREATOR with full rights
export const createGroup = async (req: Request, res: Response): Promise<void> => {
  const { name, description, isPrivate } = req.body;
  const userId = req.user?.id;

  try {
    if (!userId) {
      res.status(400).json({ error: 'User ID is required to create a group.' });
      return;
    }

    // Generate a unique slug and invite code.
    let baseSlug = slugify(name || 'group');
    if (!baseSlug) baseSlug = 'group';
    let slugCandidate = baseSlug;
    let attempt = 0;
    while (await prisma.group.findUnique({ where: { slug: slugCandidate } })) {
      attempt++;
      slugCandidate = `${baseSlug}-${randomSuffix(3)}`;
      if (attempt > 5) break;
    }
    const inviteCode = generateInviteCode();

    // Create the group and the creator's membership.
    const group = await prisma.group.create({
      data: {
        name,
        description,
        isPrivate: !!isPrivate,
        slug: slugCandidate,
        inviteCode,
        createdBy: {
          connect: { id: userId },
        },
        members: {
          create: {
            userId: userId,
            role: RoleEnum.CREATOR,
            permissions: CREATOR_PERMISSIONS,
          },
        },
      },
      include: {
        createdBy: { // Corrected from 'creator'
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        members: {
          select: {
            userId: true,
            role: true,
            permissions: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(group);
  } catch (err: any) {
    console.error("Error creating group:", err);
    if (err.code === 'P2002' && err.meta?.target?.includes('name')) {
      res.status(409).json({ error: 'Group with this name already exists.' });
    } else if (err.code === 'P2003') {
      res.status(400).json({ error: 'Foreign key constraint violated. The associated user does not exist.' });
    } else {
      res.status(500).json({ error: 'Failed to create group.' });
    }
  }
};

// Join group
export const joinGroup = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { groupId, code } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'User ID is required.' });
    return;
  }

  if (!groupId && !code) {
    res.status(400).json({ error: 'Group ID/slug or invite code is required.' });
    return;
  }

  try {
    const group = await prisma.group.findFirst({
      where: {
        OR: [
          { id: groupId },
          { slug: groupId },
          { inviteCode: code }
        ]
      }
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    });

    if (existingMember) {
      res.status(400).json({ error: 'You are already a member of this group' });
      return;
    }

    await prisma.groupMember.create({
      data: {
        userId,
        groupId: group.id,
        role: RoleEnum.MEMBER,
        permissions: {
          sendMessage: true,
          uploadFiles: true,
          viewMembers: true,
          createTopics: true,
          manageTopics: false,
          inviteMembers: false,
          manageMembers: false,
          managePermissions: false,
        },
      },
    });

    res.json({ message: 'Successfully joined the group', groupId: group.id, slug: group.slug, inviteCode: group.inviteCode });
  } catch (err: any) {
    console.error("Error joining group:", err);
    res.status(500).json({ error: 'Failed to join group' });
  }
};

// Leave group (member leaves, creator cannot leave)
export const leaveGroup = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { groupId } = req.params;

  if (!userId) {
    res.status(400).json({ error: 'User ID is required.' });
    return;
  }

  try {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!member) {
      res.status(404).json({ error: 'You are not a member' });
      return;
    }
    if (member.role === RoleEnum.CREATOR) {
      res.status(403).json({ error: 'Creator cannot leave the group' });
      return;
    }

    await prisma.groupMember.delete({
      where: { userId_groupId: { userId, groupId } },
    });

    res.json({ message: 'You left the group' });
  } catch (err: any) {
    console.error("Error leaving group:", err);
    res.status(500).json({ error: 'Failed to leave group' });
  }
};

// Delete a group
export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const userId = req.user?.id;

  try {
    // Authorization: Only the creator can delete the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { createdByUserId: true },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }

    if (group.createdByUserId !== userId) {
      res.status(403).json({ error: 'You do not have permission to delete this group.' });
      return;
    }

    await prisma.group.delete({ where: { id: groupId } });

    res.json({ message: 'Group deleted successfully' });
  } catch (err: any) {
    console.error("Error deleting group:", err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

// Get a group by ID
export const getGroupById = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const userId = req.user?.id;

  try {
    const group = await prisma.group.findFirst({
      where: {
        OR: [
          { id: groupId },
          { slug: groupId },
          { inviteCode: groupId }
        ]
      },
      include: {
        createdBy: { select: { id: true, email: true, name: true } }, // Corrected from 'creator'
        members: {
          select: {
            userId: true,
            role: true,
            permissions: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        topics: true,
        messages: true,
      },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const isAdmin = group.members.some(member =>
      member.userId === userId && (member.role === RoleEnum.CREATOR || (member.permissions as any)?.manageMembers === true)
    );

    const transformedGroup = {
      ...group,
      isAdmin,
      memberCount: group.members.length,
      members: group.members.map(member => ({
        ...member,
        name: member.user.name,
        email: member.user.email,
        user: undefined,
      })),
    };

    res.json(transformedGroup);
  } catch (err: any) {
    console.error("Error getting group by ID:", err);
    res.status(500).json({ error: 'Failed to get group' });
  }
};

// Get all groups for the current user
export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const groups = await prisma.group.findMany({
      where: { members: { some: { userId } } },
      include: {
        createdBy: { select: { id: true, email: true, name: true } }, // Corrected from 'creator'
        members: {
          select: {
            userId: true,
            role: true,
            permissions: true,
            user: { select: { name: true, email: true } },
          },
        },
        messages: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    const transformed = groups.map(g => {
      const isAdmin = g.members.some(m => m.userId === userId && (m.role === RoleEnum.CREATOR || (m.permissions as any)?.manageMembers));
      return {
        id: g.id,
        slug: g.slug,
        inviteCode: g.inviteCode,
        name: g.name,
        description: g.description,
        memberCount: g.members.length,
        isAdmin,
        createdAt: g.createdAt,
        lastMessageTime: g.updatedAt,
        members: g.members.map(m => ({
          userId: m.userId,
          role: m.role,
          permissions: m.permissions,
          name: m.user?.name,
          email: m.user?.email,
        })),
      };
    });
    res.json(transformed);
  } catch (err: any) {
    console.error('Error getting user groups:', err);
    res.status(500).json({ error: 'Failed to get groups' });
  }
};

// Update a group by ID
export const updateGroupById = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const { name, description, isPrivate } = req.body;
  const userId = req.user?.id;

  try {
    const groupToUpdate = await prisma.group.findUnique({
      where: { id: groupId },
      select: { createdByUserId: true },
    });

    if (!groupToUpdate) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }

    if (groupToUpdate.createdByUserId !== userId) {
      res.status(403).json({ error: 'You do not have permission to update this group.' });
      return;
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        name,
        description,
        isPrivate: !!isPrivate,
      },
      include: {
        createdBy: { select: { id: true, email: true, name: true } }, // Corrected from 'creator'
        members: {
          select: {
            userId: true,
            role: true,
            permissions: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        topics: true,
        messages: true,
      },
    });

    const isAdmin = updatedGroup.members.some(member =>
      member.userId === userId && (member.role === RoleEnum.CREATOR || (member.permissions as any)?.manageMembers === true)
    );

    const transformedGroup = {
      ...updatedGroup,
      isAdmin,
      members: updatedGroup.members.map(member => ({
        ...member,
        name: member.user.name,
        email: member.user.email,
        user: undefined,
      })),
    };

    res.json(transformedGroup);
  } catch (err: any) {
    console.error("Error updating group by ID:", err);
    if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 'P2025') {
      res.status(404).json({ error: 'Group not found' });
    } else {
      res.status(500).json({ error: 'Failed to update group' });
    }
  }
};
