import dotenv from 'dotenv'
dotenv.config()
import { emailProvider } from '../features/communication/providers/email.provider.js'

async function testEmail() {
  console.log('Testing email provider...')
  const res = await emailProvider.send({
    to: 'zeeshantahiralvi123@gmail.com',
    subject: 'PropPulse SMTP Diagnostics Test',
    text: 'Testing live email transmission from PropPulse OS.'
  })
  console.log('EMAIL RESULT:', JSON.stringify(res, null, 2))
}

testEmail()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('TEST ERROR:', err)
    process.exit(1)
  })
