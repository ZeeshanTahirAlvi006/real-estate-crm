import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()
import { sendMessage } from '../features/inbox/inbox.service.js'
import { User } from '../models/User.js'

async function testSend() {
  await mongoose.connect(process.env.MONGODB_URI as string)
  console.log('Connected to DB')

  const user = await User.findOne({ email: 'superadmin@proppulse.com' })
  if (!user) throw new Error('User not found')

  console.log('Testing sendMessage as:', user.email)
  const res = await sendMessage('6a96dd3ca13cb7b3cf8ed984', {
    body: 'Hello Zeeshan! Testing live email delivery from PropPulse CRM.',
    channel: 'email',
  }, user)

  console.log('SEND MESSAGE RESULT:', res)
}

testSend()
  .then(() => {
    setTimeout(() => process.exit(0), 3000)
  })
  .catch((err) => {
    console.error('ERROR:', err)
    process.exit(1)
  })
