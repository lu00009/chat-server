import { Router } from 'express';
import { promoteToAdmin, updatePermissions, getMembers, demoteToMember, addMember } from '../controllers/member.controller';

const router = Router();

/**
 * @swagger
 * /group/{groupId}/members:
 *   get:
 *     summary: Get all members of a group
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
 *         description: List of members
 */
router.get('/:groupId/members', getMembers);

/**
 * @swagger
 * /group/{groupId}/promote/{memberId}:
 *   post:
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User promoted
 */
router.post('/:groupId/promote/:memberId', promoteToAdmin);

/**
 * @swagger
 * /group/{groupId}/permissions/{memberId}:
 *   patch:
 *     summary: Update permissions for a group member
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: object
 *                 additionalProperties:
 *                   type: boolean
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions updated
 */
router.patch('/:groupId/permissions/:memberId', updatePermissions);

/**
 * @swagger
 * /group/{groupId}/demote/{memberId}:
 *   post:
 *     summary: Demote an admin to member
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User demoted
 */
router.post('/:groupId/demote/:memberId', demoteToMember);

/**
 * @swagger
 * /group/{groupId}/add-member:
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
 *       400:
 *         description: User is already a member
 */
router.post('/:groupId/add-member', addMember);

export default router; 