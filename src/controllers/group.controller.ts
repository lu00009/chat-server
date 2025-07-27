import { RoleEnum } from '@prisma/client'; // IMPORTANT: Import RoleEnum
import { Request, Response } from 'express';
import { CREATOR_PERMISSIONS } from '../middlewares/group/permission'; // Assuming this is correct
import prisma from '../prisma/prisma';
import type { } from '../types/express'; // Ensure the type augmentation is loaded

// Create group: creator is assigned automatically as CREATOR with full rights
export const createGroup = async (req: Request, res: Response): Promise<void> => {
  const { name, description, isPrivate } = req.body;
  const userId = req.user?.id;
  // const username = req.user?.name; // Removed, as GroupMember no longer has a 'name' field

  try {
    console.log('Received userId in createGroup:', userId);

    // Step 1: Validate the user exists. This is crucial to prevent the foreign key error.
    if (!userId) {
      res.status(400).json({ error: 'User ID is required to create a group.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      res.status(400).json({ error: 'Invalid user ID. User does not exist.' });
      return;
    }

    // Step 2: Create the group, connecting it to the existing user.
    const group = await prisma.group.create({
      data: {
        name,
        description,
        isPrivate: !!isPrivate, // Ensure boolean type
        creator: {
          connect: {
            id: userId, // This tells Prisma to link the group to the User with this ID
          },
        },
        members: {
          create: {
            userId: userId,
            // REMOVED: name: username ?? '', // GroupMember no longer has a 'name' field
            role: RoleEnum.CREATOR, // Use the imported RoleEnum
            permissions: CREATOR_PERMISSIONS,
          },
        },
      },
      include: {
        creator: {
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
            // If you need the member's name, you must select it from the related 'user'
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
  } catch (err: any) { // Explicitly type err for better error handling/logging
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
    if (member.role === RoleEnum.CREATOR) { // Use RoleEnum
      res.status(403).json({ error: 'Creator cannot leave the group' });
      return;
    }

    await prisma.groupMember.delete({
      where: { userId_groupId: { userId, groupId } },
    });

    res.json({ message: 'You left the group' });
    return;
  } catch (err: any) { // Cast error to any
    console.error("Error leaving group:", err); // Log the actual error for debugging
    res.status(500).json({ error: 'Failed to leave group' });
    return;
  }
};

// In your deleteGroup function
export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  try {
    // Prisma's onDelete: Cascade in schema.prisma should handle related records.
    // However, if you have specific logic or need to ensure order, you can keep explicit deletes.
    // If onDelete: Cascade is set for GroupMember and Topic on Group, these deleteMany calls might be redundant.
    // Check your schema:
    // GroupMember: group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
    // Topic: group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
    // If they are, you can remove these deleteMany calls.

    // If onDelete: Cascade is NOT set for GroupMember or Topic, keep these lines:
    await prisma.groupMember.deleteMany({
      where: { groupId: groupId },
    });
    await prisma.topic.deleteMany({
      where: { groupId: groupId },
    });

    // Now delete the Group record itself
    await prisma.group.delete({ where: { id: groupId } });

    res.json({ message: 'Group deleted successfully' });
    return;
  } catch (err: any) { // Cast error to any
    console.error("Error deleting group:", err); // Log the actual error for debugging
    res.status(500).json({ error: 'Failed to delete group' });
    return;
  }
};

// Get a group by ID
export const getGroupById = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: { select: { id: true, email: true, name: true } },
        members: {
          select: {
            userId: true,
            role: true,
            permissions: true,
            user: { // IMPORTANT: Select user to get the name
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        topics: true,
        messages: true, // Assuming you want messages included
      },
    });
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Transform members to include name directly if desired for the response structure
    const transformedGroup = {
      ...group,
      members: group.members.map(member => ({
        ...member,
        name: member.user.name, // Add the user's name directly to the member object
        email: member.user.email, // Add email if needed
        // Remove the 'user' sub-object if you want a flatter structure
        user: undefined, // Optionally remove the nested user object
      })),
    };

    console.log('checking', transformedGroup?.members);
    res.json(transformedGroup); // Send the transformed group
  } catch (err: any) { // Cast error to any
    console.error("Error getting group by ID:", err); // Log the actual error
    res.status(500).json({ error: 'Failed to get group' });
  }
};

// Get all groups
export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        creator: { select: { id: true, email: true, name: true } },
        members: {
          select: {
            userId: true,
            role: true,
            permissions: true,
            user: { // IMPORTANT: Select user to get the name
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        topics: true,
        messages: true, // Assuming you want messages included
      },
    });

    // Transform members to include name directly if desired for the response structure
    const transformedGroups = groups.map(group => ({
      ...group,
      members: group.members.map(member => ({
        ...member,
        name: member.user.name,
        email: member.user.email,
        user: undefined, // Optionally remove the nested user object
      })),
    }));

    res.json(transformedGroups); // Send the transformed groups
  } catch (err: any) { // Cast error to any
    console.error("Error getting all groups:", err); // Log the actual error
    res.status(500).json({ error: 'Failed to get groups' });
  }
};

// Update a group by ID
export const updateGroupById = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const { name, description, isPrivate } = req.body;
  try {
    const group = await prisma.group.update({
      where: { id: groupId },
      data: {
        name,
        description,
        isPrivate: !!isPrivate, // Ensure boolean type
      },
      include: {
        creator: { select: { id: true, email: true, name: true } },
        members: {
          select: {
            userId: true,
            role: true,
            permissions: true,
            user: { // IMPORTANT: Select user to get the name
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        topics: true,
        messages: true, // Assuming you want messages included
      },
    });

    // Transform members to include name directly if desired for the response structure
    const transformedGroup = {
      ...group,
      members: group.members.map(member => ({
        ...member,
        name: member.user.name,
        email: member.user.email,
        user: undefined, // Optionally remove the nested user object
      })),
    };

    res.json(transformedGroup); // Send the transformed group
  } catch (err: any) { // Cast error to any
    console.error("Error updating group by ID:", err); // Log the actual error
    if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 'P2025') {
      res.status(404).json({ error: 'Group not found' });
    } else {
      res.status(500).json({ error: 'Failed to update group' });
    }
  }
};