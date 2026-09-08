import { Request, Response, NextFunction } from 'express'
import {
  getExportContactsData,
  getExportDealsData,
  getExportCommissionsData,
} from './export.service.js'
import { streamPdfReport } from '../../utils/exportHelper.js'

// GET /api/export/contacts?format=csv|pdf
export const exportContacts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const format = ((req.query.format as string) || 'csv').toLowerCase()
    const { csvContent, pdfHeaders, pdfRows } = await getExportContactsData(req.user)

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="contacts_report.pdf"')
      streamPdfReport(res, 'Contacts Export Report', pdfHeaders, pdfRows)
      return
    }

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="contacts_export.csv"')
    res.status(200).send(csvContent)
  } catch (error) {
    next(error)
  }
}

// GET /api/export/deals?format=csv|pdf
export const exportDeals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const format = ((req.query.format as string) || 'csv').toLowerCase()
    const { csvContent, pdfHeaders, pdfRows } = await getExportDealsData(req.user)

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="deals_report.pdf"')
      streamPdfReport(res, 'Deals Pipeline Export Report', pdfHeaders, pdfRows)
      return
    }

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="deals_export.csv"')
    res.status(200).send(csvContent)
  } catch (error) {
    next(error)
  }
}

// GET /api/export/commissions?format=csv|pdf
export const exportCommissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const format = ((req.query.format as string) || 'csv').toLowerCase()
    const { csvContent, pdfHeaders, pdfRows } = await getExportCommissionsData(req.user)

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="commissions_report.pdf"')
      streamPdfReport(res, 'Brokerage Commission Ledger Report', pdfHeaders, pdfRows)
      return
    }

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="commissions_export.csv"')
    res.status(200).send(csvContent)
  } catch (error) {
    next(error)
  }
}
