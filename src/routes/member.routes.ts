import express from "express";
import {
    addMember,
    demoteToMember,
    getGroupMembers,
    promoteToAdmin,
    removeMemberFromGroup,
    updateMemberRole,
    updateMemberPermissions
} from "../controllers/member.controller";
import { authenticate } from '../middlewares/auth/authenticate.middleware';
import { hasPermission } from "../middlewares/group/permission";

const router = express.Router();

// Require auth for all member endpoints
router.use(authenticate);

/**
 * @swagger
 * /group/{groupId}/members:
 *   post:
 *     summary: Add a member to a group
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Member added
 */
router.post("/:groupId/members", addMember);

/**
 * @swagger
 * /group/{groupId}/members/{userId}/role:
 *   patch:
 *     summary: Update a member's role in a group
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch("/:groupId/members/:userId/role", updateMemberRole);

/**
 * @swagger
 * /group/{groupId}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a group
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete("/:groupId/members/:userId", removeMemberFromGroup);

/**
 * @swagger
 * /group/{groupId}/members:
 *   get:
 *     summary: Get members of a group
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of members
 */
router.get("/:groupId/members", getGroupMembers); // Route for getting all members of a group

/**
 * @swagger
 * /group/{groupId}/members/{memberId}/promote-admin:
 *   patch:
 *     summary: Promote a member to admin
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Member promoted to admin
 */
router.patch("/:groupId/promote/:memberId", promoteToAdmin);

/**
 * @swagger
 * /group/{groupId}/promote/{memberId}:
 *   patch:
 *     summary: Demote an admin to regular member
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Member demoted
 */
router.patch("/:groupId/demote/:memberId", demoteToMember);

/**
 * @swagger
 * /group/{groupId}/permissions/{userId}:
 *   patch:
 *     summary: Update a member's permissions
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: object
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions updated
 */
router.patch("/:groupId/permissions/:userId", hasPermission('managePermissions'), updateMemberPermissions);

export default router;