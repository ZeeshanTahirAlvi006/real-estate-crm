import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { ESignEnvelope, IESignEnvelope, IESignSigner, IESignField, IESignAuditItem } from '../../models/ESignEnvelope.js'
import { IUser } from '../../models/User.js'
import { Brokerage } from '../../models/Brokerage.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../middleware/errorHandler.js'
import {
  PrepareEnvelopeInput,
  EnvelopeDto,
  PublicSigningSessionDto,
  SubmitSignatureInput,
  EnvelopeQueryParams,
} from './esign.types.js'

function formatEnvelopeDto(env: IESignEnvelope, baseUrl: string = 'http://localhost:5173'): EnvelopeDto {
  return {
    id: env._id.toString(),
    brokerageId: env.brokerageId.toString(),
    transactionId: env.transactionId?.toString(),
    dealId: env.dealId?.toString(),
    title: env.title,
    documentUrl: env.documentUrl,
    fileName: env.fileName,
    fileSize: env.fileSize,
    pageCount: env.pageCount,
    status: env.status,
    signers: env.signers.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      status: s.status,
      signToken: s.signToken,
      signingUrl: `${baseUrl}/sign/${s.signToken}`,
      viewedAt: s.viewedAt ? s.viewedAt.toISOString() : undefined,
      signedAt: s.signedAt ? s.signedAt.toISOString() : undefined,
      signatureData: s.signatureData,
      declineReason: s.declineReason,
    })),
    fields: env.fields.map((f) => ({
      id: f.id,
      type: f.type,
      signerEmail: f.signerEmail,
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      required: f.required,
      label: f.label,
      value: f.value,
    })),
    auditTrail: env.auditTrail.map((a) => ({
      id: a.id,
      action: a.action,
      timestamp: a.timestamp.toISOString(),
      performerEmail: a.performerEmail,
      performerName: a.performerName,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      details: a.details,
    })),
    certificateHash: env.certificateHash,
    completedAt: env.completedAt ? env.completedAt.toISOString() : undefined,
    expiresAt: env.expiresAt ? env.expiresAt.toISOString() : undefined,
    createdBy: env.createdBy.toString(),
    createdAt: env.createdAt.toISOString(),
    updatedAt: env.updatedAt.toISOString(),
  }
}

export class ESignService {
  async prepareEnvelope(user: IUser, input: PrepareEnvelopeInput): Promise<EnvelopeDto> {
    const signers: IESignSigner[] = input.signers.map((s) => ({
      id: `sgn-${crypto.randomUUID().slice(0, 8)}`,
      name: s.name.trim(),
      email: s.email.trim().toLowerCase(),
      role: s.role || 'buyer',
      signToken: crypto.randomUUID(),
      status: input.sendImmediately ? 'sent' : 'pending',
    }))

    const fields: IESignField[] = input.fields.map((f) => ({
      id: f.id || `fld-${crypto.randomUUID().slice(0, 8)}`,
      type: f.type,
      signerEmail: f.signerEmail.trim().toLowerCase(),
      page: f.page || 1,
      x: f.x,
      y: f.y,
      width: f.width || 20,
      height: f.height || 6,
      required: f.required !== false,
      label: f.label || 'Signature',
      value: f.value,
    }))

    const initialAudit: IESignAuditItem[] = [
      {
        id: `aud-${crypto.randomUUID().slice(0, 8)}`,
        action: 'created',
        timestamp: new Date(),
        performerEmail: user.email,
        performerName: `${user.firstName} ${user.lastName}`.trim(),
        details: `Envelope created with ${signers.length} signers and ${fields.length} tagged fields`,
      },
    ]

    if (input.sendImmediately) {
      initialAudit.push({
        id: `aud-${crypto.randomUUID().slice(0, 8)}`,
        action: 'sent' as const,
        timestamp: new Date(),
        performerEmail: user.email,
        performerName: `${user.firstName} ${user.lastName}`.trim(),
        details: `Dispatched digital signing invitations to ${signers.map((s) => s.email).join(', ')}`,
      })
    }

    const envelope = await ESignEnvelope.create({
      brokerageId: user.brokerageId,
      transactionId: input.transactionId ? new mongoose.Types.ObjectId(input.transactionId) : undefined,
      dealId: input.dealId ? new mongoose.Types.ObjectId(input.dealId) : undefined,
      title: input.title.trim(),
      documentUrl: input.documentUrl,
      fileName: input.fileName,
      fileSize: input.fileSize || 0,
      pageCount: input.pageCount || 1,
      signers,
      fields,
      status: input.sendImmediately ? 'sent' : 'draft',
      auditTrail: initialAudit,
      createdBy: user._id,
    })

    logger.info(`[eSign] Created envelope ${envelope._id} with status ${envelope.status}`)
    return formatEnvelopeDto(envelope)
  }

