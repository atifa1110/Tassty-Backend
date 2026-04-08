import express from 'express'
import { ReviewController } from '../controllers/reviewController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'

const router = express.Router()
const authMiddleware = new AuthMiddleware();

router.post('/:orderId/menu', authMiddleware.authenticate, ReviewController.createReviewMenu)
router.post('/:orderId/restaurant', authMiddleware.authenticate, ReviewController.createReviewRestaurant)
router.get('/:restaurantId', authMiddleware.authenticate, ReviewController.getReview)
router.get('/:restaurantId/detail', authMiddleware.authenticate, ReviewController.getReviewDetail)

export default router