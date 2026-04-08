import express from 'express'
import { UserController } from '../controllers/userController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'
import multer from 'multer';

const router = express.Router()
const authMiddleware = new AuthMiddleware();

const upload = multer(); 

// Get & Update User Profile
router.get('/profile',authMiddleware.authenticate, UserController.getUserProfile)
router.post('/profile',authMiddleware.authenticate, upload.single('profileImage'), UserController.updateUserProfile)

// Get User Address
router.get('/addresses',authMiddleware.authenticate,UserController.getUserAddress)
router.post('/addresses',authMiddleware.authenticate,UserController.createAddress)

// Get Payment Card Supabase
router.get('/stripe-cards',authMiddleware.authenticate,UserController.getUserCard)
router.post('/stripe/setup-intent', authMiddleware.authenticate, UserController.createStripeSetupIntent);

// Add Card To Stripe
router.post('/stripe-cards', authMiddleware.authenticate, UserController.saveNewCard);

export default router