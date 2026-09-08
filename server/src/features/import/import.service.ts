import { parse } from 'csv-parse/sync'
import { Contact } from '../../models/Contact.js'
import { Property } from '../../models/Property.js'
import { Deal } from '../../models/Deal.js'
import { IUser } from '../../models/User.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import {
  CSVPreviewResponse,
  CSVConfirmImportPayload,
  CSVImportResult,
} from './import.types.js'

// Known common headers mapping to schema keys
const CONTACT_FIELD_MAP: Record<string, string> = {
  'first name': 'firstName',
  firstname: 'firstName',
  'last name': 'lastName',
  lastname: 'lastName',
  name: 'firstName',
  email: 'email',
  phone: 'phone',
  mobile: 'phone',
  city: 'city',
  address: 'address',
}

const PROPERTY_FIELD_MAP: Record<string, string> = {
  title: 'title',
  address: 'address',
  city: 'city',
  price: 'price',
  beds: 'bedrooms',
  bedrooms: 'bedrooms',
  baths: 'bathrooms',
  bathrooms: 'bathrooms',
  sqft: 'areaSqFt',
  type: 'propertyType',
  status: 'status',
}

const DEAL_FIELD_MAP: Record<string, string> = {
  title: 'title',
  name: 'title',
  value: 'dealValue',
  amount: 'dealValue',
}

export const previewCsvFile = (csvBuffer: Buffer): CSVPreviewResponse => {
  const content = csvBuffer.toString('utf-8')
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[]

  if (!records || records.length === 0) {
    throw new AppError('CSV file is empty or invalid format', HTTP_STATUS.BAD_REQUEST)
  }

  const headers = Object.keys(records[0])
  const sampleRows = records.slice(0, 5)

  // Auto-detect mappings for Contacts by default
  const suggestedMapping: Record<string, string> = {}
  for (const header of headers) {
    const normalized = header.toLowerCase().trim()
    if (CONTACT_FIELD_MAP[normalized]) {
      suggestedMapping[header] = CONTACT_FIELD_MAP[normalized]
    } else if (PROPERTY_FIELD_MAP[normalized]) {
      suggestedMapping[header] = PROPERTY_FIELD_MAP[normalized]
    } else if (DEAL_FIELD_MAP[normalized]) {
      suggestedMapping[header] = DEAL_FIELD_MAP[normalized]
    }
  }

  return {
    headers,
    sampleRows,
    totalRowsEstimate: records.length,
    suggestedMapping,
  }
}

export const executeCsvImport = async (
  payload: CSVConfirmImportPayload,
  user: IUser,
  fileBuffer?: Buffer
): Promise<CSVImportResult> => {
  let records: Record<string, string>[] = []

  if (payload.rows && payload.rows.length > 0) {
    records = payload.rows
  } else if (fileBuffer) {
    records = parse(fileBuffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[]
  } else if (payload.csvContent) {
    records = parse(payload.csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[]
  } else {
    throw new AppError('No CSV data or file provided for import execution', HTTP_STATUS.BAD_REQUEST)
  }

  const { entityType, mapping } = payload
  let insertedCount = 0
  let updatedCount = 0
  let failedCount = 0
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < records.length; i++) {
    const rawRow = records[i]
    const rowNum = i + 1

    try {
      const mappedObject: Record<string, unknown> = {}
      for (const [csvHeader, targetField] of Object.entries(mapping)) {
        if (rawRow[csvHeader] !== undefined && targetField) {
          mappedObject[targetField] = rawRow[csvHeader]
        }
      }

      if (entityType === 'contacts') {
        const email = mappedObject.email as string
        const phone = mappedObject.phone as string
        const firstName = (mappedObject.firstName as string) || 'Imported'
        const lastName = (mappedObject.lastName as string) || 'Contact'

        if (!email && !phone) {
          errors.push({ row: rowNum, error: 'Row missing both email and phone number' })
          failedCount++
          continue
        }

        const query: Record<string, unknown> = { brokerageId: user.brokerageId, isDeleted: false }
        if (email) query.email = email
        else if (phone) query.phone = phone

        const existing = await Contact.findOne(query)

        if (existing) {
          Object.assign(existing, mappedObject)
          await existing.save()
          updatedCount++
        } else {
          await Contact.create({
            brokerageId: user.brokerageId,
            assignedAgentId: user._id,
            firstName,
            lastName,
            email: email || '',
            phone: phone || '',
            leadSource: (mappedObject.leadSource as string) || 'CSV Import',
            ...mappedObject,
          })
          insertedCount++
        }
      } else if (entityType === 'properties') {
        const title = (mappedObject.title as string) || (mappedObject.address as string) || `Imported Property ${rowNum}`
        await Property.create({
          brokerageId: user.brokerageId,
          title,
          propertyType: mappedObject.propertyType || 'residential',
          status: mappedObject.status || 'active',
          price: Number(mappedObject.price) || 0,
          createdBy: user._id,
          ...mappedObject,
        })
        insertedCount++
      } else if (entityType === 'deals') {
        const contactName = (mappedObject.contactName as string) || 'Imported Contact'
        const propertyAddress = (mappedObject.propertyAddress as string) || 'Imported Address'
        const agentName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Agent'
        await Deal.create({
          brokerageId: user.brokerageId,
          assignedAgentId: user._id,
          assignedAgentName: agentName,
          contactName,
          propertyAddress,
          dealValue: Number(mappedObject.dealValue) || 0,
          createdBy: user._id,
          ...mappedObject,
        })
        insertedCount++
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown validation error'
      errors.push({ row: rowNum, error: msg })
      failedCount++
    }
  }

  return {
    insertedCount,
    updatedCount,
    failedCount,
    errors,
  }
}
