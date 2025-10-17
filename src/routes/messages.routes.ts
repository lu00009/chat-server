import express from "express";
import multer from 'multer';
import {
    deleteMessage,
    deleteMessagesBulk,
    getGroupMessages,
    markMessageSeen,
    reactToMessage,
    removeReaction,
    sendMessage,
    updateMessage,
} from "../controllers/message.controller";
import { authenticate } from '../middlewares/auth/authenticate.middleware';
import { upload } from "../middlewares/message/upload";

const router = express.Router();
const uploadMulter = multer({ dest: 'uploads/' });

// Require auth for all message endpoints
router.use(authenticate);

/**
 * @swagger
 * /messages:
 *   post:
 *     summary: Send a message (optionally with file upload)
 *     tags: [Messages]
 *     requestBody:
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
 *               groupId:
 *                 type: string
 *               type:
 *                 type: string
 *             required:
 *               - groupId
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post("/", upload.single("file"), sendMessage);

/**
 * @swagger
 * /messages/group/{groupId}:
 *   get:
 *     summary: Get messages for a group
 *     tags: [Messages]
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
 *         description: List of messages
 */
router.get("/group/:groupId", getGroupMessages);

/**
 * @swagger
 * /messages/{messageId}:
 *   patch:
 *     summary: Update a message's content
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *               newContent:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Message updated
 */
router.patch("/:messageId", updateMessage);

/**
 * @swagger
 * /messages/{messageId}:
 *   delete:
 *     summary: Soft-delete a message
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Message marked as deleted
 */
router.delete("/:messageId", deleteMessage);

/**
 * @swagger
 * /messages/bulk-delete:
 *   post:
 *     summary: Delete multiple messages
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Messages deleted
 */
router.post("/bulk-delete", deleteMessagesBulk);

/**
 * @swagger
 * /messages/{messageId}/reactions:
 *   post:
 *     summary: React to a message with an emoji
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *               emoji:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Reaction created
 */
router.post("/:messageId/reactions", reactToMessage);

/**
 * @swagger
 * /messages/{messageId}/reactions/{emoji}:
 *   delete:
 *     summary: Remove a reaction from a message
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: emoji
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reaction removed
 */
router.delete("/:messageId/reactions/:emoji", removeReaction);

/**
 * @swagger
 * /messages/{messageId}/seen:
 *   post:
 *     summary: Mark a message as seen by the authenticated user
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Message marked as seen
 */
router.post("/:messageId/seen", markMessageSeen);

/**
 * @swagger
 * /messages/upload:
 *   post:
 *     summary: Upload a file as a message attachment
 *     tags: [Messages]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               groupId:
 *                 type: string
 *             required:
 *               - groupId
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: File uploaded and message created
 */
router.post("/upload", upload.single("file"), sendMessage);

export default router;
