import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { verifyAccessToken, verifyRefreshToken, TokenPayload } from '../utils/tokenHelper.js'
import { User, IUser } from '../models/User.js'
import { COOKIE_NAMES } from '../utils/constants.js'
import { env } from './env.js'
import { logger } from '../utils/logger.js'
import { registerInboxSocketHandlers, emitNewMessageToRooms } from '../features/inbox/inbox.socket.js'
import { registerNotificationSocketHandlers, emitNotificationToRooms } from '../features/notifications/notification.socket.js'

import mongoose from 'mongoose'
import { userAuthCache, warmUserAuthCache } from '../middleware/authenticate.js'
import { cacheGet } from './redis.js'
import { safeJsonParse } from '../utils/cacheHelper.js'

let io: SocketIOServer | null = null

// Robust cookie header parser for WebSocket handshake
const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {}
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
  const clientUrl = env.CLIENT_URL ? env.CLIENT_URL.replace(/\/$/, '') : ''

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) return callback(null, true)
        const clean = requestOrigin.replace(/\/$/, '')
        if (
          clean === clientUrl ||
          /^https:\/\/[a-z0-9-.]+\.vercel\.app$/.test(clean) ||
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean)
        ) {
          callback(null, true)
        } else {
          callback(null, false)
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // WebSocket handshake non-blocking authentication middleware (Issue 4)
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // 1. Support auth token from socket handshake auth object, Bearer header, OR cookies
      const authObjToken = (socket.handshake.auth as any)?.token
      const headerAuth = socket.handshake.headers.authorization
      const bearerToken = headerAuth && headerAuth.startsWith('Bearer ') ? headerAuth.slice(7) : null

      const parsedCookies = parseCookies(socket.handshake.headers.cookie)
      const cookieAccessToken = parsedCookies[COOKIE_NAMES.ACCESS_TOKEN]
      const cookieRefreshToken = parsedCookies[COOKIE_NAMES.REFRESH_TOKEN]

      const accessToken = authObjToken || bearerToken || cookieAccessToken
      const refreshToken = (socket.handshake.auth as any)?.refreshToken || cookieRefreshToken

      let userId: string | null = null
      let payload: TokenPayload | null = null

      if (accessToken) {
        try {
          payload = verifyAccessToken(accessToken)
          userId = payload.userId || (payload as any).id
        } catch {
          // Token expired, attempt refresh fallback below
        }
      }

      if (!userId && refreshToken) {
        try {
          payload = verifyRefreshToken(refreshToken)
          userId = payload.userId || (payload as any).id
        } catch {
          // Refresh token also invalid
        }
      }

      if (!userId) {
        return next(new Error('Authentication error: Missing or invalid session tokens'))
      }

      // 2. Non-blocking fast path: check L1 In-Memory Cache (< 0.05ms)
      const l1User = userAuthCache.get(userId)
      if (l1User && l1User.isActive) {
        socket.data.user = l1User
        socket.data.tokenPayload = payload || undefined
        return next()
      }

      // 3. Check L2 Distributed Redis Cache (< 0.3ms)
      try {
        const l2Raw = await cacheGet(`auth:user:${userId}`)
        if (l2Raw) {
          const l2User = safeJsonParse<any>(l2Raw)
          if (l2User && l2User.isActive) {
            userAuthCache.set(userId, l2User, 60)
            socket.data.user = l2User
            socket.data.tokenPayload = payload || undefined
            return next()
          }
        }
      } catch {
        // Fallback gracefully
      }

      // 4. Cold fallback: covered projection from DB if connected
      if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(userId)) {
        const user = (await User.findById(new mongoose.Types.ObjectId(userId))
          .select('_id role brokerageId isActive')
          .lean()) as unknown as IUser

        if (!user || !user.isActive) {
          return next(new Error('Authentication error: User inactive or not found'))
        }

        warmUserAuthCache(userId, user).catch(() => {})
        socket.data.user = user
        socket.data.tokenPayload = payload || undefined
        return next()
      }

      // 5. Direct token payload fallback if DB is isolated
      socket.data.user = {
        _id: userId,
        id: userId,
        role: payload?.role,
        brokerageId: payload?.brokerageId,
        isActive: true,
      } as any
      socket.data.tokenPayload = payload || undefined
      next()
    } catch {
      logger.warn('Socket authentication failed during handshake')
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
