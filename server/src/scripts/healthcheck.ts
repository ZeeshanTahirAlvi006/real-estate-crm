import http from 'http'

const PORT = process.env.PORT || 5000
const HEALTH_URL = `http://localhost:${PORT}/api/health`

console.log(`🔍 Probing system health at ${HEALTH_URL}...`)

const req = http.get(HEALTH_URL, (res) => {
  console.log(`HTTP Status: ${res.statusCode}`)
  if (res.statusCode === 200) {
    console.log('✅ Server health probe SUCCESSFUL')
    process.exit(0)
  } else {
    console.error(`❌ Server health probe FAILED with status code ${res.statusCode}`)
    process.exit(1)
  }
})

req.on('error', (err) => {
  console.error('❌ Server health probe ERROR:', err.message)
  process.exit(1)
})

req.setTimeout(5000, () => {
  console.error('❌ Server health probe TIMEOUT')
  req.destroy()
  process.exit(1)
})
