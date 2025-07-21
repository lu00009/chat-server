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
import { upload } from "../middlewares/message/upload";

const router = express.Router();

router.post("/messages", upload.single("file"), sendMessage);
router.get("/groups/:groupId/messages", getGroupMessages);
router.patch("/messages/:messageId", updateMessage);
router.delete("/messages/:messageId", deleteMessage);

router.post("/messages/:messageId/reactions", reactToMessage);
router.delete("/messages/:messageId/reactions/:emoji", removeReaction);

router.post("/messages/:messageId/seen", markMessageSeen);

export default router;
