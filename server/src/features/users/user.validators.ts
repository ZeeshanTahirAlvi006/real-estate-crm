import { z } from 'zod'
import { USER_ROLES } from '../../utils/constants.js'

// Invite User Schema
export const inviteUserSchema = z
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
      .email('Please provide a valid email address'),
    role: z.enum([
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.BROKERAGE_OWNER,
      USER_ROLES.TEAM_LEAD,
      USER_ROLES.AGENT,
      USER_ROLES.LEAD,
    ]),
    phone: z.string().trim().optional(),
    brokerageId: z.string().trim().optional(),
  })
  .strict()

// Update User Profile Schema
export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    phone: z.string().trim().optional(),
    timezone: z.string().trim().optional(),
    avatarUrl: z.string().trim().url('Invalid avatar URL format').optional(),
  })
  .strict()

// Change User Role Schema
export const changeUserRoleSchema = z
  .object({
    role: z.enum([
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.BROKERAGE_OWNER,
      USER_ROLES.TEAM_LEAD,
      USER_ROLES.AGENT,
      USER_ROLES.LEAD,
    ]),
  })
  .strict()

// List Users Query Parameters Schema
export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.enum([
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.BROKERAGE_OWNER,
    USER_ROLES.TEAM_LEAD,
    USER_ROLES.AGENT,
    USER_ROLES.LEAD,
  ]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'role', 'createdAt', 'lastActiveAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
