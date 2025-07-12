import { Request, Response } from 'express';
import prisma from '../prisma/prisma';
import type {} from '../types/express'; // Ensure the type augmentation is loaded

// Create group: creator is assigned automatically as CREATOR with full rights
// ... (rest of your imports and function signature)

export const createGroup = async (req: Request, res: Response): Promise<void> => {
  const { name, description, isPrivate } = req.body;
  const userId = req.user?.id;
  const username = req.user?.name // This is the ID of the user creating the group

  try {
    // In group.controller.js, inside createGroup
console.log('Received userId in createGroup:', userId);
    // Step 1: Validate the user exists. This is crucial to prevent the foreign key error.
    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      // Return an error if the user ID from the request token doesn't exist in the database.
      res.status(400).json({ error: 'Invalid user ID. User does not exist.' });
      return;
    }

    // Step 2: Create the group, connecting it to the existing user.
    const group = await prisma.group.create({
      data: {
        name,
        description,
        isPrivate: !!isPrivate, // Ensure boolean type
        // CORRECT WAY TO LINK THE CREATOR: Use the 'creator' relation field with 'connect'
        creator: {
          connect: {
            id: userId, // This tells Prisma to link the group to the User with this ID
          },
        },
        // Also create an entry in the GroupMember table for the creator
        members: {
          create: {
            userId: userId as string, // Ensure userId is a string
            name: username ?? '', // Add the required 'name' property and ensure it's a primitive string
            role: 'CREATOR', // Set their role as defined in your Role enum
            permissions: {
              // Define explicit default permissions for a CREATOR here
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
        },
      },
      // You can optionally include related data in the response, e.g., the creator's details
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
            }
        }
      },
    });

    res.status(201).json(group);
  } catch (err: any) { // Explicitly type err for better error handling/logging
    console.error("Error creating group:", err);

    // More specific error handling based on Prisma error codes
    if (err.code === 'P2002' && err.meta?.target?.includes('name')) {
        // Example: Handle unique constraint violation on group name if you add one
        res.status(409).json({ error: 'Group with this name already exists.' });
    } else if (err.code === 'P2003') {
        // This should ideally be caught by your existingUser check,
        // but it's good to have as a fallback.
        res.status(400).json({ error: 'Foreign key constraint violated. The associated user does not exist.' });
    } else {
        res.status(500).json({ error: 'Failed to create group.' });
    }
  }
};




// // Join group as MEMBER with default permissions
// export const joinGroup = async (req: Request, res: Response): Promise<void> => {
//   const { groupId } = req.params;
//   const userId = req.user.id;

//   try {
//     const existing = await prisma.groupMember.findUnique({
//       where: { userId_groupId: { userId, groupId } },
//     });
//     if (existing) {
//       res.status(400).json({ error: 'Already a member' });
//       return;
//     }

//     const member = await prisma.groupMember.create({
//       data: {
//         userId,
//         groupId,
//         role: 'MEMBER',
//         permissions: {
//           sendMessage: true,
//           uploadFiles: false,
//           createTopics: false,
//           inviteMembers: false,
//           viewMembers: true,
//         },
//       },
//     });

//     res.status(201).json(member);
//     return;
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to join group' });
//     return;
//   }
// };

// Remove promoteToAdmin, updatePermissions, getMembers, demoteToMember, addMember, createTopic, getTopics, updateTopic, and deleteTopic from this file.
// Only keep group-level logic such as createGroup, deleteGroup, leaveGroup, getGroupById, getGroups.

// In your deleteGroup function
export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  try {
    // Step 1: Delete all GroupMember records associated with this group
    await prisma.groupMember.deleteMany({
      where: { groupId: groupId },
    });

    // Step 2: Delete all Topic records associated with this group (if topics exist)
    await prisma.topic.deleteMany({
      where: { groupId: groupId },
    });

    // Step 3: Now delete the Group record itself
    await prisma.group.delete({ where: { id: groupId } });

    res.json({ message: 'Group deleted successfully' });
    return;
  } catch (err) {
    console.error(err); // Log the actual error for debugging
    res.status(500).json({ error: 'Failed to delete group' });
    return;
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
    if (member.role === 'CREATOR') {
      res.status(403).json({ error: 'Creator cannot leave the group' });
      return;
    }

    await prisma.groupMember.delete({
      where: { userId_groupId: { userId, groupId } },
    });

    res.json({ message: 'You left the group' });
    return;
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave group' });
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
        members: { select: { userId: true, role: true, permissions: true, name: true } },        topics: true,
      },
    });
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    console.log('checking',group?.members)
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get group' });
  }
};

// Get all groups
export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        creator: { select: { id: true, email: true, name: true } },
        members: { select: { userId: true, role: true, permissions: true} },
        topics: true,
      },
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get groups' });
  }
};

