import express from 'express';
import {
  createGroup,
  joinGroup,
  promoteToAdmin,
  updatePermissions,
  getMembers,demoteToMember, deleteGroup, leaveGroup ,
  createTopic, getTopics, updateTopic, deleteTopic
} from '../controllers/group.controller';
import { authenticate } from '../middlewares/auth/authenticate.middleware';
import { isCreator, hasPermission } from '../middlewares/group/permission';

const router = express.Router();

router.use(authenticate);

router.post('/create', createGroup);

router.post('/join/:groupId', joinGroup);

router.get('/:groupId/members', hasPermission('viewMembers'), getMembers);

router.post('/:groupId/promote/:memberId', hasPermission('manageMembers'), promoteToAdmin);

router.patch('/:groupId/permissions/:memberId', hasPermission('managePermissions'), updatePermissions);

router.post('/:groupId/demote/:memberId', hasPermission('manageMembers'), demoteToMember);

router.delete('/:groupId', isCreator, deleteGroup);

router.post('/:groupId/leave', leaveGroup);

router.post('/:groupId/topics', hasPermission('manageTopics'), createTopic);

router.get('/:groupId/topics', hasPermission('viewTopics'), getTopics);

router.put('/:groupId/topics/:topicId', hasPermission('manageTopics'), updateTopic);

router.delete('/:groupId/topics/:topicId', hasPermission('manageTopics'), deleteTopic);

export default router;
