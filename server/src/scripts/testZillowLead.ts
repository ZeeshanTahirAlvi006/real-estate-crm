import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { connectDB, disconnectDB } from '../config/db.js'
import { Brokerage } from '../models/Brokerage.js'
import { User } from '../models/User.js'
import { LeadSource } from '../models/LeadSource.js'
import { Contact } from '../models/Contact.js'
import { Activity } from '../models/Activity.js'
import { encrypt, decrypt } from '../utils/cryptoHelper.js'
import { ingestWebhookLead } from '../features/leads/lead.service.js'
import { USER_ROLES } from '../utils/constants.js'

interface TestResult {
  step: string
  status: 'PASSED' | 'FAILED'
  details: string
  durationMs: number
}

const results: TestResult[] = []

async function logStep(
  step: string,
  fn: () => Promise<string>
): Promise<boolean> {
  const start = process.hrtime.bigint()
  try {
    const details = await fn()
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1e6
    results.push({ step, status: 'PASSED', details, durationMs })
    console.log(`  ✅ [PASS] ${step} (${durationMs.toFixed(2)}ms): ${details}`)
    return true
  } catch (error: any) {
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1e6
    results.push({ step, status: 'FAILED', details: error.message || String(error), durationMs })
    console.error(`  ❌ [FAIL] ${step} (${durationMs.toFixed(2)}ms): ${error.message || String(error)}`)
    return false
  }
}

