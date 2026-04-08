import express from 'express'
import { MenuController } from '../controllers/menuController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'

const router = express.Router()
const authMiddleware = new AuthMiddleware();

router.post('/add', authMiddleware.authenticate, MenuController.add)
router.post('/customizations/add', authMiddleware.authenticate, MenuController.addCustomizations)
router.post('/customizations/assign', authMiddleware.authenticate, MenuController.assignCustomizationsToMenus)
router.get('/recommended', authMiddleware.authenticate, MenuController.getRecommendedMenus)
router.get('/suggested', authMiddleware.authenticate, MenuController.getSuggestedMenus)

export default router