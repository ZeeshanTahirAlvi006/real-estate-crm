import { Server as SocketIOServer } from 'socket.io'
import mongoose from 'mongoose'
import type { AuthenticatedSocket } from '../../config/socket.js'
import { Conversation } from '../../models/Conversation.js'
import { USER_ROLES } from '../../utils/constants.js'

export const registerInboxSocketHandlers = (
  _io: SocketIOServer,
  socket: AuthenticatedSocket
): void => {
  const user = socket.data.user
  if (!user) return

  const userId = user._id.toString()
  const userName = `${user.firstName} ${user.lastName}`

  // Join a specific conversation room (with strict tenant & role verification)
  socket.on('join:conversation', async (conversationId: string) => {
    if (!conversationId || typeof conversationId !== 'string') return
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return

    try {
      const conv = await Conversation.findById(conversationId)
      if (!conv) return

      // Strict tenant isolation: Cross-brokerage join is rejected
      if (!user.brokerageId || conv.brokerageId.toString() !== user.brokerageId.toString()) {
        return
      }

      // Super Admin privacy restriction: Cannot listen to conversations of other users or brokerage owners
      if (user.role === USER_ROLES.SUPER_ADMIN) {
        if (!conv.assignedAgentId || conv.assignedAgentId.toString() !== user._id.toString()) {
          return
        }
      }

      // Agent boundary: Can only listen to assigned or unassigned
      if (user.role === USER_ROLES.AGENT) {
        if (conv.assignedAgentId && conv.assignedAgentId.toString() !== user._id.toString()) {
          return
        }
      }

      const roomName = `conversation:${conversationId}`
      socket.join(roomName)
    } catch {
      // Ignore join failures
    }
  })

  // Leave a specific conversation room
  socket.on('leave:conversation', (conversationId: string) => {
    if (!conversationId || typeof conversationId !== 'string') return
    const roomName = `conversation:${conversationId}`
    socket.leave(roomName)
  })

  // Real-time typing indicators
  socket.on('typing:start', (conversationId: string) => {
    if (!conversationId || typeof conversationId !== 'string') return
    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      conversationId,
      userId,
      userName,
      isTyping: true,
    })
  })

  socket.on('typing:stop', (conversationId: string) => {
    if (!conversationId || typeof conversationId !== 'string') return
    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      conversationId,
      userId,
      userName,
      isTyping: false,
    })
  })

  // Real-time message read receipts
  socket.on('message:read', (payload: { conversationId: string; messageIds?: string[] }) => {
    if (!payload?.conversationId) return
    socket.to(`conversation:${payload.conversationId}`).emit('message:read_receipt', {
      conversationId: payload.conversationId,
      messageIds: payload.messageIds || [],
      readBy: userId,
      readAt: new Date().toISOString(),
    })
  })
}

/**
 * Broadcast new message to conversation room and notify brokerage room for list update
 */
export const emitNewMessageToRooms = (
  io: SocketIOServer | null,
  message: any,
  conversation: any
): void => {
  if (!io) return

  const convId = conversation._id?.toString() || conversation.id
  const brokerageId = conversation.brokerageId?.toString()

  if (convId) {
    io.to(`conversation:${convId}`).emit('message:new', { message, conversation })
  }

  if (brokerageId) {
    io.to(`brokerage:${brokerageId}`).emit('conversation:updated', {
      conversation,
      lastMessage: message,
    })
  }
}
