import express from 'express';
import {
  createGroup,
  createTopic,
  deleteGroup,
  deleteTopic,
  demoteToMember,
  getMembers,
  getTopics,
  joinGroup,
  leaveGroup,
  promoteToAdmin,
  updatePermissions,
  updateTopic
} from '../controllers/group.controller';
import { authenticate } from '../middlewares/auth/authenticate.middleware';
import { hasPermission, isCreator } from '../middlewares/group/permission';

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
