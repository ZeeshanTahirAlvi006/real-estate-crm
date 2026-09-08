export type ExportFormat = 'csv' | 'pdf'

export interface ExportQuery {
  format?: ExportFormat
  startDate?: string
  endDate?: string
  status?: string
}
