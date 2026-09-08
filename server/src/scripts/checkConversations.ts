import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()
import { Conversation } from '../models/Conversation.js'
import { Contact } from '../models/Contact.js'

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI as string)
  console.log('Connected to DB')

  const convos = await Conversation.find().limit(10).lean()
  console.log(`Found ${convos.length} conversations:`)
  for (const c of convos) {
    const contact = await Contact.findById(c.contactId).lean()
    console.log({
      id: c._id.toString(),
      contactName: c.contactName,
      convContactEmail: c.contactEmail,
      contactDocEmail: contact?.email,
      lastChannel: c.lastChannel,
      channel: (c as any).channel,
    })
  }
}

inspect()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('ERROR:', err)
    process.exit(1)
  })
