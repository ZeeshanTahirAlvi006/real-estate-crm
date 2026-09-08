import { connectDB } from '../config/db.js'
import { Contact } from '../models/Contact.js'
import { Conversation } from '../models/Conversation.js'
import { Message } from '../models/Message.js'

async function runCleanup() {
  await connectDB()
  console.log('--- Cleaning up and Unifying Contacts & Conversations ---')

  const phoneSuffix = '3390098621'
  const contacts = await Contact.find({ phone: { $regex: phoneSuffix } }).sort({ createdAt: 1 })
  console.log(`Found ${contacts.length} contacts for phone suffix ${phoneSuffix}`)

  if (contacts.length === 0) {
    console.log('No contacts found.')
    process.exit(0)
  }

  // Primary Contact (the original one)
  const primaryContact = contacts[0]
  primaryContact.isDeleted = false
  primaryContact.status = 'active'
  primaryContact.dncStatus = 'clean'
  primaryContact.optedOutAt = undefined
  await primaryContact.save()
  console.log(`✅ Primary Contact restored: ${primaryContact._id} (${primaryContact.firstName} ${primaryContact.lastName})`)

  // Find or create primary conversation
  let primaryConv = await Conversation.findOne({
    $or: [{ contactId: primaryContact._id }, { contactPhone: { $regex: phoneSuffix } }],
  }).sort({ createdAt: 1 })

  if (!primaryConv) {
    primaryConv = await Conversation.create({
      brokerageId: primaryContact.brokerageId,
      contactId: primaryContact._id,
      contactName: `${primaryContact.firstName} ${primaryContact.lastName}`.trim(),
      contactPhone: primaryContact.phone,
      contactEmail: primaryContact.email || '',
      lastMessageText: 'Hello',
      lastMessageAt: new Date(),
      lastChannel: 'whatsapp',
      unreadCount: 0,
      aiIsaEnabled: false,
    })
  } else {
    primaryConv.contactId = primaryContact._id
    primaryConv.contactName = `${primaryContact.firstName} ${primaryContact.lastName}`.trim()
    primaryConv.contactPhone = primaryContact.phone
    primaryConv.lastChannel = 'whatsapp'
    await primaryConv.save()
  }
  console.log(`✅ Primary Conversation unified: ${primaryConv._id}`)

  // Re-link all messages for any of the contacts/conversations to the primary conversation
  const allContactIds = contacts.map((c) => c._id)
  const allConvs = await Conversation.find({
    $or: [{ contactId: { $in: allContactIds } }, { contactPhone: { $regex: phoneSuffix } }],
  })
  const allConvIds = allConvs.map((cv) => cv._id)

  const reassignRes = await Message.updateMany(
    {
      $or: [{ contactId: { $in: allContactIds } }, { conversationId: { $in: allConvIds } }],
    },
    {
      $set: {
        contactId: primaryContact._id,
        conversationId: primaryConv._id,
      },
    }
  )
  console.log(`✅ Reassigned ${reassignRes.modifiedCount} messages to primary conversation ${primaryConv._id}`)

  // Delete duplicate contacts (other than primary)
  for (let i = 1; i < contacts.length; i++) {
    await Contact.deleteOne({ _id: contacts[i]._id })
    console.log(`🗑️ Deleted duplicate contact: ${contacts[i]._id}`)
  }

  // Delete duplicate conversations (other than primary)
  for (const cv of allConvs) {
    if (cv._id.toString() !== primaryConv._id.toString()) {
      await Conversation.deleteOne({ _id: cv._id })
      console.log(`🗑️ Deleted duplicate conversation: ${cv._id}`)
    }
  }

  // Check latest 5 messages now in the unified conversation
  const finalMessages = await Message.find({ conversationId: primaryConv._id }).sort({ createdAt: 1 })
  console.log(`\n📬 Total Messages in Unified Thread: ${finalMessages.length}`)
  finalMessages.forEach((m, idx) => {
    console.log(
      `  [${idx + 1}] [${m.direction.toUpperCase()}] [${m.channel}] ${m.senderName}: "${m.body}" (${m.createdAt.toISOString()})`
    )
  })

  console.log('\n--- Cleanup Complete ---')
  process.exit(0)
}

runCleanup().catch((err) => {
  console.error('Cleanup error:', err)
  process.exit(1)
})
