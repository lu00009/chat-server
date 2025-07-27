import express from "express";
import {
    addMember,
    demoteToMember
    // 'updatePermissions' is NOT an exported member from the member.controller.ts
    // I provided. If you intend to have this functionality, you'll need to
    // implement and export it in member.controller.ts first.
    ,
    getGroupMembers, // IMPORTANT: This should be 'getGroupMembers', not 'getMembers'
    promoteToAdmin,
    removeMemberFromGroup, // This should match the export in member.controller.ts
    updateMemberRole
} from "../controllers/member.controller";

const router = express.Router();

router.post("/groups/:groupId/members", addMember);
router.patch("/groups/:groupId/members/:userId/role", updateMemberRole);
router.delete("/groups/:groupId/members/:userId", removeMemberFromGroup);
router.get("/groups/:groupId/members", getGroupMembers); // Route for getting all members of a group

router.patch("/groups/:groupId/members/:memberId/promote-admin", promoteToAdmin);
router.patch("/groups/:groupId/members/:memberId/demote-member", demoteToMember);

export default router;