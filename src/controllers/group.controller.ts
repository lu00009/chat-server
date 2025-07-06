import { Request, Response } from 'express';
import prisma from '../prisma/prisma';
import type {} from '../types/express'; // Ensure the type augmentation is loaded

// Create group: creator is assigned automatically as CREATOR with full rights
// ... (rest of your imports and function signature)

export const createGroup = async (req: Request, res: Response): Promise<void> => {
  const { name, description, isPrivate } = req.body;
  const userId = req.user.id; // This is the ID of the user creating the group

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
            userId, // The ID of the user becoming a member
            role: 'CREATOR', // Set their role as defined in your Role enum
            permissions: {
              // Define explicit default permissions for a CREATOR here
              // Based on your promoteToAdmin, demoteToMember, etc., you might want to mirror admin permissions here
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




// Join group as MEMBER with default permissions
export const joinGroup = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    const existing = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (existing) {
      res.status(400).json({ error: 'Already a member' });
      return;
    }

    const member = await prisma.groupMember.create({
      data: {
        userId,
        groupId,
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

    res.status(201).json(member);
    return;
  } catch (err) {
    res.status(500).json({ error: 'Failed to join group' });
    return;
  }
};

// Promote member to ADMIN
export const promoteToAdmin = async (req: Request, res: Response): Promise<void> => {
  const { groupId, memberId } = req.params;

  try {
    // Prevent promoting CREATOR or invalid member
    const member = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId: memberId, groupId },
      },
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
      where: {
        userId_groupId: { userId: memberId, groupId },
      },
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

// Update permissions for a member (admins or creator only)
export const updatePermissions = async (req: Request, res: Response): Promise<void> => {
  const { groupId, memberId } = req.params;
  const permissions = req.body.permissions;

  try {
    // Optional: Basic validation if permissions is not an object
    if (typeof permissions !== 'object' || permissions === null) {
      console.log('Invalid permissions object received:', permissions);
      res.status(400).json({ error: 'Invalid permissions object provided. Must be a JSON object.' });
      return;
    }

    const updated = await prisma.groupMember.update({
      where: {
        userId_groupId: { userId: memberId, groupId },
      },
      data: {
        permissions, // Pass the extracted permissions directly
      },
    });

    // --- ADD THIS CONSOLE LOG ---
    console.log('Prisma update result (returned object):', updated);

    res.json({ message: 'Permissions updated successfully', updated }); // Updated message
    return;
  } catch (err: any) { // Explicitly type err
    console.error('Error updating permissions:', err);
    // More specific error handling
    if (err.code === 'P2025') {
      // Record to update not found (userId or groupId mismatch)
      res.status(404).json({ error: 'Group member not found with the provided user and group IDs.' });
    } else if (err.code === 'P2003') {
        // Foreign key constraint (shouldn't happen here if P2025 is handled)
        res.status(400).json({ error: 'Invalid user or group ID referenced.' });
    }
    else {
      res.status(500).json({ error: 'Failed to update permissions.' });
    }
    return;
  }
};

// List all members of a group with user info
export const getMembers = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;

  try {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    res.json(members);
    return;
  } catch (err) {
    res.status(500).json({ error: 'Failed to get members' });
    return;
  }
};
// Demote admin to member
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
  const userId = req.user.id;
  const { groupId } = req.params;

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

// Topic Management Controllers

// Create a new topic (requires manageTopics permission)
export const createTopic = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const { title } = req.body;
  const userId = req.user.id;

  try {
    // Check if user is a member and has manageTopics permission
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
        createdBy: userId,
      },
    });

    res.status(201).json(topic);
  } catch (err) {
    console.error('Error creating topic:', err);
    res.status(500).json({ error: 'Failed to create topic' });
  }
};

// Get all topics in a group (requires viewMembers permission)
export const getTopics = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user is a member
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
    console.error('Error getting topics:', err);
    res.status(500).json({ error: 'Failed to get topics' });
  }
};

// Update a topic (requires manageTopics permission)
export const updateTopic = async (req: Request, res: Response): Promise<void> => {
  const { groupId, topicId } = req.params;
  const { title } = req.body;
  const userId = req.user.id;

  try {
    // Check if user is a member and has manageTopics permission
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

    // Check if topic exists and belongs to this group
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
    console.error('Error updating topic:', err);
    res.status(500).json({ error: 'Failed to update topic' });
  }
};

// Delete a topic (requires manageTopics permission)
export const deleteTopic = async (req: Request, res: Response): Promise<void> => {
  const { groupId, topicId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user is a member and has manageTopics permission
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

    // Check if topic exists and belongs to this group
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
    console.error('Error deleting topic:', err);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
};

