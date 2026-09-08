import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { User, IUser } from '../../src/models/User.js'
import { Brokerage, IBrokerage } from '../../src/models/Brokerage.js'
import { Contact, IContact } from '../../src/models/Contact.js'
import { env } from '../../src/config/env.js'
import { USER_ROLES, UserRole } from '../../src/utils/constants.js'

export const createTestBrokerage = async (overrides: Partial<IBrokerage> = {}): Promise<IBrokerage> => {
  const brokerage = await Brokerage.create({
    name: overrides.name || `Apex Test Realty ${Date.now()}`,
    slug: overrides.slug || `apex-test-${Date.now()}`,
    address: {
      street: '100 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      country: 'USA',
    },
    billingEmail: `billing-${Date.now()}@example.com`,
    subscriptionTier: 'enterprise',
    status: 'active',
    ...overrides,
  })
  return brokerage
}

export const createTestUser = async (
  brokerageId: mongoose.Types.ObjectId,
  role: UserRole = UserRole.AGENT,
  overrides: Partial<IUser> = {}
): Promise<{ user: IUser; rawPassword: string; token: string }> => {
  const rawPassword = 'Password123!'
  const hashedPassword = await bcrypt.hash(rawPassword, 10)
  const email = overrides.email || `agent-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`

  const user = await User.create({
    brokerageId,
    email,
    password: hashedPassword,
    firstName: overrides.firstName || 'Alex',
    lastName: overrides.lastName || 'Realtor',
    role,
    isActive: true,
    phone: '+15551234567',
    ...overrides,
  })

  const token = jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      brokerageId: brokerageId.toString(),
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  )

  return { user, rawPassword, token }
}

export const createTestContact = async (
  brokerageId: mongoose.Types.ObjectId,
  assignedAgentId?: mongoose.Types.ObjectId,
  overrides: Partial<IContact> = {}
): Promise<IContact> => {
  const contact = await Contact.create({
    brokerageId,
    assignedAgentId,
    firstName: overrides.firstName || 'Sarah',
    lastName: overrides.lastName || 'Connor',
    email: overrides.email || `buyer-${Date.now()}@example.com`,
    phone: overrides.phone || '+15559876543',
    leadSource: 'Zillow',
    leadScore: 75,
    status: 'active',
    dncStatus: overrides.dncStatus || 'clean',
    tcpaConsent: {
      sms: true,
      call: true,
      whatsapp: true,
      email: true,
      doubleOptInVerified: false,
      consentSource: 'web_form',
      consentDate: new Date(),
    },
    ...overrides,
  })
  return contact
}
