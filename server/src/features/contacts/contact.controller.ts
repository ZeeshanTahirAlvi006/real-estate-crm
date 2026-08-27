import { Request, Response, NextFunction } from 'express'
import {
  listContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  addContactNote,
  getContactActivities,
  bulkUpdateContacts,
} from './contact.service.js'
import { sendSuccess, sendPaginated } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

// GET /api/contacts
export const getContacts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { contacts, total } = await listContacts(req.query, req.user, req.tenantFilter || {})
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25
    sendPaginated(res, contacts, total, page, limit, 'Contacts retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// GET /api/contacts/:id
export const getContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const contact = await getContactById(id, req.user)
    sendSuccess(res, contact, 'Contact retrieved successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// Helper to extract IP and user-agent
const getClientMeta = (req: Request) => ({
  clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
  userAgent: req.headers['user-agent'] || 'browser',
})

// POST /api/contacts
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const created = await createContact(req.body, req.user, clientIp, userAgent)
    sendSuccess(res, created, 'Contact created successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/contacts/:id
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const { clientIp, userAgent } = getClientMeta(req)
    const updated = await updateContact(id, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, updated, 'Contact updated successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// DELETE /api/contacts/:id
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const { clientIp, userAgent } = getClientMeta(req)
    await deleteContact(id, req.user, clientIp, userAgent)
    sendSuccess(res, null, 'Contact archived successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/contacts/:id/notes
export const addNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const { clientIp, userAgent } = getClientMeta(req)
    const activity = await addContactNote(id, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, activity, 'Note added successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// GET /api/contacts/:id/activities
export const getActivities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25
    const { activities, total } = await getContactActivities(id, req.user, page, limit)
    sendPaginated(res, activities, total, page, limit, 'Activities retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// PATCH /api/contacts/bulk
export const bulkAction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await bulkUpdateContacts(req.body, req.user, clientIp, userAgent)
    sendSuccess(res, result, `Bulk action applied to ${result.updatedCount} contact(s)`, HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}
