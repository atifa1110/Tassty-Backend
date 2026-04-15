import express from 'express'
import { ReviewController } from '../controllers/reviewController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validate.js';
import { createReviewMenuSchema, createRestaurantReviewSchema } from '../validators/reviewValidator.js';
import { restSchema } from '../validators/restaurantValidator.js';

const router = express.Router()
const authMiddleware = new AuthMiddleware();

router.post('/:orderItemId', authMiddleware.authenticate, authMiddleware.authorize("USER"), validate(createReviewMenuSchema), ReviewController.createReviewMenu)
router.post('/:orderId/restaurant',authMiddleware.authenticate, authMiddleware.authorize("USER"), validate(createRestaurantReviewSchema), ReviewController.createReviewRestaurant)
router.get('/:restId',  authMiddleware.authenticate, validate(restSchema),ReviewController.getReview)
router.get('/:restId/detail', authMiddleware.authenticate, validate(restSchema), ReviewController.getReviewDetail)

export default router