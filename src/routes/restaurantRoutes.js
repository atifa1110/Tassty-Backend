import express from 'express'
import { RestaurantController } from '../controllers/restaurantController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'

const router = express.Router()
const authMiddleware = new AuthMiddleware();

router.get('/category/all', authMiddleware.authenticate, RestaurantController.getCategories)
router.post('/add', authMiddleware.authenticate, RestaurantController.add)
router.get('/', authMiddleware.authenticate, RestaurantController.getAll)
// home page restaurant recommendations
router.get('/recommendations/home',authMiddleware.authenticate,RestaurantController.getHomeRecommended)
// restaurant recommendations by category
router.get('/recommendations/:categoryId', authMiddleware.authenticate, RestaurantController.getCategoryRecommended)
// get nearby restaurant 
router.get('/nearby', authMiddleware.authenticate, RestaurantController.getNearbyRestaurants)

export default router