async function runZillowDiagnostic() {
  console.log('\n===============================================================')
  console.log('  PropPulse CRM — Zillow Lead Ingestion Diagnostic Test Suite')
  console.log('===============================================================\n')

  await connectDB()

  let brokerageId: any
  let userId: any
  let zillowSource: any
  let rawSecret: string

  // 1. Resolve or Create Brokerage & User
  await logStep('1. Tenant Context Resolution', async () => {
    let brokerage: any = await Brokerage.findOne({ isActive: true }).lean()
    if (!brokerage) {
      brokerage = await Brokerage.create({
        name: 'PropPulse Premier Realty (Test)',
        subdomain: `test-zillow-${Date.now()}`,
        plan: 'enterprise',
        isActive: true,
      })
    }
    brokerageId = brokerage._id

    let user: any = await User.findOne({ brokerageId, role: USER_ROLES.AGENT }).lean()
    if (!user) {
      user = await User.findOne({ brokerageId }).lean()
    }
    if (!user) {
      user = await User.create({
        firstName: 'Zillow',
        lastName: 'Specialist Agent',
        email: `agent-${Date.now()}@proppulse.test`,
        password: 'Password!123',
        role: USER_ROLES.AGENT,
        brokerageId,
        isActive: true,
      })
    }
    userId = user._id
    return `Brokerage: "${brokerage?.name}" (${brokerageId}), Agent: "${user?.firstName} ${user?.lastName}" (${userId})`
  })

  // 2. Resolve or Create Zillow Lead Source
  await logStep('2. Zillow Lead Source Setup', async () => {
    let source = await LeadSource.findOne({
      brokerageId,
      type: 'zillow',
      isActive: true,
    }).select('+webhookSecret')

    if (!source) {
      rawSecret = crypto.randomBytes(24).toString('hex')
      const encryptedSecret = encrypt(rawSecret)
      const captureKey = uuidv4()

      source = await LeadSource.create({
        name: 'Zillow Premier Agent Inbound',
        type: 'zillow',
        webhookSecret: encryptedSecret,
        captureKey,
        brokerageId,
        createdBy: userId,
        isActive: true,
      })
    } else {
      try {
        rawSecret = decrypt(source.webhookSecret)
      } catch {
        rawSecret = crypto.randomBytes(24).toString('hex')
        source.webhookSecret = encrypt(rawSecret)
        await source.save()
      }
    }

    zillowSource = source
    return `Source ID: ${source._id}, CaptureKey: ${source.captureKey}, Secret Length: ${rawSecret.length} chars`
  })

  // Common realistic Zillow Premier Agent payload
  const testEmail = `zillow.lead.${Date.now()}@gmail.com`
  const testPhone = '+1 (555) 749-3021'
  const zillowPayload = {
    source: 'Zillow',
    firstName: 'Alexander',
    lastName: 'Wright',
    phone: testPhone,
    email: testEmail,
    propertyAddress: '1420 Highland Ave, Austin TX 78701',
    propertyPrice: 850000,
    zipCode: '78701',
    message: 'We are a pre-approved cash buyer looking to schedule a private walkthrough this Saturday ASAP.',
  }
  const rawBody = JSON.stringify(zillowPayload)

  // Detect whether HTTP server is running on port 5000
  const serverPort = process.env.PORT || '5000'
  const httpEndpoint = `http://localhost:${serverPort}/api/leads/ingest?sourceId=${zillowSource._id}`
  let useHttpDispatch = false

  try {
    const probe = await fetch(`http://localhost:${serverPort}/api/health`, { signal: AbortSignal.timeout(1500) })
    if (probe.ok || probe.status === 404 || probe.status === 200) {
      useHttpDispatch = true
    }
  } catch {
    useHttpDispatch = false
  }

  console.log(`\n  Dispatch Mode: ${useHttpDispatch ? `HTTP Network Socket (${httpEndpoint})` : 'In-Process Direct Service Execution'}\n`)

  let createdContactId: string = ''

  // 3. Ingestion via API Key (Bearer / X-Api-Key)
  await logStep('3. Ingestion via API Key (Zapier / Make simulation)', async () => {
    if (useHttpDispatch) {
      const res = await fetch(httpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': rawSecret,
        },
        body: rawBody,
      })
      const data: any = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(`HTTP ${res.status}: ${data.message || JSON.stringify(data)}`)
      }
      createdContactId = data.data.contactId
      if (!data.data.isNew) {
        throw new Error(`Expected isNew: true on first ingestion, received isNew: ${data.data.isNew}`)
      }
      return `HTTP 201 Created — Contact ID: ${createdContactId}, isNew: ${data.data.isNew}, Routed: ${data.data.routed}`
    } else {
      const result = await ingestWebhookLead(
        zillowPayload,
        rawBody,
        undefined,
        zillowSource._id.toString(),
        '127.0.0.1',
        rawSecret
      )
      createdContactId = result.contact.id
      if (!result.isNew) {
        throw new Error(`Expected isNew: true on first ingestion, received isNew: ${result.isNew}`)
      }
      return `Direct Ingestion 201 — Contact ID: ${createdContactId}, isNew: ${result.isNew}, Score: ${result.contact.leadScore}`
    }
  })

  // 4. Ingestion via HMAC SHA-256 (Deduplication / Reinquiry test)
  await logStep('4. Deduplication & Reinquiry via HMAC SHA-256 Signature', async () => {
    const hmacSignature = crypto
      .createHmac('sha256', rawSecret)
      .update(rawBody)
      .digest('hex')

    if (useHttpDispatch) {
      const res = await fetch(httpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': hmacSignature,
        },
        body: rawBody,
      })
      const data: any = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(`HTTP ${res.status}: ${data.message || JSON.stringify(data)}`)
      }
      if (data.data.isNew !== false) {
        throw new Error(`Expected isNew: false for deduplicated reinquiry, received: ${data.data.isNew}`)
      }
      return `Reinquiry Logged — Contact ID: ${data.data.contactId}, isNew: ${data.data.isNew} (Deduplicated successfully)`
    } else {
      const result = await ingestWebhookLead(
        zillowPayload,
        rawBody,
        hmacSignature,
        zillowSource._id.toString(),
        '127.0.0.1'
      )
      if (result.isNew !== false) {
        throw new Error(`Expected isNew: false for reinquiry, received: ${result.isNew}`)
      }
      return `Reinquiry Logged — Contact ID: ${result.contact.id}, isNew: ${result.isNew}, Inquiries: ${(result.contact as any).inquiryCount}`
    }
  })

  // 5. Ingestion via Authorization: Bearer <secret>
  if (useHttpDispatch) {
    await logStep('5. Ingestion via Authorization: Bearer <token>', async () => {
      const res = await fetch(httpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawSecret}`,
        },
        body: rawBody,
      })
      const data: any = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(`HTTP ${res.status}: ${data.message || JSON.stringify(data)}`)
      }
      return `Bearer Token Accepted — HTTP 201 Created (Contact: ${data.data.contactId})`
    })
  }

  // 6. Negative Security Test: Invalid API Key Rejection
  await logStep('6. Security Check: Invalid API Key Rejection', async () => {
    const invalidKey = 'invalid_secret_key_abcdef123456'
    if (useHttpDispatch) {
      const res = await fetch(httpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': invalidKey,
        },
        body: rawBody,
      })
      if (res.status !== 401) {
        throw new Error(`Expected HTTP 401 Unauthorized, received HTTP ${res.status}`)
      }
      return `Correctly Rejected with HTTP 401 Unauthorized`
    } else {
      try {
        await ingestWebhookLead(
          zillowPayload,
          rawBody,
          undefined,
          zillowSource._id.toString(),
          '127.0.0.1',
          invalidKey
        )
        throw new Error('Should have thrown AppError 401 for invalid API key')
      } catch (err: any) {
        if (err.statusCode === 401 || err.message?.includes('Invalid API key')) {
          return `Correctly Rejected with AppError 401: ${err.message}`
        }
        throw err
      }
    }
  })

  // 7. Negative Security Test: Missing Signature and API Key
  await logStep('7. Security Check: Missing Auth Credentials Rejection', async () => {
    if (useHttpDispatch) {
      const res = await fetch(httpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: rawBody,
      })
      if (res.status !== 401) {
        throw new Error(`Expected HTTP 401 Unauthorized, received HTTP ${res.status}`)
      }
      return `Correctly Rejected with HTTP 401 Unauthorized`
    } else {
      try {
        await ingestWebhookLead(
          zillowPayload,
          rawBody,
          undefined,
          zillowSource._id.toString(),
          '127.0.0.1',
          undefined
        )
        throw new Error('Should have thrown AppError 401 for missing credentials')
      } catch (err: any) {
        if (err.statusCode === 401 || err.message?.includes('Missing webhook signature or API key')) {
          return `Correctly Rejected with AppError 401: ${err.message}`
        }
        throw err
      }
    }
  })

  // 8. Contact & Activity Verification in Database
  await logStep('8. Database Record & Activity Timeline Verification', async () => {
    const contact = await Contact.findById(createdContactId).lean()
    if (!contact) throw new Error(`Contact ${createdContactId} not found in DB`)

    const activities = await Activity.find({ contactId: contact._id }).lean()

    if (contact.leadSource?.toLowerCase() !== 'zillow') {
      throw new Error(`Expected leadSource "zillow", found "${contact.leadSource}"`)
    }
    if ((contact.inquiryCount || 1) < 2) {
      throw new Error(`Expected inquiryCount >= 2, found ${contact.inquiryCount}`)
    }

    return `Contact "${contact.firstName} ${contact.lastName}" verified in DB (Inquiries: ${contact.inquiryCount}, Score: ${contact.leadScore}, Activities Logged: ${activities.length})`
  })

  // Clean up test contact to leave zero residual garbage
  if (createdContactId) {
    await Contact.deleteOne({ _id: createdContactId })
    await Activity.deleteMany({ contactId: createdContactId })
    console.log(`\n  🧹 Cleaned up temporary test contact (${createdContactId})`)
  }

  await disconnectDB()

  // Final Summary Report
  console.log('\n===============================================================')
  console.log('                   DIAGNOSTIC TEST SUMMARY                     ')
  console.log('===============================================================')
  const total = results.length
  const passed = results.filter((r) => r.status === 'PASSED').length
  const failed = total - passed

  console.log(`  Total Steps: ${total} | Passed: ${passed} | Failed: ${failed}`)
  console.log('---------------------------------------------------------------')
  for (const r of results) {
    console.log(`  [${r.status}] ${r.step} — ${r.durationMs.toFixed(2)}ms`)
  }
  console.log('===============================================================\n')

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('🎉 All Zillow Lead Ingestion Diagnostic Tests PASSED!\n')
    process.exit(0)
  }
}

runZillowDiagnostic().catch((err) => {
  console.error('Fatal diagnostic error:', err)
  process.exit(1)
})
