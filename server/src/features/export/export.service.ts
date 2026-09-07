import { Contact } from '../../models/Contact.js'
import { Deal } from '../../models/Deal.js'
import { Commission } from '../../models/Commission.js'
import { IUser } from '../../models/User.js'
import { formatAsCSV } from '../../utils/exportHelper.js'

export const getExportContactsData = async (user: IUser) => {
  const contacts = await Contact.find({
    brokerageId: user.brokerageId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean()

  const columns = [
    { header: 'ID', key: '_id' },
    { header: 'First Name', key: 'firstName' },
    { header: 'Last Name', key: 'lastName' },
    { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' },
    { header: 'Status', key: 'status' },
    { header: 'Lead Source', key: 'leadSource' },
    { header: 'City', key: 'city' },
    { header: 'Created Date', key: 'createdAt' },
  ]

  const csvContent = formatAsCSV(
    contacts.map((c) => ({
      ...c,
      _id: c._id.toString(),
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '',
    })),
    columns
  )

  const pdfHeaders = ['Name', 'Email', 'Phone', 'Status', 'Lead Source', 'City']
  const pdfRows = contacts.map((c) => [
    `${c.firstName || ''} ${c.lastName || ''}`.trim(),
    c.email || '',
    c.phone || '',
    c.status || '',
    c.leadSource || '',
    c.city || '',
  ])

  return { csvContent, pdfHeaders, pdfRows }
}

export const getExportDealsData = async (user: IUser) => {
  const deals = await Deal.find({
    brokerageId: user.brokerageId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean()

  const columns = [
    { header: 'ID', key: '_id' },
    { header: 'Contact Name', key: 'contactName' },
    { header: 'Property Address', key: 'propertyAddress' },
    { header: 'Deal Value', key: 'dealValue' },
    { header: 'Priority', key: 'priority' },
    { header: 'Stage Entered At', key: 'stageEnteredAt' },
    { header: 'Created Date', key: 'createdAt' },
  ]

  const csvContent = formatAsCSV(
    deals.map((d) => ({
      ...d,
      _id: d._id.toString(),
      stageEnteredAt: d.stageEnteredAt ? new Date(d.stageEnteredAt).toISOString().split('T')[0] : '',
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : '',
    })),
    columns
  )

  const pdfHeaders = ['Contact', 'Property Address', 'Deal Value', 'Priority', 'Stage Entered']
  const pdfRows = deals.map((d) => [
    d.contactName || '',
    d.propertyAddress || '',
    `$${(d.dealValue || 0).toLocaleString()}`,
    d.priority || '',
    d.stageEnteredAt ? new Date(d.stageEnteredAt).toISOString().split('T')[0] : 'N/A',
  ])

  return { csvContent, pdfHeaders, pdfRows }
}

export const getExportCommissionsData = async (user: IUser) => {
  const commissions = await Commission.find({
    brokerageId: user.brokerageId,
  })
    .sort({ createdAt: -1 })
    .lean()

  const columns = [
    { header: 'ID', key: '_id' },
    { header: 'Agent Name', key: 'agentName' },
    { header: 'Gross Commission', key: 'grossCommission' },
    { header: 'Agent Split (%)', key: 'splitPercentAgent' },
    { header: 'Agent Net Payout', key: 'agentNetPayout' },
    { header: 'Brokerage Net Profit', key: 'brokerageNetProfit' },
    { header: 'Status', key: 'status' },
    { header: 'Created Date', key: 'createdAt' },
  ]

  const csvContent = formatAsCSV(
    commissions.map((c) => ({
      ...c,
      _id: c._id.toString(),
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '',
    })),
    columns
  )

  const pdfHeaders = ['Agent', 'Gross Commission', 'Agent Split', 'Agent Net Payout', 'Status']
  const pdfRows = commissions.map((c) => [
    c.agentName || '',
    `$${(c.grossCommission || 0).toLocaleString()}`,
    `${c.splitPercentAgent || 0}%`,
    `$${(c.agentNetPayout || 0).toLocaleString()}`,
    c.status || '',
  ])

  return { csvContent, pdfHeaders, pdfRows }
}
