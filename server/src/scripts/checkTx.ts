import mongoose from 'mongoose'

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/proppulse_crm')
  
  const txs = await mongoose.connection.db!.collection('transactions').find({}).toArray()
  console.log('=== TRANSACTIONS ===')
  txs.forEach(t => console.log({
    id: t._id,
    address: t.propertyAddress,
    assignedAgentId: t.assignedAgentId,
    assignedAgentIdType: typeof t.assignedAgentId,
    isObjectId: t.assignedAgentId instanceof mongoose.Types.ObjectId,
    assignedAgentName: t.assignedAgentName,
    brokerageId: t.brokerageId,
    dealId: t.dealId,
  }))

  const users = await mongoose.connection.db!.collection('users').find({}).toArray()
  console.log('=== USERS ===')
  users.forEach(u => console.log({
    id: u._id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role,
    brokerageId: u.brokerageId,
  }))

  const deals = await mongoose.connection.db!.collection('deals').find({}).toArray()
  console.log('=== DEALS ===')
  deals.forEach(d => console.log({
    id: d._id,
    address: d.propertyAddress,
    assignedAgentId: d.assignedAgentId,
    assignedAgentName: d.assignedAgentName,
    brokerageId: d.brokerageId,
    isConvertedToEscrow: d.isConvertedToEscrow,
    transactionId: d.transactionId,
  }))

  await mongoose.disconnect()
}

check().catch(console.error)
