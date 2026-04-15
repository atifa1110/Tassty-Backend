import express from 'express'
import { MenuController } from '../controllers/menuController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validate.js';
import { menuDetailSchema, createMenusSchema, createCustomizationSchema, assignCustomizationSchema } from '../validators/menuValidator.js';
import { locationSchema } from '../validators/restaurantValidator.js';

const router = express.Router()
const authMiddleware = new AuthMiddleware();

// Create a new customization group (e.g., "Extra Toppings", "Spiciness Level")
router.post('/customizations/', authMiddleware.authenticate, authMiddleware.authorize("ADMIN"), validate(createCustomizationSchema), MenuController.addCustomizations)
// Assign multiple customization groups to multiple menus
router.post('/customizations/assign', authMiddleware.authenticate, authMiddleware.authorize("ADMIN"), validate(assignCustomizationSchema), MenuController.assignCustomizationsToMenus)

// Get recommended menus for home
router.get('/recommended', authMiddleware.authenticate, validate(locationSchema), MenuController.getRecommendedMenus)
// Get suggested menus for home
router.get('/suggested', authMiddleware.authenticate, validate(locationSchema), MenuController.getSuggestedMenus)

// Create a new menu item
router.post('/', authMiddleware.authenticate, authMiddleware.authorize("ADMIN"), validate(createMenusSchema), MenuController.createMenus)
// Get detail menu
router.get('/:menuId', authMiddleware.authenticate, validate(menuDetailSchema), MenuController.getMenuDetail)


export default router