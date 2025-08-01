// src/middlewares/group/permission.ts

import { NextFunction, Request, Response } from 'express';
import prisma from '../../prisma/prisma';
import type { } from '../../types/express'; // This is correct and necessary

/**
 * Check if the current user is the group creator
 */

// The creator gets all permissions
export const CREATOR_PERMISSIONS = {
  sendMessage: true,
  uploadFiles: true,
  createTopics: true,
  inviteMembers: true,
  viewMembers: true,
  manageMembers: true,
  managePermissions: true,
  manageTopics: true,
};

// A regular member gets a limited set of permissions
export const DEFAULT_MEMBER_PERMISSIONS = {
  sendMessage: true,
  uploadFiles: true,
  createTopics: false,
  inviteMembers: true,
  viewMembers: true,
  manageMembers: false,
  managePermissions: false,
  manageTopics: false,
};
export const isCreator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { groupId } = req.params;

  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;


  try {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    if (group.createdBy !== userId) {
      res.status(403).json({ error: 'Only the creator can perform this action' });
      return;
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
    return;
  }
};

/**
 * Middleware to check if user has a specific permission or role in the group.
 * @param action The permission action to check, e.g. 'sendMessage', 'manageMembers', 'deleteGroup'
 */
export const hasPermission = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { groupId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.id;


    try {
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId,
          },
        },
      });

      if (!membership) {
        res.status(403).json({ error: 'You are not a member of this group' });
        return;
      }

      // Creator always allowed
      if (membership.role === 'CREATOR') {
        next();
        return;
      }

      // Admins have all except 'deleteGroup'
      if (membership.role === 'ADMIN') {
        if (action === 'deleteGroup') {
          res.status(403).json({ error: 'Only creator can delete group' });
          return;
        }
        next();
        return;
      }

      // Check permissions JSON
      const perms = membership.permissions as Record<string, boolean>;
      if (perms?.[action]) {
        next();
        return;
      }

      res.status(403).json({ error: 'Permission denied' });
      return;
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
      return;
    }
  };
};
