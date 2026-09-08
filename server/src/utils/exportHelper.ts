import PDFDocument from 'pdfkit'
import { Response } from 'express'

/**
 * Format an array of objects into a sanitized CSV string
 */
export const formatAsCSV = (
  data: Record<string, unknown>[],
  columns: Array<{ header: string; key: string }>
): string => {
  if (!data || data.length === 0) {
    return columns.map((c) => `"${c.header}"`).join(',') + '\n'
  }

  const headerRow = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',')

  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        const rawVal: unknown = row[col.key]
        let val = ''
        if (rawVal !== null && rawVal !== undefined) {
          if (typeof rawVal === 'object') {
            val = JSON.stringify(rawVal)
          } else {
            val = String(rawVal)
          }
        }
        // Escape quotes and wrap in double quotes
        return `"${val.replace(/"/g, '""')}"`
      })
      .join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Streams a generated PDF document directly into an Express Response object using PDFKit
 */
export const streamPdfReport = (
  res: Response,
  title: string,
  headers: string[],
  rows: string[][]
): void => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' })

  // Stream directly to response
  doc.pipe(res)

  // Document Title & Header Banner
  doc.fillColor('#1e293b').fontSize(20).text(title, { align: 'center' })
  doc.fontSize(10).fillColor('#64748b').text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' })
  doc.moveDown(1.5)

  // Simple Table Layout
  const startX = 30
  let startY = doc.y
  const colWidth = Math.floor((doc.page.width - 60) / headers.length)

  // Header Row
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
  headers.forEach((header, index) => {
    doc.text(header.toUpperCase(), startX + index * colWidth, startY, {
      width: colWidth - 5,
      align: 'left',
    })
  })

  doc.moveDown(0.5)
  doc
    .moveTo(startX, doc.y)
    .lineTo(doc.page.width - 30, doc.y)
    .strokeColor('#cbd5e1')
    .stroke()
  doc.moveDown(0.5)

  // Data Rows
  doc.font('Helvetica').fontSize(8).fillColor('#334155')
  rows.forEach((row) => {
    if (doc.y > doc.page.height - 50) {
      doc.addPage()
      startY = 40
      doc.y = startY
    }

    const currentY = doc.y
    row.forEach((cell, index) => {
      doc.text(String(cell || ''), startX + index * colWidth, currentY, {
        width: colWidth - 5,
        align: 'left',
      })
    })

    doc.moveDown(0.6)
  })

  // Footer
  doc.moveDown(2)
  doc
    .fontSize(8)
    .fillColor('#94a3b8')
    .text('PropPulse OS — Confidential Enterprise Real Estate CRM Report', { align: 'center' })

  doc.end()
}
