import express from 'express';
import {
  createGroup,
  joinGroup,
  promoteToAdmin,
  updatePermissions,
  getMembers,demoteToMember, deleteGroup, leaveGroup ,
  createTopic, getTopics, updateTopic, deleteTopic, getGroups, getGroupById, addMember
} from '../controllers/group.controller';
import { authenticate } from '../middlewares/auth/authenticate.middleware';
import { isCreator, hasPermission } from '../middlewares/group/permission';

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
 *     responses:
 *       201:
 *         description: Group created
 */

router.post('/create', createGroup);

/**
 * @swagger
 * /group/join/{groupId}:
 *   post:
 *     summary: Join a group
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Joined group
 */

router.post('/join/:groupId', joinGroup);

/**
 * @swagger
 * /group/{groupId}/members:
 *   get:
 *     summary: Get all members of a group
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of members
 */

router.get('/:groupId/members', hasPermission('viewMembers'), getMembers);

/**
 * @swagger
 * /group/{groupId}/promote/{memberId}:
 *   post:
 *     summary: Promote a member to admin
 *     tags: [Groups]
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
 *     responses:
 *       200:
 *         description: User promoted
 */

router.post('/:groupId/promote/:memberId', hasPermission('manageMembers'), promoteToAdmin);

/**
 * @swagger
 * /group/{groupId}/permissions/{memberId}:
 *   patch:
 *     summary: Update permissions for a group member
 *     tags: [Groups]
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
 *     responses:
 *       200:
 *         description: Permissions updated
 */

router.patch('/:groupId/permissions/:memberId', hasPermission('managePermissions'), updatePermissions);

/**
 * @swagger
 * /group/{groupId}/demote/{memberId}:
 *   post:
 *     summary: Demote an admin to member
 *     tags: [Groups]
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
 *     responses:
 *       200:
 *         description: User demoted
 */

router.post('/:groupId/demote/:memberId', hasPermission('manageMembers'), demoteToMember);

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
 *     responses:
 *       200:
 *         description: Left group
 */

router.post('/:groupId/leave', leaveGroup);

/**
 * @swagger
 * /group/{groupId}/topics:
 *   post:
 *     summary: Create a topic in a group
 *     tags: [Topics]
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
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Topic created
 */

router.post('/:groupId/topics', hasPermission('manageTopics'), createTopic);

/**
 * @swagger
 * /group/{groupId}/topics:
 *   get:
 *     summary: Get all topics in a group
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of topics
 */

router.get('/:groupId/topics', hasPermission('viewTopics'), getTopics);

/**
 * @swagger
 * /group/{groupId}/topics/{topicId}:
 *   put:
 *     summary: Update a topic in a group
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: topicId
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
 *               title:
 *                 type: string
 *     responses:
 *       200:
 *         description: Topic updated
 */

router.put('/:groupId/topics/:topicId', hasPermission('manageTopics'), updateTopic);

/**
 * @swagger
 * /group/{groupId}/topics/{topicId}:
 *   delete:
 *     summary: Delete a topic in a group
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Topic deleted
 */

router.delete('/:groupId/topics/:topicId', hasPermission('manageTopics'), deleteTopic);

/**
 * @swagger
 * /group:
 *   get:
 *     summary: Get all groups
 *     tags: [Groups]
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
 *     responses:
 *       200:
 *         description: Group details
 *       404:
 *         description: Group not found
 */
router.get('/:groupId', getGroupById);

/**
 * @swagger
 * /group/{groupId}/add-member:
 *   post:
 *     summary: Add a member to a group
 *     tags: [Groups]
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
 *     responses:
 *       201:
 *         description: Member added
 *       400:
 *         description: User is already a member
 */
router.post('/:groupId/add-member', addMember);

export default router;
