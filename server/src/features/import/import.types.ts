export type ImportTargetEntityType = 'contacts' | 'deals' | 'properties'

export interface CSVPreviewResponse {
  headers: string[]
  sampleRows: Record<string, string>[]
  totalRowsEstimate: number
  suggestedMapping: Record<string, string> // csvHeader -> targetField
}

export interface CSVConfirmImportPayload {
  entityType: ImportTargetEntityType
  mapping: Record<string, string> // csvHeader -> targetField
  csvContent?: string // Raw CSV string or previous parsed rows
  rows?: Record<string, string>[]
}

export interface CSVImportResult {
  insertedCount: number
  updatedCount: number
  failedCount: number
  errors: Array<{ row: number; error: string }>
}
