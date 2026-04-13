import express from 'express'
import { ReviewController } from '../controllers/reviewController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validate.js';
import { createReviewMenuSchema, createRestaurantReviewSchema } from '../validators/reviewValiodator.js';
import { restSchema } from '../validators/restaurantValidator.js';

const router = express.Router()
const authMiddleware = new AuthMiddleware();

router.post('/:orderItemId', validate(createReviewMenuSchema) ,authMiddleware.authenticate, ReviewController.createReviewMenu)
router.post('/:orderId/restaurant', validate(createRestaurantReviewSchema),authMiddleware.authenticate, ReviewController.createReviewRestaurant)
router.get('/:restId', validate(restSchema), authMiddleware.authenticate, ReviewController.getReview)
router.get('/:restId/detail', validate(restSchema), authMiddleware.authenticate, ReviewController.getReviewDetail)

export default router