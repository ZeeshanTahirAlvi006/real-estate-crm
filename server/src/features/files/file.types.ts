import { IUploadedFile } from '../../models/UploadedFile.js'

export interface UploadFileResponse {
  id: string
  originalName: string
  url: string
  mimeType: string
  size: number
  provider: 'local' | 's3'
  createdAt: Date
}

export interface ListFilesQuery {
  page?: number
  limit?: number
  mimeType?: string
}

export interface ListFilesResult {
  files: IUploadedFile[]
  total: number
}
