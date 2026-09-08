import { encryptText, decryptText, generateApiKeyPair, hashApiKey } from '../utils/cryptoHelper.js'
import { FileStorageService } from '../utils/fileUpload.js'
import { formatAsCSV } from '../utils/exportHelper.js'
import { previewCsvFile } from '../features/import/import.service.js'

async function runSprint20Tests() {
  console.log('🧪 Starting Sprint 20 Unit & Utility Verification Tests...\n')

  // 1. Test Crypto Helper (Encryption & Decryption)
  console.log('1️⃣ Testing AES-256-GCM Encryption / Decryption...')
  const secretText = 'quickbooks_oauth_token_secret_12345'
  const encrypted = encryptText(secretText)
  const decrypted = decryptText(encrypted)

  if (decrypted === secretText && encrypted !== secretText) {
    console.log('   ✅ Crypto Encryption & Decryption PASSED')
  } else {
    throw new Error('Crypto Encryption / Decryption FAILED')
  }

  // 2. Test API Key Generation & Hashing
  console.log('2️⃣ Testing API Key Generation & SHA-256 Hashing...')
  const { rawKey, keyPrefix, keyHash } = generateApiKeyPair('pk_live')
  const computedHash = hashApiKey(rawKey)

  if (rawKey.startsWith('pk_live_') && keyHash === computedHash && keyPrefix.length > 5) {
    console.log(`   ✅ API Key Pair Generation PASSED (Prefix: ${keyPrefix})`)
  } else {
    throw new Error('API Key Generation & Hashing FAILED')
  }

  // 3. Test File Upload Abstraction (Local Disk Storage)
  console.log('3️⃣ Testing File Storage Abstraction (Local Storage)...')
  const mockBuffer = Buffer.from('PropPulse OS sample file content for Sprint 20 tests')
  const saved = await FileStorageService.saveFile(mockBuffer, 'test-doc.txt', 'text/plain', 'test-folder')

  if (saved.storageKey && saved.url && saved.provider === 'local') {
    console.log(`   ✅ File Storage Save PASSED (URL: ${saved.url})`)
    const deleted = await FileStorageService.deleteFile(saved.storageKey, 'local')
    if (deleted) {
      console.log('   ✅ File Storage Delete PASSED')
    } else {
      throw new Error('File Storage Deletion FAILED')
    }
  } else {
    throw new Error('File Storage Save FAILED')
  }

  // 4. Test CSV Export Formatting
  console.log('4️⃣ Testing CSV Export Formatting Utility...')
  const sampleData = [
    { name: 'John Doe', email: 'john@example.com', role: 'Agent' },
    { name: 'Jane Smith', email: 'jane@example.com', role: 'Broker' },
  ]
  const columns = [
    { header: 'Full Name', key: 'name' },
    { header: 'Email Address', key: 'email' },
  ]
  const csvResult = formatAsCSV(sampleData, columns)

  if (csvResult.includes('"Full Name"') && csvResult.includes('"John Doe"')) {
    console.log('   ✅ CSV Export Formatting PASSED')
  } else {
    throw new Error('CSV Export Formatting FAILED')
  }

  // 5. Test CSV Importer Parsing & Header Auto-Mapping
  console.log('5️⃣ Testing CSV Importer Preview & Mapping...')
  const mockCsvString = 'First Name,Last Name,Email,Phone\nAlice,Johnson,alice@crm.com,+1234567890\nBob,Williams,bob@crm.com,+0987654321'
  const preview = previewCsvFile(Buffer.from(mockCsvString))

  if (
    preview.headers.length === 4 &&
    preview.suggestedMapping['First Name'] === 'firstName' &&
    preview.suggestedMapping['Email'] === 'email'
  ) {
    console.log('   ✅ CSV Importer Preview & Auto-Mapping PASSED')
  } else {
    throw new Error('CSV Importer Preview & Auto-Mapping FAILED')
  }

  console.log('\n🎉 ALL SPRINT 20 VERIFICATION TESTS PASSED SUCCESSFULLY!')
}

runSprint20Tests().catch((err) => {
  console.error('\n❌ SPRINT 20 TESTS FAILED:', err)
  process.exit(1)
})
