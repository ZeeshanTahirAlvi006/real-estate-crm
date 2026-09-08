import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { verifyAccessToken, verifyRefreshToken, TokenPayload } from '../utils/tokenHelper.js'
import { User, IUser } from '../models/User.js'
import { COOKIE_NAMES } from '../utils/constants.js'
import { env } from './env.js'
import { logger } from '../utils/logger.js'
import { registerInboxSocketHandlers, emitNewMessageToRooms } from '../features/inbox/inbox.socket.js'
import { registerNotificationSocketHandlers, emitNotificationToRooms } from '../features/notifications/notification.socket.js'

let io: SocketIOServer | null = null

// Robust cookie header parser for WebSocket handshake
const parseCookies = (cookieHeader: string): Record<string, string> => {
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach((cookieStr) => {
    const parts = cookieStr.split('=')
    const name = parts.shift()?.trim()
    if (name) {
      cookies[name] = decodeURIComponent(parts.join('=').trim())
    }
  })
  return cookies
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: IUser
    tokenPayload?: TokenPayload
  }
}

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // WebSocket handshake authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const rawCookies = socket.handshake.headers.cookie
      if (!rawCookies) {
        return next(new Error('Authentication error: Missing cookies'))
      }

      const parsedCookies = parseCookies(rawCookies)
      const accessToken = parsedCookies[COOKIE_NAMES.ACCESS_TOKEN]
      const refreshToken = parsedCookies[COOKIE_NAMES.REFRESH_TOKEN]

      let userId: string | null = null
      let payload: TokenPayload | null = null

      if (accessToken) {
        try {
          payload = verifyAccessToken(accessToken)
          userId = payload.userId
        } catch {
          // Token expired, attempt refresh token fallback
        }
      }

      if (!userId && refreshToken) {
        try {
          payload = verifyRefreshToken(refreshToken)
          userId = payload.userId
        } catch {
          // Refresh token also invalid
        }
      }

      if (!userId) {
        return next(new Error('Authentication error: Invalid session tokens'))
      }

      const user = await User.findById(userId)
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User inactive or not found'))
      }

      socket.data.user = user
      socket.data.tokenPayload = payload || undefined
      next()
    } catch {
      logger.error('Socket authentication failed during handshake')
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user
    if (!user) {
      socket.disconnect(true)
      return
    }

    const userId = user._id.toString()
    const brokerageId = user.brokerageId?.toString()

    // Join user-specific and brokerage rooms for tenant isolation
    socket.join(`user:${userId}`)
    if (brokerageId) {
      socket.join(`brokerage:${brokerageId}`)
    }

    logger.info(`Real-time client connected: user ${userId} (${user.role})`)

    // Register modular feature handlers
    if (io) {
      registerInboxSocketHandlers(io, socket)
      registerNotificationSocketHandlers(io, socket)
    }

    socket.on('disconnect', (reason) => {
      logger.info(`Real-time client disconnected: user ${userId} - Reason: ${reason}`)
    })
  })

  logger.info('⚡ Socket.io real-time server initialized')
  return io
}

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocketServer first.')
  }
  return io
}

export const getSocketServer = (): SocketIOServer | null => {
  return io
}

// ── Broadcast Helpers ─────────────────────────────────────

// Emit new chat message
export const emitNewMessage = (message: any, conversation: any) => {
  emitNewMessageToRooms(io, message, conversation)
}

// Emit new notification to a specific user or brokerage
export const emitNewNotification = (notification: any, userId?: string, brokerageId?: string) => {
  emitNotificationToRooms(io, notification, userId, brokerageId)
}

// Emit deal stage transition
export const emitDealStageChange = (deal: any, brokerageId: string) => {
  if (!io) return
  io.to(`brokerage:${brokerageId}`).emit('deal:stageChanged', { deal })
}

// Emit new lead ingested
export const emitNewLead = (lead: any, brokerageId: string, assignedAgentId?: string) => {
  if (!io) return
  io.to(`brokerage:${brokerageId}`).emit('lead:new', { lead })
  if (assignedAgentId) {
    io.to(`user:${assignedAgentId}`).emit('lead:assigned', { lead })
  }
}

// Emit transaction created
export const emitTransactionCreated = (transaction: any, brokerageId: string, assignedAgentId?: string) => {
  if (!io) return
  io.to(`brokerage:${brokerageId}`).emit('transaction:created', { transaction })
  if (assignedAgentId) {
    io.to(`user:${assignedAgentId}`).emit('transaction:assigned', { transaction })
  }
}

// Emit transaction updated
export const emitTransactionUpdated = (transaction: any, brokerageId: string, assignedAgentId?: string) => {
  if (!io) return
  io.to(`brokerage:${brokerageId}`).emit('transaction:updated', { transaction })
  if (assignedAgentId) {
    io.to(`user:${assignedAgentId}`).emit('transaction:updated', { transaction })
  }
}
