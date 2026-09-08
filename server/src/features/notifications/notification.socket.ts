import { Server as SocketIOServer } from 'socket.io'
import type { AuthenticatedSocket } from '../../config/socket.js'
// import { logger } from '../../utils/logger.js'

export const registerNotificationSocketHandlers = (
  _io: SocketIOServer,
  socket: AuthenticatedSocket
): void => {
  const user = socket.data.user
  if (!user) return

  const userId = user._id.toString()
  const brokerageId = user.brokerageId?.toString()

  // Ensure socket joins user-specific and brokerage notification channels
  if (userId) {
    socket.join(`user:${userId}`)
  }
  if (brokerageId) {
    socket.join(`brokerage:${brokerageId}`)
  }

  // Handle client notification acknowledgment or read sync
  socket.on('notification:ack', (payload: { notificationId: string }) => {
    if (!payload?.notificationId) return
    // Client acknowledged notification receipt
  })
}

/**
 * Broadcast notification to a specific user or the entire brokerage
 */
export const emitNotificationToRooms = (
  io: SocketIOServer | null,
  notification: any,
  userId?: string,
  brokerageId?: string
): void => {
  if (!io) return

  if (userId) {
    io.to(`user:${userId}`).emit('notification:new', notification)
  } else if (brokerageId) {
    io.to(`brokerage:${brokerageId}`).emit('notification:new', notification)
  }
}
