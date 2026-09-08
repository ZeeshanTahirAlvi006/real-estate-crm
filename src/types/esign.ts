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

export interface ESignSigner {
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
  ipAddress?: string
  userAgent?: string
  declineReason?: string
}

export interface ESignField {
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

export interface ESignAuditItem {
  id: string
  action: 'created' | 'sent' | 'viewed' | 'signed' | 'declined' | 'completed' | 'voided'
  timestamp: string
  performerEmail: string
  performerName: string
  ipAddress?: string
  userAgent?: string
  details?: string
}

export interface ESignEnvelope {
  id: string
  brokerageId: string
  transactionId?: string
  dealId?: string
  title: string
  documentUrl: string
  fileName: string
  fileSize: number
  pageCount: number
  signers: ESignSigner[]
  fields: ESignField[]
  status: EnvelopeStatus
  auditTrail: ESignAuditItem[]
  certificateHash?: string
  completedAt?: string
  expiresAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PublicSigningSession {
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
  assignedFields: ESignField[]
  allFields: ESignField[]
  brokerageName?: string
  completedAt?: string
  certificateHash?: string
}

export interface SubmitSignaturePayload {
  signatureData: string
  fields: Array<{
    fieldId: string
    value: string
  }>
}

export interface ESignContractTemplate {
  id: string
  title: string
  description: string
  category: 'purchase' | 'agency' | 'disclosure' | 'lease'
  pageCount: number
  documentUrl: string
  defaultSigners: Array<{ role: 'buyer' | 'seller' | 'agent' | 'broker'; label: string }>
  defaultFields: Array<{
    type: 'signature' | 'initials' | 'date' | 'text'
    role: 'buyer' | 'seller' | 'agent' | 'broker'
    page: number
    x: number
    y: number
    width: number
    height: number
    required: boolean
    label: string
  }>
}
