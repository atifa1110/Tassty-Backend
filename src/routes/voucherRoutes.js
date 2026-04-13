import express from 'express'
import { VoucherController } from '../controllers/voucherController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validate.js';
import { restSchema } from '../validators/restaurantValidator.js';

const router = express.Router()
const authMiddleware = new AuthMiddleware();

router.get('/todays', authMiddleware.authenticate, VoucherController.getVoucherToday)
router.get('/restaurant/:restId', validate(restSchema), authMiddleware.authenticate, VoucherController.getVoucherRestaurant)
router.get('/user', authMiddleware.authenticate, VoucherController.getVoucherUser)

export default router