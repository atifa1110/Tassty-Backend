import express from 'express'
import { SearchController } from '../controllers/searchController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validate.js';
import { searchSchema } from '../validators/searchValidator.js';

const router = express.Router()
const authMiddleware = new AuthMiddleware();

// search restaurant with menu
router.get('/',validate(searchSchema) , authMiddleware.authenticate, SearchController.getSearchRestaurantMenus)

export default router