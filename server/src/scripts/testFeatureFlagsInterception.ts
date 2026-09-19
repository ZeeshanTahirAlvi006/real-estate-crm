import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { initRedis, cacheGet } from '../config/redis.js'
import { initializeDefaultFeatureFlags } from '../models/FeatureFlag.js'
import { updateFeatureFlag } from '../features/feature-flags/featureFlag.service.js'
import { requireFeature } from '../middleware/featureFlag.js'
import { IUser } from '../models/User.js'
import { USER_ROLES } from '../utils/constants.js'

async function runTests() {
  console.log('=== FEATURE FLAGS ENDPOINT INTERCEPTION & LATENCY TEST ===\n')

  await mongoose.connect(env.MONGODB_URI)
  console.log('✓ Connected to MongoDB')

  initRedis()
  console.log('✓ Initialized Redis')

  await initializeDefaultFeatureFlags()

  const mockAdmin = {
    _id: new mongoose.Types.ObjectId(),
    email: 'admin@proppulse.test',
    role: USER_ROLES.SUPER_ADMIN,
  } as unknown as IUser

  // Test 1: deals_pipeline toggle off -> assert 503
  console.log('\n--- Test 1: deals_pipeline kill-switch ---')
  await updateFeatureFlag('deals_pipeline', { isEnabled: false, disabledReason: 'Sprint Maintenance' }, mockAdmin)

  const redisVal = await cacheGet('feature_flag:deals_pipeline')
  console.log('Redis cached state for deals_pipeline:', redisVal, '(Expected "0")')
  if (redisVal !== '0') throw new Error('Redis was not updated to 0!')



  // Simulate incoming request to /api/pipelines
  let capturedStatus = 0
  let capturedBody: any = null
  let nextCalled = false

  const mockReq: any = { user: { role: 'agent' }, headers: {} }
  const mockRes: any = {
    status: (code: number) => {
      capturedStatus = code
      return {
        json: (body: any) => {
          capturedBody = body
        },
      }
    },
  }
  const mockNext = () => {
    nextCalled = true
  }

  // First check (uncached or L2 -> L1)
  const middleware = requireFeature('deals_pipeline')
  await middleware(mockReq, mockRes, mockNext)

  console.log('Interception Status Code:', capturedStatus, '(Expected 503)')
  console.log('Interception Error Code:', capturedBody?.code, '(Expected FEATURE_MAINTENANCE)')
  if (capturedStatus !== 503 || capturedBody?.code !== 'FEATURE_MAINTENANCE') {
    throw new Error('deals_pipeline was not blocked with 503 FEATURE_MAINTENANCE!')
  }
  console.log('✓ Request was blocked with 503 FEATURE_MAINTENANCE')

  // Test 2: Sub-millisecond latency check (<1ms)
  console.log('\n--- Test 2: Latency Benchmark (<1ms cached target) ---')
  const iterations = 100
  const t0 = process.hrtime.bigint()
  for (let i = 0; i < iterations; i++) {
    await middleware(mockReq, mockRes, mockNext)
  }
  const t1 = process.hrtime.bigint()
  const totalMs = Number(t1 - t0) / 1e6
  const avgMs = totalMs / iterations
  console.log('100 cached evaluations took:', totalMs.toFixed(3), 'ms total (avg:', avgMs.toFixed(4), 'ms/call)')
  if (avgMs >= 1.0) {
    throw new Error('Cached evaluation exceeded 1ms target! Measured: ' + avgMs + 'ms')
  }
  console.log('✓ Latency target achieved:', avgMs.toFixed(4), 'ms << 1.000ms target!')

  // Test 3: Reactivate deals_pipeline -> assert next() is called
  console.log('\n--- Test 3: Reactivate deals_pipeline ---')
  await updateFeatureFlag('deals_pipeline', { isEnabled: true }, mockAdmin)
  nextCalled = false
  capturedStatus = 0

  await middleware(mockReq, mockRes, mockNext)
  console.log('Next called:', nextCalled, '(Expected true)')
  if (!nextCalled || capturedStatus === 503) {
    throw new Error('deals_pipeline was not unblocked!')
  }
  console.log('✓ deals_pipeline successfully unblocked!')

  // Test 4: Verify multiple features (dialer, ai_isa, lead_ingestion, esign)
  console.log('\n--- Test 4: Multi-subsystem validation ---')
  const subsystems = ['dialer', 'ai_isa', 'lead_ingestion', 'esign', 'data_health', 'seller_radar']
  for (const sys of subsystems) {
    await updateFeatureFlag(sys, { isEnabled: false }, mockAdmin)
    capturedStatus = 0
    nextCalled = false
    await requireFeature(sys)(mockReq, mockRes, mockNext)
    if (capturedStatus !== 503) {
      throw new Error('Subsystem ' + sys + ' was not blocked!')
    }
    await updateFeatureFlag(sys, { isEnabled: true }, mockAdmin)
    nextCalled = false
    await requireFeature(sys)(mockReq, mockRes, mockNext)
    if (!nextCalled) {
      throw new Error('Subsystem ' + sys + ' was not unblocked!')
    }
    console.log('✓ Subsystem [' + sys + '] paused (503) and resumed (200) verified')
  }

  console.log('\n=== ALL FEATURE FLAGS VERIFICATION TESTS PASSED (100%) ===\n')
  process.exit(0)
}

runTests().catch((err) => {
 console.error('Test error:', err)
 process.exit(1)
})
