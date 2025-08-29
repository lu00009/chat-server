import { Router } from 'express';
import { createTopic, deleteTopic, getTopics, updateTopic } from '../controllers/topic.controller';
import { authenticate } from '../middlewares/auth/authenticate.middleware';

const router = Router();

// Require auth for all topic endpoints
router.use(authenticate);

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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Topic created
 */
router.post('/:groupId/topics', createTopic);

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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of topics
 */
router.get('/:groupId/topics', getTopics);

/**
 * @swagger
 * /group/{groupId}/topics/{topicId}:
 *   patch:
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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Topic updated
 */
router.patch('/:groupId/:topicId', updateTopic);

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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Topic deleted
 */
router.delete('/:groupId/:topicId', deleteTopic);

export default router; 