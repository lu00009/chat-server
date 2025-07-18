import express from 'express';
import {
  createGroup,
  deleteGroup,
  leaveGroup,
  getGroups,
  getGroupById,
  updateGroupById,
} from '../controllers/group.controller';
import { authenticate } from '../middlewares/auth/authenticate.middleware';
import { isCreator } from '../middlewares/group/permission';

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /group/create:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPrivate:
 *                 type: boolean
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Group created
 */

router.post('/create', createGroup);

/**
 * @swagger
 * /group/{groupId}:
 *   delete:
 *     summary: Delete a group
 *     tags: [Groups]
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
 *         description: Group deleted
 */

router.delete('/:groupId', isCreator, deleteGroup);

/**
 * @swagger
 * /group/{groupId}/leave:
 *   post:
 *     summary: Leave a group
 *     tags: [Groups]
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
 *         description: Left group
 */

router.post('/:groupId/leave', leaveGroup);

/**
 * @swagger
 * /group:
 *   get:
 *     summary: Get all groups
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups
 */
router.get('/', getGroups);

/**
 * @swagger
 * /group/{groupId}:
 *   get:
 *     summary: Get a group by ID
 *     tags: [Groups]
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
 *         description: Group details
 *       404:
 *         description: Group not found
 */
router.get('/:groupId', getGroupById);

/**
 * @swagger
 * /group/{groupId}:
 *   patch:
 *     summary: Update a group by ID
 *     tags: [Groups]
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
 *         description: Group updated
 *       404:
 *         description: Group not found
 */
router.patch('/:groupId', isCreator, updateGroupById); 

export default router;