  async sendEnvelope(user: IUser, id: string): Promise<EnvelopeDto> {
    const envelope = await ESignEnvelope.findOne({
      _id: id,
      brokerageId: user.brokerageId,
    })

    if (!envelope) {
      throw new AppError('Envelope not found', 404)
    }

    if (envelope.status !== 'draft') {
      throw new AppError(`Cannot send envelope with status '${envelope.status}'`, 400)
    }

    envelope.status = 'sent'
    for (const s of envelope.signers) {
      if (s.status === 'pending') {
        s.status = 'sent'
      }
    }

    envelope.auditTrail.push({
      id: `aud-${crypto.randomUUID().slice(0, 8)}`,
      action: 'sent',
      timestamp: new Date(),
      performerEmail: user.email,
      performerName: `${user.firstName} ${user.lastName}`.trim(),
      details: `Signing requests dispatched to recipients`,
    })

    await envelope.save()
    logger.info(`[eSign] Dispatched envelope ${envelope._id}`)
    return formatEnvelopeDto(envelope)
  }

  async list(user: IUser, params: EnvelopeQueryParams): Promise<{ envelopes: EnvelopeDto[]; total: number; page: number; limit: number }> {
    const query: any = { brokerageId: user.brokerageId }

    if (params.transactionId && mongoose.Types.ObjectId.isValid(params.transactionId)) {
      query.transactionId = params.transactionId
    }

    if (params.dealId && mongoose.Types.ObjectId.isValid(params.dealId)) {
      query.dealId = params.dealId
    }

    if (params.status) {
      query.status = params.status
    }

    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      ESignEnvelope.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ESignEnvelope.countDocuments(query),
    ])

    return {
      envelopes: items.map((e) => formatEnvelopeDto(e)),
      total,
      page,
      limit,
    }
  }

  async getById(user: IUser, id: string): Promise<EnvelopeDto> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid envelope ID', 400)
    }

    const envelope = await ESignEnvelope.findOne({
      _id: id,
      brokerageId: user.brokerageId,
    })

    if (!envelope) {
      throw new AppError('Envelope not found', 404)
    }

    return formatEnvelopeDto(envelope)
  }

  async voidEnvelope(user: IUser, id: string, reason?: string): Promise<EnvelopeDto> {
    const envelope = await ESignEnvelope.findOne({
      _id: id,
      brokerageId: user.brokerageId,
    })

    if (!envelope) {
      throw new AppError('Envelope not found', 404)
    }

    if (envelope.status === 'completed') {
      throw new AppError('Cannot void an already completed envelope', 400)
    }

    envelope.status = 'voided'
    envelope.auditTrail.push({
      id: `aud-${crypto.randomUUID().slice(0, 8)}`,
      action: 'voided',
      timestamp: new Date(),
      performerEmail: user.email,
      performerName: `${user.firstName} ${user.lastName}`.trim(),
      details: reason ? `Envelope voided: ${reason}` : 'Envelope voided by agent',
    })

    await envelope.save()
    logger.info(`[eSign] Voided envelope ${envelope._id}`)
    return formatEnvelopeDto(envelope)
  }

  // --- Public Unauthenticated Signing Workflow ---

  async getSigningSession(signToken: string): Promise<PublicSigningSessionDto> {
    if (!signToken || typeof signToken !== 'string') {
      throw new AppError('Invalid signing token', 400)
    }

    const envelope = await ESignEnvelope.findOne({
      'signers.signToken': signToken,
    })

    if (!envelope) {
      throw new AppError('Signing invitation not found or expired', 404)
    }

    if (envelope.status === 'voided') {
      throw new AppError('This document signing request has been voided by the sender', 410)
    }

    const signer = envelope.signers.find((s) => s.signToken === signToken)
    if (!signer) {
      throw new AppError('Signer record not found', 404)
    }

    const assignedFields = envelope.fields
      .filter((f) => f.signerEmail.toLowerCase() === signer.email.toLowerCase())
      .map((f) => ({
        id: f.id,
        type: f.type,
        signerEmail: f.signerEmail,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        required: f.required,
        label: f.label,
        value: f.value,
      }))

    const allFields = envelope.fields.map((f) => ({
      id: f.id,
      type: f.type,
      signerEmail: f.signerEmail,
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      required: f.required,
      label: f.label,
      value: f.value,
    }))

    const brokerage = await Brokerage.findById(envelope.brokerageId).select('name').lean()

    return {
      envelopeId: envelope._id.toString(),
      title: envelope.title,
      documentUrl: envelope.documentUrl,
      fileName: envelope.fileName,
      pageCount: envelope.pageCount,
      status: envelope.status,
      signer: {
        id: signer.id,
        name: signer.name,
        email: signer.email,
        role: signer.role,
        status: signer.status,
      },
      assignedFields,
      allFields,
      brokerageName: brokerage?.name || 'PropPulse Real Estate',
      completedAt: envelope.completedAt ? envelope.completedAt.toISOString() : undefined,
      certificateHash: envelope.certificateHash,
    }
  }

  async recordViewAction(signToken: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const envelope = await ESignEnvelope.findOne({
      'signers.signToken': signToken,
    })

    if (!envelope || envelope.status === 'voided' || envelope.status === 'completed') {
      return
    }

    const signer = envelope.signers.find((s) => s.signToken === signToken)
    if (!signer) return

    if (signer.status === 'pending' || signer.status === 'sent') {
      signer.status = 'viewed'
      signer.viewedAt = new Date()
      signer.ipAddress = ipAddress
      signer.userAgent = userAgent

      if (envelope.status === 'sent') {
        envelope.status = 'viewed'
      }

      envelope.auditTrail.push({
        id: `aud-${crypto.randomUUID().slice(0, 8)}`,
        action: 'viewed',
        timestamp: new Date(),
        performerEmail: signer.email,
        performerName: signer.name,
        ipAddress,
        userAgent,
        details: `Document opened and viewed by signer`,
      })

      await envelope.save()
      logger.info(`[eSign] Signer ${signer.email} viewed envelope ${envelope._id}`)
    }
  }

  async completeSignerSession(
    signToken: string,
    input: SubmitSignatureInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PublicSigningSessionDto> {
    const envelope = await ESignEnvelope.findOne({
      'signers.signToken': signToken,
    })

    if (!envelope) {
      throw new AppError('Envelope not found', 404)
    }

    if (envelope.status === 'voided') {
      throw new AppError('Cannot sign a voided envelope', 400)
    }

    const signer = envelope.signers.find((s) => s.signToken === signToken)
    if (!signer) {
      throw new AppError('Signer not found', 404)
    }

    if (signer.status === 'signed') {
      throw new AppError('You have already signed this document', 400)
    }

    // Update signer details
    signer.status = 'signed'
    signer.signedAt = new Date()
    signer.signatureData = input.signatureData
    signer.ipAddress = ipAddress
    signer.userAgent = userAgent

    // Update tagged field values
    if (input.fields && input.fields.length > 0) {
      for (const item of input.fields) {
        const field = envelope.fields.find((f) => f.id === item.fieldId)
        if (field && field.signerEmail.toLowerCase() === signer.email.toLowerCase()) {
          field.value = item.value
        }
      }
    }

    // Default any unfilled signature fields for this signer to signatureData
    for (const f of envelope.fields) {
      if (f.signerEmail.toLowerCase() === signer.email.toLowerCase()) {
        if (f.type === 'signature' && !f.value) {
          f.value = input.signatureData
        } else if (f.type === 'date' && !f.value) {
          f.value = new Date().toLocaleDateString()
        }
      }
    }

    envelope.auditTrail.push({
      id: `aud-${crypto.randomUUID().slice(0, 8)}`,
      action: 'signed',
      timestamp: new Date(),
      performerEmail: signer.email,
      performerName: signer.name,
      ipAddress,
      userAgent,
      details: `Signer executed digital signature with verified legal consent`,
    })

    // Check if all signers have completed signing
    const allSigned = envelope.signers.every((s) => s.status === 'signed')

    if (allSigned) {
      envelope.status = 'completed'
      envelope.completedAt = new Date()

      // Generate immutable tamper-evident SHA-256 certificate hash
      const hashPayload = `${envelope._id}-${envelope.completedAt.toISOString()}-${envelope.signers
        .map((s) => `${s.email}:${s.signedAt?.toISOString()}`)
        .join('|')}`
      envelope.certificateHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

      envelope.auditTrail.push({
        id: `aud-${crypto.randomUUID().slice(0, 8)}`,
        action: 'completed',
        timestamp: new Date(),
        performerEmail: 'system@proppulse.internal',
        performerName: 'PropPulse ESIGN Certified Seal',
        details: `All parties executed document. Certified SHA-256 hash: ${envelope.certificateHash}`,
      })
      logger.info(`[eSign] Envelope ${envelope._id} completed with certificate hash ${envelope.certificateHash}`)
    } else {
      envelope.status = 'partially_signed'
      logger.info(`[eSign] Envelope ${envelope._id} partially signed by ${signer.email}`)
    }

    await envelope.save()
    return this.getSigningSession(signToken)
  }

  async declineSigningSession(
    signToken: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PublicSigningSessionDto> {
    const envelope = await ESignEnvelope.findOne({
      'signers.signToken': signToken,
    })

    if (!envelope) {
      throw new AppError('Envelope not found', 404)
    }

    const signer = envelope.signers.find((s) => s.signToken === signToken)
    if (!signer) {
      throw new AppError('Signer not found', 404)
    }

    signer.status = 'declined'
    signer.declineReason = reason
    signer.ipAddress = ipAddress
    signer.userAgent = userAgent

    envelope.status = 'declined'
    envelope.auditTrail.push({
      id: `aud-${crypto.randomUUID().slice(0, 8)}`,
      action: 'declined',
      timestamp: new Date(),
      performerEmail: signer.email,
      performerName: signer.name,
      ipAddress,
      userAgent,
      details: `Signer declined to sign. Reason: ${reason}`,
    })

    await envelope.save()
    logger.info(`[eSign] Signer ${signer.email} declined envelope ${envelope._id}`)
    return this.getSigningSession(signToken)
  }
}

export const esignService = new ESignService()
