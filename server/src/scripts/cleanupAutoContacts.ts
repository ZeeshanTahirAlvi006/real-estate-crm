import { connectDB } from '../config/db.js'
import { Contact } from '../models/Contact.js'
import { Conversation } from '../models/Conversation.js'
import { Message } from '../models/Message.js'

async function cleanup() {
  await connectDB()

  // Remove any contacts with leadSource: 'Incoming Email' from earlier test sync
  const query = { leadSource: 'Incoming Email' }

  const contactsToDelete = await Contact.find(query)
  const contactIds = contactsToDelete.map((c) => c._id)

  await Message.deleteMany({ contactId: { $in: contactIds } })
  await Conversation.deleteMany({ contactId: { $in: contactIds } })
  const res = await Contact.deleteMany({ _id: { $in: contactIds } })

  console.log(`Cleaned up ${res.deletedCount} automated test contacts from CRM database.`)
  process.exit(0)
}

cleanup()
