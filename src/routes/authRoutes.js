import express from 'express'
import { AuthController } from '../controllers/authController.js'
import AuthMiddleware from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validate.js'
import { loginSchema, registerSchema, verifySchema,  } from '../validators/authValidator.js'
import { resendEmailSchema, refreshTokenSchema, setupSchema, updatePasswordSchema } from '../validators/authValidator.js'

const router = express.Router()
const authMiddleware = new AuthMiddleware();

// Sign up & Set up account
router.post('/signup', validate(registerSchema), AuthController.signup)
router.post('/verify-email-otp', validate(verifySchema), AuthController.verifyCode)
router.post('/resend-otp', validate(resendEmailSchema), AuthController.resendCode)
router.post('/setup-account', validate(setupSchema), authMiddleware.authenticate, AuthController.setup)

router.post('/login', validate(loginSchema), AuthController.login)
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refresh)
router.post('/register-device', authMiddleware.authenticate, AuthController.registerDevice)

// Forgot Password (OTP)
router.post('/forgot-password', validate(resendEmailSchema), AuthController.requestResetPassword)
router.post('/verify-reset-otp', validate(verifySchema),AuthController.verifyResetOtp)
router.post('/reset-password', validate(updatePasswordSchema), authMiddleware.authenticate, AuthController.resetPassword)

router.post('/logout', authMiddleware.authenticate, AuthController.logout)

export default router
