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
router.post('/',authMiddleware.authenticate, authMiddleware.authorize("ADMIN"),  validate(createRestaurantSchema), RestaurantController.createRestaurant);
// Get all restaurant
router.get('/', authMiddleware.authenticate, validate(locationSchema), RestaurantController.getAll);

// Get all categories
router.get('/categories', authMiddleware.authenticate, RestaurantController.getCategories);
// Get specific restaurant by categories
router.get('/categories/:categoryId',  authMiddleware.authenticate, validate(categorySchema), RestaurantController.getRestaurantMenusByCategory);

// Get recommended restaurants for home
router.get('/recommendations',authMiddleware.authenticate,  validate(locationSchema), RestaurantController.getHomeRecommended);
// Get specific recommended restaurants by category
router.get('/recommendations/:categoryId', authMiddleware.authenticate,  validate(recommendedSchema),RestaurantController.getCategoryRecommended);
// Get nearby restaurants for home page
router.get('/nearby', authMiddleware.authenticate, validate(nearbySchema), RestaurantController.getNearbyRestaurants);

// Get detail restaurant
router.get('/:restId', authMiddleware.authenticate, validate(restaurantDetailSchema), RestaurantController.getRestaurantDetail)
// Get detail restaurant route
router.get('/:restId/routes', authMiddleware.authenticate, validate(restaurantDetailSchema), RestaurantController.getRestaurantRoute)
// Get detail restaurant best seller menus
router.get('/:restId/menus/bestseller', authMiddleware.authenticate, validate(restSchema), RestaurantController.getMenusBestSeller)
// Get detail restaurant recommended menus
router.get('/:restId/menus/recommended', authMiddleware.authenticate, validate(restSchema), RestaurantController.getMenusRecommended)
// Get detail restaurant all menus
router.get('/:restId/menus' , authMiddleware.authenticate, validate(restSchema), RestaurantController.getMenus)

export default router;