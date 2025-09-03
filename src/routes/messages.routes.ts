import express from "express";
import {
    deleteMessage,
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

// Require auth for all message endpoints
router.use(authenticate);

// Standard message endpoints
router.post("/", upload.single("file"), sendMessage);
router.get("/group/:groupId", getGroupMessages);
router.patch("/:messageId", updateMessage);
router.delete("/:messageId", deleteMessage);

// Reactions
router.post("/:messageId/reactions", reactToMessage);
router.delete("/:messageId/reactions/:emoji", removeReaction);

// Message seen status
router.post("/:messageId/seen", markMessageSeen);

// Special upload endpoint for file attachments
router.post("/upload", upload.single("file"), sendMessage);

export default router;
