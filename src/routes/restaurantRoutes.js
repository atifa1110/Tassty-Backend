import express from 'express'
import { RestaurantController } from '../controllers/restaurantController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validate.js';
import { restaurantDetailSchema, restSchema, 
    locationSchema, recommendedSchema,nearbySchema,
    categorySchema, createRestaurantSchema
} from '../validators/restaurantValidator.js';

const router = express.Router()
const authMiddleware = new AuthMiddleware();

// Create a new restaurant
router.post('/', validate(createRestaurantSchema), authMiddleware.authenticate, RestaurantController.createRestaurant);
// Get all restaurant
router.get('/', validate(locationSchema), authMiddleware.authenticate, RestaurantController.getAll);

// Get all categories
router.get('/categories', authMiddleware.authenticate, RestaurantController.getCategories);
// Get specific restaurant by categories
router.get('/categories/:categoryId',  validate(categorySchema), authMiddleware.authenticate, RestaurantController.getRestaurantMenusByCategory);

// Get recommended restaurants for home
router.get('/recommendations', validate(locationSchema), authMiddleware.authenticate, RestaurantController.getHomeRecommended);
// Get specific recommended restaurants by category
router.get('/recommendations/:categoryId', validate(recommendedSchema), authMiddleware.authenticate, RestaurantController.getCategoryRecommended);
// Get nearby restaurants for home page
router.get('/nearby',validate(nearbySchema), authMiddleware.authenticate, RestaurantController.getNearbyRestaurants);

// Get detail restaurant
router.get('/:restId', validate(restaurantDetailSchema), authMiddleware.authenticate, RestaurantController.getRestaurantDetail)
// Get detail restaurant route
router.get('/:restId/routes', validate(restaurantDetailSchema), authMiddleware.authenticate, RestaurantController.getRestaurantRoute)
// Get detail restaurant best seller menus
router.get('/:restId/menus/bestseller', validate(restSchema) , authMiddleware.authenticate, RestaurantController.getMenusBestSeller)
// Get detail restaurant recommended menus
router.get('/:restId/menus/recommended', validate(restSchema), authMiddleware.authenticate, RestaurantController.getMenusRecommended)
// Get detail restaurant all menus
router.get('/:restId/menus', validate(restSchema) , authMiddleware.authenticate, RestaurantController.getMenus)

export default router;