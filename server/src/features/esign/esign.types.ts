export type SignerRole = 'buyer' | 'seller' | 'agent' | 'broker' | 'witness'
export type EnvelopeStatus = 'draft' | 'sent' | 'viewed' | 'partially_signed' | 'completed' | 'declined' | 'voided'
export type FieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox'

export interface SignerInput {
  name: string
  email: string
  role?: SignerRole
}

export interface FieldInput {
  id?: string
  type: FieldType
  signerEmail: string
  page: number
  x: number
  y: number
  width?: number
  height?: number
  required?: boolean
  label?: string
  value?: string
}

export interface PrepareEnvelopeInput {
  transactionId?: string
  dealId?: string
  title: string
  documentUrl: string
  fileName: string
  fileSize?: number
  pageCount?: number
  signers: SignerInput[]
  fields: FieldInput[]
  sendImmediately?: boolean
}

export interface SignerDto {
  id: string
  name: string
  email: string
  role: SignerRole
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined'
  signToken: string
  signingUrl?: string
  viewedAt?: string
  signedAt?: string
  signatureData?: string
  declineReason?: string
}

export interface FieldDto {
  id: string
  type: FieldType
  signerEmail: string
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  label: string
  value?: string
}

export interface AuditTrailDto {
  id: string
  action: 'created' | 'sent' | 'viewed' | 'signed' | 'declined' | 'completed' | 'voided'
  timestamp: string
  performerEmail: string
  performerName: string
  ipAddress?: string
  userAgent?: string
  details?: string
}

export interface EnvelopeDto {
  id: string
  brokerageId: string
  transactionId?: string
  dealId?: string
  title: string
  documentUrl: string
  fileName: string
  fileSize: number
  pageCount: number
  signers: SignerDto[]
  fields: FieldDto[]
  status: EnvelopeStatus
  auditTrail: AuditTrailDto[]
  certificateHash?: string
  completedAt?: string
  expiresAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PublicSigningSessionDto {
  envelopeId: string
  title: string
  documentUrl: string
  fileName: string
  pageCount: number
  status: EnvelopeStatus
  signer: {
    id: string
    name: string
    email: string
    role: SignerRole
    status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined'
  }
  assignedFields: FieldDto[]
  allFields: FieldDto[]
  brokerageName?: string
  completedAt?: string
  certificateHash?: string
}

export interface SubmitSignatureInput {
  signatureData: string // base64 PNG, SVG, or stylized typed signature string
  fields: Array<{
    fieldId: string
    value: string
  }>
}

export interface EnvelopeQueryParams {
  transactionId?: string
  dealId?: string
  status?: string
  page?: number
  limit?: number
}
