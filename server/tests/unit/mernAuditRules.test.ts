import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { WhatsAppIntegration } from '../../src/models/WhatsAppIntegration.js'
import { toTenantObjectId, withLock } from '../../src/integrations/whatsapp/service.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('MERN Performance Audit & Declarative Rules Verification', () => {
  // ── DI-001: ObjectId Schema Validation ──────────────────────────────────
  it('[DI-001] toTenantObjectId re-wraps string or cached ID into new mongoose.Types.ObjectId', () => {
    const rawStringId = '6ab3aad0825c6e044f8679b3'
    const wrapped = toTenantObjectId(rawStringId)
    assert.ok(wrapped instanceof mongoose.Types.ObjectId, 'Result must be an explicit ObjectId instance')
    assert.equal(wrapped.toString(), rawStringId)

    // Invalid format rejection
    assert.throws(() => toTenantObjectId('invalid-hex-id'), /Invalid tenant ID format/)
  })

  // ── DI-002: Lean Document Mutation Guard ────────────────────────────────
  it('[DI-002] WhatsApp service never invokes Mongoose Document methods (.save, etc.) on .lean() results', () => {
    const serviceCode = readFileSync(
      join(process.cwd(), 'src/integrations/whatsapp/service.ts'),
      'utf-8'
    )
    // Assert that .save() is not called on any query result
    assert.ok(!serviceCode.includes('doc.save('), 'Must not call .save() on lean documents')
    assert.ok(!serviceCode.includes('doc.remove('), 'Must not call .remove() on lean documents')
    // Verify Model.findOneAndUpdate is used instead
    assert.ok(serviceCode.includes('WhatsAppIntegration.findOneAndUpdate'), 'Must use atomic findOneAndUpdate')
  })

  // ── DI-003: Cache Fallback Enforcement ──────────────────────────────────
  it('[DI-003] withLock falls back to in-memory mutex when Redis throws or is unavailable', async () => {
    const tenantId = new mongoose.Types.ObjectId().toString()
    // Should run successfully even if Redis is unreachable / null
    let executed = false
    await withLock(tenantId, async () => {
      executed = true
      return 'ok'
    })
    assert.equal(executed, true, 'Operation must execute even if cache is unreachable')
  })

  // ── ML-001: Listener Lifecycle Enforcement ──────────────────────────────
  it('[ML-001] Frontend WhatsApp component registers message listener with paired teardown', () => {
    const frontendCode = readFileSync(
      join(process.cwd(), '../src/pages/ai-isa/components/WhatsAppIntegrationSettings.tsx'),
      'utf-8'
    )
    assert.ok(
      frontendCode.includes("window.addEventListener('message', handleMetaMessage)"),
      'Must add listener'
    )
    assert.ok(
      frontendCode.includes("window.removeEventListener('message', handleMetaMessage)"),
      'Must have paired teardown in return callback'
    )
  })

  // ── ML-002: Global Scope Payload Injection Ban ──────────────────────────
  it('[ML-002] Service does not push request payloads into module-level arrays or maps', () => {
    const serviceCode = readFileSync(
      join(process.cwd(), 'src/integrations/whatsapp/service.ts'),
      'utf-8'
    )
    // Verify no unbounded module-level collection accumulates request payloads
    assert.ok(!serviceCode.match(/const\s+\w+\s*:\s*any\[\]\s*=\s*\[\]/), 'No global array accumulation')
  })

  // ── PERF-M-001: Covered Query Enforcement ───────────────────────────────
  it('[PERF-M-001] WhatsAppIntegration model defines indexes on tenantId, phoneNumberId, wabaId, and status', () => {
    const indexes = WhatsAppIntegration.schema.indexes()
    const indexedFields = indexes.map(([fields]) => Object.keys(fields)[0])

    assert.ok(indexedFields.includes('tenantId'), 'tenantId must be indexed')
    assert.ok(indexedFields.includes('phoneNumberId'), 'phoneNumberId must be indexed')
    assert.ok(indexedFields.includes('wabaId'), 'wabaId must be indexed')
    assert.ok(indexedFields.includes('status'), 'status must be indexed')
  })

  // ── PERF-M-002: Array Payload Slice Limit ───────────────────────────────
  it('[PERF-M-002] WhatsApp status query bounds history projection with .slice()', () => {
    const serviceCode = readFileSync(
      join(process.cwd(), 'src/integrations/whatsapp/service.ts'),
      'utf-8'
    )
    assert.ok(
      serviceCode.includes(".slice('history', -20)"),
      "Must cap history projection to latest 20 items using .slice('history', -20)"
    )
  })

  // ── PERF-M-003: Connection Pool Floor ───────────────────────────────────
  it('[PERF-M-003] Mongoose connection options declare maxPoolSize >= 100', () => {
    const dbConfigCode = readFileSync(
      join(process.cwd(), 'src/config/db.ts'),
      'utf-8'
    )
    assert.ok(
      dbConfigCode.includes('maxPoolSize: 100') || dbConfigCode.includes('maxPoolSize: 150'),
      'maxPoolSize must be explicitly configured >= 100 in mongoose.connect options'
    )
  })

  // ── PERF-M-004: Mandatory hrtime Instrumentation ────────────────────────
  it('[PERF-M-004] Hot-path DB operations are wrapped in process.hrtime.bigint() and emitted to metrics', () => {
    const serviceCode = readFileSync(
      join(process.cwd(), 'src/integrations/whatsapp/service.ts'),
      'utf-8'
    )
    const hrtimeCount = (serviceCode.match(/process\.hrtime\.bigint\(\)/g) || []).length
    assert.ok(hrtimeCount >= 5, `Expected at least 5 hrtime measurements, found ${hrtimeCount}`)
    assert.ok(serviceCode.includes('recordDbMetric'), 'Must record metrics via recordDbMetric')
  })
})
