import express from 'express'
import AuthMiddleware from '../middlewares/authMiddleware.js'
import { ChatController } from '../controllers/chatController.js';

const router = express.Router()
const authMiddleware = new AuthMiddleware();

router.post('/channel', authMiddleware.authenticate, ChatController.getChannel);
router.post('/update', ChatController.updateSystemAccount);

export default router;