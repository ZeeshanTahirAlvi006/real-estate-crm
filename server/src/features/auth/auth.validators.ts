import { z } from 'zod'
import { USER_ROLES } from '../../utils/constants.js'

// Register / Sign-up Validation Schema
export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(50, 'First name cannot exceed 50 characters'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Last name is required')
      .max(50, 'Last name cannot exceed 50 characters'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address')
      .max(100, 'Email cannot exceed 100 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    brokerageName: z
      .string()
      .trim()
      .min(2, 'Brokerage name must be at least 2 characters')
      .max(100, 'Brokerage name cannot exceed 100 characters'),
    phone: z.string().trim().optional(),
    role: z
      .enum([USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER, USER_ROLES.TEAM_LEAD, USER_ROLES.AGENT, USER_ROLES.LEAD])
      .optional()
      .default(USER_ROLES.BROKERAGE_OWNER),
  })
  .strict()

// Login Validation Schema
export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
  })
  .strict()

// Forgot Password Validation Schema
export const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
  })
  .strict()

// Reset Password Validation Schema
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
  })
  .strict()
