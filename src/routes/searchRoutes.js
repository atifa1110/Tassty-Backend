import express from 'express'
import { SearchController } from '../controllers/searchController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'

const router = express.Router()
const authMiddleware = new AuthMiddleware();

// search restaurant with menu
router.get('/', authMiddleware.authenticate, SearchController.getSearchRestaurantMenus)
// search restaurant with menu based on category
router.get('/category/:categoryId', authMiddleware.authenticate, SearchController.getSearchRestaurantMenusByCategory)

export default router