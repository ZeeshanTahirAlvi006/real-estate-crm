import { UploadedFile, IUploadedFile } from '../../models/UploadedFile.js'
import { FileStorageService } from '../../utils/fileUpload.js'
import { IUser } from '../../models/User.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { ListFilesQuery, ListFilesResult } from './file.types.js'

export const uploadSingleFile = async (
  file: Express.Multer.File,
  user: IUser,
  folder: string = 'documents'
): Promise<IUploadedFile> => {
  if (!file) {
    throw new AppError('No file provided in request', HTTP_STATUS.BAD_REQUEST)
  }

  // 1. Upload via file storage abstraction
  const { storageKey, url, provider } = await FileStorageService.saveFile(
    file.buffer,
    file.originalname,
    file.mimetype,
    folder
  )

  // 2. Persist record in UploadedFile model
  const uploadedFile = await UploadedFile.create({
    brokerageId: user.brokerageId,
    uploadedBy: user._id,
    originalName: file.originalname,
    storageKey,
    url,
    mimeType: file.mimetype,
    size: file.size,
    provider,
    isDeleted: false,
  })

  return uploadedFile
}

export const uploadMultipleFiles = async (
  files: Express.Multer.File[],
  user: IUser,
  folder: string = 'documents'
): Promise<IUploadedFile[]> => {
  if (!files || files.length === 0) {
    throw new AppError('No files provided in request', HTTP_STATUS.BAD_REQUEST)
  }

  const results: IUploadedFile[] = []
  for (const file of files) {
    const uploaded = await uploadSingleFile(file, user, folder)
    results.push(uploaded)
  }

  return results
}

export const listBrokerageFiles = async (
  query: ListFilesQuery,
  user: IUser
): Promise<ListFilesResult> => {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25))
  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = {
    brokerageId: user.brokerageId,
    isDeleted: false,
  }

  if (query.mimeType) {
    filter.mimeType = new RegExp(query.mimeType, 'i')
  }

  const [files, total] = await Promise.all([
    UploadedFile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    UploadedFile.countDocuments(filter),
  ])

  return { files, total }
}

export const deleteBrokerageFile = async (
  fileId: string,
  user: IUser
): Promise<void> => {
  const file = await UploadedFile.findOne({
    _id: fileId,
    brokerageId: user.brokerageId,
    isDeleted: false,
  })

  if (!file) {
    throw new AppError('File not found or already deleted', HTTP_STATUS.NOT_FOUND)
  }

  // Soft delete in database
  file.isDeleted = true
  await file.save()

  // Remove physical storage entry asynchronously
  FileStorageService.deleteFile(file.storageKey, file.provider)
}
