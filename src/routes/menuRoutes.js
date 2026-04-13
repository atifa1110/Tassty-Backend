import express from 'express'
import { MenuController } from '../controllers/menuController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validate.js';
import { menuDetailSchema, createMenusSchema, createCustomizationSchema, assignCustomizationSchema } from '../validators/menuValidator.js';
import { locationSchema } from '../validators/restaurantValidator.js';

const router = express.Router()
const authMiddleware = new AuthMiddleware();

// Create a new customization group (e.g., "Extra Toppings", "Spiciness Level")
router.post('/customizations/', validate(createCustomizationSchema), authMiddleware.authenticate, MenuController.addCustomizations)
// Assign multiple customization groups to multiple menus
router.post('/customizations/assign', validate(assignCustomizationSchema), authMiddleware.authenticate, MenuController.assignCustomizationsToMenus)

// Get recommended menus for home
router.get('/recommended', validate(locationSchema), authMiddleware.authenticate, MenuController.getRecommendedMenus)
// Get suggested menus for home
router.get('/suggested', validate(locationSchema), authMiddleware.authenticate, MenuController.getSuggestedMenus)

// Create a new menu item
router.post('/', validate(createMenusSchema), authMiddleware.authenticate, MenuController.createMenus)
// Get detail menu
router.get('/:menuId', validate(menuDetailSchema), authMiddleware.authenticate, MenuController.getMenuDetail)


export default router