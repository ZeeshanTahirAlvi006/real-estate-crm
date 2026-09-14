import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { connectDB, disconnectDB } from '../config/db.js'
import { Brokerage } from '../models/Brokerage.js'
import { User } from '../models/User.js'
import { LeadSource } from '../models/LeadSource.js'
import { Contact } from '../models/Contact.js'
import { encrypt, decrypt } from '../utils/cryptoHelper.js'
import {
  ingestGoogleAdsLead,
  ingestEmailParserLead,
  normalizePakistaniPhone,
} from '../features/leads/lead.service.js'
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

async function runPakistanLeadDiagnostics() {
  console.log('\n=====================================================================')
  console.log('  PropPulse CRM — Pakistan Lead Ingestion Diagnostic Test Suite')
  console.log('=====================================================================\n')

  await connectDB()

  let brokerageId: any
  let userId: any
  let zameenSource: any
  let googleAdsSource: any
  let rawSecret: string

  // 1. Resolve or Create Brokerage & User
  await logStep('1. Tenant Context Resolution', async () => {
    let brokerage: any = await Brokerage.findOne({ isActive: true }).lean()
    if (!brokerage) {
      brokerage = await Brokerage.create({
        name: 'DHA Elite Real Estate (Lahore)',
        slug: `pk-real-estate-${Date.now()}`,
        subdomain: `test-pk-${Date.now()}`,
        customDomain: '',
        status: 'active',
        tier: 'brokerage',
        settings: {
          currency: 'PKR',
          timezone: 'Asia/Karachi',
        },
      })
    }
    brokerageId = brokerage._id

    let user: any = await User.findOne({ brokerageId, isActive: true }).lean()
    if (!user) {
      user = await User.create({
        brokerageId,
        firstName: 'Zeeshan',
        lastName: 'Alvi',
        email: `agent.alvi.${Date.now()}@pkrealestate.test`,
        password: 'Password123!',
        role: USER_ROLES.AGENT,
        isActive: true,
      })
    }
    userId = user._id

    return `Brokerage: "${brokerage.name}" (${brokerageId}), User: "${user.firstName} ${user.lastName}" (${userId})`
  })

  // 2. Resolve or Create Zameen Lead Source
  await logStep('2. Zameen Lead Source Setup', async () => {
    let source: any = await LeadSource.findOne({
      brokerageId,
      type: 'zameen',
      isActive: true,
    }).lean()

    if (!source) {
      rawSecret = crypto.randomBytes(32).toString('hex')
      const encryptedSecret = encrypt(rawSecret)

      source = await LeadSource.create({
        brokerageId,
        createdBy: userId,
        name: 'Zameen.com Direct Portal Inquiries',
        type: 'zameen',
        captureKey: uuidv4(),
        webhookSecret: encryptedSecret,
        isActive: true,
        leadCount: 0,
      })
    } else {
      rawSecret = 'existing-secret-placeholder'
    }

    zameenSource = source
    return `Zameen Source ID: ${source._id}, Capture Key: ${source.captureKey}`
  })

  // 3. Resolve or Create Google Ads Lead Source
  await logStep('3. Google Ads Lead Source Setup', async () => {
    let source: any = await LeadSource.findOne({
      brokerageId,
      type: 'google_ads',
      isActive: true,
    }).lean()

    if (!source) {
      const gadsSecret = 'pakistan-google-ads-key-123'
      const encryptedSecret = encrypt(gadsSecret)

      source = await LeadSource.create({
        brokerageId,
        createdBy: userId,
        name: 'Google Ads Lead Form Extensions (Pakistan)',
        type: 'google_ads',
        captureKey: uuidv4(),
        webhookSecret: encryptedSecret,
        isActive: true,
        leadCount: 0,
      })
      rawSecret = gadsSecret
    } else {
      rawSecret = decrypt(source.webhookSecret)
    }

    googleAdsSource = source
    return `Google Ads Source ID: ${source._id}`
  })

  // 4. Ingest Zameen Email Notification
  await logStep('4. Zameen Email Parser Lead Ingestion', async () => {
    const zameenEmailBody = `
      You have received a new inquiry on Zameen.com
      Property ID: 9482103
      Location: Phase 6, DHA Lahore
      Price: PKR 6.5 Crore
      Name: Muhammad Usman
      Phone: 0300-1234567
      Email: usman.dha@gmail.com
      Message: Pre-approved cash buyer interested in immediate inspection.
    `
    const result = await ingestEmailParserLead(
      'zameen',
      { body: zameenEmailBody, subject: 'New inquiry for Property 9482103' },
      zameenSource._id.toString()
    )

    const normalizedPhone = normalizePakistaniPhone('0300-1234567')
    if (normalizedPhone !== '+923001234567') {
      throw new Error(`Phone normalization failed: expected +923001234567, got ${normalizedPhone}`)
    }

    return `Ingested Zameen Lead Contact ID: ${result.contact?.id}, LeadScore: ${result.contact?.leadScore}`
  })

  // 5. Ingest Google Ads Lead Form Webhook
  await logStep('5. Google Ads Webhook Ingestion', async () => {
    const googleAdsPayload = {
      lead_id: `gads-pk-${Date.now()}`,
      google_key: rawSecret || 'pakistan-google-ads-key-123',
      is_test: false,
      user_column_data: [
        { column_id: 'FULL_NAME', string_value: 'Hamza Tariq' },
        { column_id: 'EMAIL', string_value: `hamza.tariq.${Date.now()}@pktech.com` },
        { column_id: 'PHONE_NUMBER', string_value: '0321-9876543' },
        { column_id: 'CITY', string_value: 'Islamabad' },
      ],
    }

    const result = await ingestGoogleAdsLead(
      googleAdsPayload,
      googleAdsSource._id.toString()
    )

    return `Ingested Google Ads Lead Contact ID: ${result.contact?.id}, Score: ${result.contact?.leadScore}`
  })

  // 6. Verify Contact & E.164 Pakistan Phone in Database
  await logStep('6. Database Verification & E.164 Normalization Check', async () => {
    const contact = await Contact.findOne({
      brokerageId,
      phone: '+923001234567',
    }).lean()

    if (!contact) {
      throw new Error('Contact with normalized phone +923001234567 not found in DB')
    }

    return `Verified contact: ${contact.firstName} ${contact.lastName}, phone: ${contact.phone}, source: ${contact.leadSource}`
  })

  await disconnectDB()

  console.log('\n=====================================================================')
  console.log(`  Diagnostics Completed: ${results.filter((r) => r.status === 'PASSED').length}/${results.length} PASSED`)
  console.log('=====================================================================\n')
}

if (process.argv[1]?.includes('testPakistanLeads')) {
  runPakistanLeadDiagnostics()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal diagnostic error:', err)
      process.exit(1)
    })
}

export { runPakistanLeadDiagnostics }
