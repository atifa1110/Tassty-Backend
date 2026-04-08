import express from 'express'
import { DetailController } from '../controllers/detailController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'

const router = express.Router()
const authMiddleware = new AuthMiddleware();

router.get('/:id', authMiddleware.authenticate, DetailController.getRestaurantDetail)
router.get('/:id/menus/bestseller', authMiddleware.authenticate, DetailController.getBestSellerMenus)
router.get('/:id/menus/recommended', authMiddleware.authenticate, DetailController.getRecommendedMenus)
router.get('/:id/menus/all', authMiddleware.authenticate, DetailController.getAllMenus)
router.get('/:id/reviews', authMiddleware.authenticate, DetailController.getRestaurantDetail)
router.get('/:id/routes', authMiddleware.authenticate, DetailController.getRouteToRestaurant)
router.get('/menu/:id', authMiddleware.authenticate, DetailController.getMenuDetail)
export default router
