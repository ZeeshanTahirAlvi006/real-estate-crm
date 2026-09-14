import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizePakistaniPhone,
  mapGoogleAdsPayload,
  parseZameenEmailContent,
  parseGraanaEmailContent,
  parseOlxEmailContent,
  parseUniversalPayload,
  verifyMetaWebhookChallenge,
} from '../../src/features/leads/lead.service.js'
import { googleAdsWebhookSchema } from '../../src/features/leads/lead.validators.js'
import { LEAD_SOURCE_TYPES } from '../../src/utils/constants.js'

describe('Pakistan Lead Ingestion & Normalization Engine', () => {
  // ─────────────────────────────────────────────
  // 1. Pakistani Phone Normalizer (E.164)
  // ─────────────────────────────────────────────
  describe('1. Phone Normalizer (normalizePakistaniPhone)', () => {
    it('should normalize standard local format (03001234567) to +923001234567', () => {
      assert.equal(normalizePakistaniPhone('03001234567'), '+923001234567')
    })

    it('should normalize dashed local format (0321-9876543) to +923219876543', () => {
      assert.equal(normalizePakistaniPhone('0321-9876543'), '+923219876543')
    })

    it('should normalize space-separated format (0345 555 1234) to +923455551234', () => {
      assert.equal(normalizePakistaniPhone('0345 555 1234'), '+923455551234')
    })

    it('should normalize international dialing format (00923001234567) to +923001234567', () => {
      assert.equal(normalizePakistaniPhone('00923001234567'), '+923001234567')
    })

    it('should normalize un-prefixed country code (923001234567) to +923001234567', () => {
      assert.equal(normalizePakistaniPhone('923001234567'), '+923001234567')
    })

    it('should preserve already valid +92 format (+923001234567)', () => {
      assert.equal(normalizePakistaniPhone('+923001234567'), '+923001234567')
    })

    it('should leave non-Pakistani international numbers intact', () => {
      assert.equal(normalizePakistaniPhone('+15557493021'), '+15557493021')
    })

    it('should return empty string on empty input', () => {
      assert.equal(normalizePakistaniPhone(''), '')
    })
  })

  // ─────────────────────────────────────────────
  // 2. Google Ads Lead Form Adapter
  // ─────────────────────────────────────────────
  describe('2. Google Ads Adapter (mapGoogleAdsPayload)', () => {
    it('should extract full name, email, phone, city and normalize phone', () => {
      const payload = {
        lead_id: 'gads-1029384',
        form_id: '849201',
        campaign_id: '19482',
        gclid: 'Cj0KCQiA_abc123',
        user_column_data: [
          { column_id: 'FULL_NAME', string_value: 'Muhammad Usman' },
          { column_id: 'EMAIL', string_value: 'usman@gmail.com' },
          { column_id: 'PHONE_NUMBER', string_value: '0300-1234567' },
          { column_id: 'CITY', string_value: 'Lahore' },
          { column_id: 'POSTAL_CODE', string_value: '54000' },
          { column_id: 'STREET_ADDRESS', string_value: 'Sector Y, Phase 3, DHA' },
        ],
      }

      const mapped = mapGoogleAdsPayload(payload)
      assert.equal(mapped.name, 'Muhammad Usman')
      assert.equal(mapped.email, 'usman@gmail.com')
      assert.equal(mapped.phone, '+923001234567')
      assert.equal(mapped.propertyAddress, 'Sector Y, Phase 3, DHA, Lahore')
      assert.equal(mapped.zipCode, '54000')
      assert.equal(mapped.source, 'google_ads')
      assert.equal(mapped.googleLeadId, 'gads-1029384')
      assert.equal(mapped.gclid, 'Cj0KCQiA_abc123')
    })

    it('should validate and map exact Google Ads production test payload with numeric IDs and gcl_id', () => {
      const googlePayload = {
        lead_id: 'TeSter-123-ABCDEFGHIJKLMNOPQRSTUVWXYZ-abcdefghijklmnopqrstuvwxyz-0123456789-AaBbCcDdEeFfGgHhIiJjKkLl',
        user_column_data: [
          { column_name: 'First Name', string_value: 'FirstName', column_id: 'FIRST_NAME' },
          { column_name: 'Last Name', string_value: 'LastName', column_id: 'LAST_NAME' },
          { column_name: 'User Email', string_value: 'test@example.com', column_id: 'EMAIL' },
          { column_name: 'User Phone', string_value: '+16505550123', column_id: 'PHONE_NUMBER' },
          { column_name: 'City', string_value: 'Mountain View', column_id: 'CITY' },
        ],
        api_version: '1.0',
        form_id: 40000000000,
        campaign_id: 10000000000,
        google_key: '8c088ebe8437458c20795dbe4a07ee73',
        is_test: true,
        gcl_id: 'TeSter-123-ABCDEFGHIJKLMNOPQRSTUVWXYZ-abcdefghijklmnopqrstuvwxyz-0123456789-AaBbCcDdEeFfGgHhIiJjKkLl',
        adgroup_id: 20000000000,
        creative_id: 30000000000,
      }

      // 1. Zod Validation Check
      const parsed = googleAdsWebhookSchema.parse(googlePayload)
      assert.equal(parsed.form_id, '40000000000')
      assert.equal(parsed.campaign_id, '10000000000')
      assert.equal(parsed.is_test, true)

      // 2. Adapter Mapping Check
      const mapped = mapGoogleAdsPayload(parsed as any)
      assert.equal(mapped.name, 'FirstName LastName')
      assert.equal(mapped.firstName, 'FirstName')
      assert.equal(mapped.lastName, 'LastName')
      assert.equal(mapped.email, 'test@example.com')
      assert.equal(mapped.phone, '+16505550123')
      assert.equal(mapped.propertyAddress, 'Mountain View')
      assert.equal(mapped.gclid, 'TeSter-123-ABCDEFGHIJKLMNOPQRSTUVWXYZ-abcdefghijklmnopqrstuvwxyz-0123456789-AaBbCcDdEeFfGgHhIiJjKkLl')
    })
  })

  // ─────────────────────────────────────────────
  // 3. Zameen.com Email Parser
  // ─────────────────────────────────────────────
  describe('3. Zameen.com Parser (parseZameenEmailContent)', () => {
    it('should extract buyer details, property ID, and PKR price from notification email', () => {
      const emailContent = {
        subject: 'New Inquiry on your Property 18492019 - 1 Kanal House in DHA Phase 6',
        body: `
          Dear Agent,
          You have received a new inquiry on Zameen.com.

          Property ID: 18492019
          Location: Phase 6, DHA Lahore
          Price: PKR 6.5 Crore

          Inquirer Details:
          Name: Hamza Tariq
          Phone: 0321-4567890
          Email: hamza.tariq@gmail.com

          Message:
          Is this property still available for sale? I am a cash buyer and can visit this Saturday.

          Regards,
          Zameen.com Team
        `,
      }

      const parsed = parseZameenEmailContent(emailContent)
      assert.equal(parsed.name, 'Hamza Tariq')
      assert.equal(parsed.phone, '+923214567890')
      assert.equal(parsed.email, 'hamza.tariq@gmail.com')
      assert.equal(parsed.zameenPropertyId, '18492019')
      assert.equal(parsed.source, 'zameen')
      assert.ok(parsed.message?.includes('cash buyer'))
      assert.ok(parsed.message?.includes('PKR 6.5 Crore'))
    })
  })

  // ─────────────────────────────────────────────
  // 4. Graana.com Email Parser
  // ─────────────────────────────────────────────
  describe('4. Graana.com Parser (parseGraanaEmailContent)', () => {
    it('should extract buyer details and property ref from Graana inquiry email', () => {
      const emailContent = {
        subject: 'Inquiry for 10 Marla Luxury House, Sector F-7, Islamabad',
        body: `
          New Inquiry Received on Graana.com!
          Property ID: GR-94821
          Title: 10 Marla Luxury House, Sector F-7, Islamabad
          Price: PKR 52,000,000

          Buyer Information:
          Name: Bilal Chaudhry
          Phone: +92 333 5551234
          Email: bilal.chaudhry@yahoo.com

          Message:
          Interested in booking a private viewing this Sunday. Please call back.

          Regards,
          Graana.com Customer Support
        `,
      }

      const parsed = parseGraanaEmailContent(emailContent)
      assert.equal(parsed.name, 'Bilal Chaudhry')
      assert.equal(parsed.phone, '+923335551234')
      assert.equal(parsed.email, 'bilal.chaudhry@yahoo.com')
      assert.equal(parsed.graanaPropertyId, 'GR-94821')
      assert.equal(parsed.source, 'graana')
      assert.ok(parsed.message?.includes('private viewing'))
    })
  })

  // ─────────────────────────────────────────────
  // 5. OLX Pakistan Email Parser (with Phone Regex Extraction)
  // ─────────────────────────────────────────────
  describe('5. OLX Pakistan Parser (parseOlxEmailContent)', () => {
    it('should extract buyer name, chat URL, and regex-extract phone from message body', () => {
      const emailContent = {
        subject: 'You have a new message from Tariq Mehmood regarding: 5 Marla Brand New House in Bahria Town',
        body: `
          You have received a new message on OLX.

          Ad ID: 10928301
          Chat: https://www.olx.com.pk/myolx/conversations/10928301

          Message:
          AOA bhai, is this 5 Marla house still available? Final demand kya hai? Please WhatsApp me details at 0345-9876543.

          View conversation on OLX to reply.
        `,
      }

      const parsed = parseOlxEmailContent(emailContent)
      assert.equal(parsed.name, 'Tariq Mehmood')
      assert.equal(parsed.phone, '+923459876543') // Extracted from message body via regex!
      assert.equal(parsed.adId, '10928301')
      assert.equal(parsed.olxChatUrl, 'https://www.olx.com.pk/myolx/conversations/10928301')
      assert.equal(parsed.source, 'olx')
      assert.ok(parsed.message?.includes('Final demand kya hai'))
    })

    it('should handle OLX inquiries where buyer does not include phone number', () => {
      const emailContent = {
        subject: 'New message regarding: Plot in DHA Phase 5',
        body: `
          Buyer: Kashif Raza
          Ad ID: 2049281
          Chat: https://www.olx.com.pk/myolx/conversations/2049281

          Message:
          Is the price negotiable?
        `,
      }

      const parsed = parseOlxEmailContent(emailContent)
      assert.equal(parsed.name, 'Kashif Raza')
      assert.equal(parsed.phone, '') // No phone in message
      assert.equal(parsed.adId, '2049281')
      assert.equal(parsed.source, 'olx')
    })
  })

  // ─────────────────────────────────────────────
  // 6. Universal Lead Parser Integration
  // ─────────────────────────────────────────────
  describe('6. Universal Lead Parser (parseUniversalPayload)', () => {
    it('should automatically normalize Pakistani phone numbers regardless of source', () => {
      const result = parseUniversalPayload({
        name: 'Zeeshan Alvi',
        phone: '0300 8451234',
        email: 'zeeshan@pkproperties.com',
        source: 'zameen',
      })

      assert.equal(result.firstName, 'Zeeshan')
      assert.equal(result.lastName, 'Alvi')
      assert.equal(result.phone, '+923008451234')
      assert.equal(result.sourceType, 'zameen')
    })

    it('should support all new Pakistani lead source types in enum', () => {
      assert.ok(LEAD_SOURCE_TYPES.includes('zameen'))
      assert.ok(LEAD_SOURCE_TYPES.includes('graana'))
      assert.ok(LEAD_SOURCE_TYPES.includes('olx'))
      assert.ok(LEAD_SOURCE_TYPES.includes('whatsapp'))
      assert.ok(LEAD_SOURCE_TYPES.includes('google_ads'))
      assert.ok(LEAD_SOURCE_TYPES.includes('meta_ads'))
    })
  })

  // ─────────────────────────────────────────────
  // 7. Meta Webhook Challenge Verification
  // ─────────────────────────────────────────────
  describe('7. Meta Webhook Verification (verifyMetaWebhookChallenge)', () => {
    it('should return challenge when token matches', () => {
      const challenge = verifyMetaWebhookChallenge(
        'subscribe',
        'my_test_token',
        'challenge_code_12345',
        'my_test_token'
      )
      assert.equal(challenge, 'challenge_code_12345')
    })

    it('should throw 403 when token does not match', () => {
      assert.throws(
        () => verifyMetaWebhookChallenge('subscribe', 'wrong_token', 'code', 'correct_token'),
        /Invalid verification token/
      )
    })
  })

  // ─────────────────────────────────────────────
  // 8. Performance & Latency Budget (< 0.1ms per parse)
  // ─────────────────────────────────────────────
  describe('8. Sub-1ms Latency Budget Verification', () => {
    it('should execute 100 consecutive parses in under 10ms total (< 0.1ms per parse)', () => {
      const payload = {
        name: 'Muhammad Usman',
        phone: '0300-1234567',
        email: 'usman@gmail.com',
        propertyAddress: 'DHA Phase 6, Lahore',
        propertyPrice: 50000000,
        source: 'zameen',
      }

      const t0 = process.hrtime.bigint()
      for (let i = 0; i < 100; i++) {
        parseUniversalPayload(payload)
      }
      const t1 = process.hrtime.bigint()
      const totalElapsedMs = Number(t1 - t0) / 1e6
      const avgMs = totalElapsedMs / 100

      console.log(`[PERF-BENCHMARK] 100 parses executed in ${totalElapsedMs.toFixed(3)}ms (avg: ${avgMs.toFixed(4)}ms/op)`)
      assert.ok(avgMs < 0.1, `Expected average parse time < 0.1ms, got ${avgMs.toFixed(4)}ms`)
    })
  })
})
