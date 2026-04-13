import express from 'express'
import { UserController } from '../controllers/userController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js'
import multer from 'multer';
import { validate } from '../middlewares/validate.js';
import { updateUserProfileSchema, saveCardSchema, addressSchema } from '../validators/userValidator.js';

const router = express.Router()
const authMiddleware = new AuthMiddleware();

const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya boleh upload gambar ya!'), false);
    }
  }
});

// Get & Update User Profile
router.get('/profile',authMiddleware.authenticate, UserController.getUserProfile)
router.post('/profile', validate(updateUserProfileSchema), authMiddleware.authenticate, upload.single('profileImage'), UserController.updateUserProfile)

// Get User Address
router.get('/addresses',authMiddleware.authenticate,UserController.getUserAddress)
router.post('/addresses', validate(addressSchema), authMiddleware.authenticate,UserController.createAddress)

// Get Payment Card Supabase
router.get('/stripe-cards',authMiddleware.authenticate,UserController.getUserCard)
router.post('/stripe/setup-intent', authMiddleware.authenticate, UserController.createStripeSetupIntent);

// Add Card To Stripe
router.post('/stripe-cards', validate(saveCardSchema), authMiddleware.authenticate, UserController.saveNewCard);

export default router