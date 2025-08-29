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

router.post("/", upload.single("file"), sendMessage);
router.get("/:groupId", getGroupMessages);
router.patch("/:messageId", updateMessage);
router.delete("/:messageId", deleteMessage);

router.post("/:messageId/reactions", reactToMessage);
router.delete("/:messageId/reactions/:emoji", removeReaction);

router.post("/:messageId/seen", markMessageSeen);

export default router;
