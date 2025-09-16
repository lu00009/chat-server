import { Router } from 'express';
import {
  sendMessageInTopic,
  getMessagesInTopic,
  deleteMessageInTopic,
} from '../controllers/topic_message.controller';
import { authenticate } from '../middlewares/auth/authenticate.middleware';
import { upload } from '../middlewares/message/upload';

const router = Router();

// Require auth for all topic message endpoints
router.use(authenticate);

/**
 * @swagger
 * /messages/{groupId}/topics/{topicId}/messages:
 *   post:
 *     summary: Send a message in a topic
 *     tags: [Topic Messages]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post('/:groupId/topics/:topicId/messages', upload.single('file'), sendMessageInTopic);

/**
 * @swagger
 * /messages/{groupId}/topics/{topicId}/messages:
 *   get:
 *     summary: Get all messages in a topic
 *     tags: [Topic Messages]
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
 *         description: List of messages in the topic
 */
router.get('/:groupId/topics/:topicId/messages', getMessagesInTopic);

/**
 * @swagger
 * /messages/{groupId}/topics/{topicId}/messages/{messageId}:
 *   delete:
 *     summary: Delete a message in a topic
 *     tags: [Topic Messages]
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
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Message deleted
 */
router.delete('/:groupId/topics/:topicId/messages/:messageId', deleteMessageInTopic);

export default router;
