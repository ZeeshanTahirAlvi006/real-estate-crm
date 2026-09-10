import { Router } from 'express'
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
} from './auth.controller.js'
import { validate } from '../../middleware/validate.js'
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.validators.js'
import { authenticate } from '../../middleware/authenticate.js'

const router = Router()

// Public Authentication Routes
router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/refresh-token', refreshToken)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), resetPassword)

// Protected Authentication Routes (Requires valid cookie session)
router.get('/me', authenticate, getMe)
router.post('/logout', authenticate, logout)
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword)

export const authRoutes = router
