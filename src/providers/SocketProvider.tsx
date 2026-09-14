import { useEffect, useRef, createContext, useContext, type ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { baseApi } from '@/store/api/baseApi'
import { toast } from 'sonner'

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
})

export const useSocket = () => useContext(SocketContext)

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null)
  const dispatch = useAppDispatch()
  const { isAuthenticated, user, token } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const apiUrl = import.meta.env.API_URL
    const socketUrl = apiUrl
      ? apiUrl.replace(/\/api\/?$/, '')
      : 'https://proppulseoscrm.onrender.com'

    // Retrieve active token for WebSocket authentication (bypasses cross-origin cookie restrictions)
    let authToken = token
    if (!authToken && typeof window !== 'undefined') {
      try {
        authToken = localStorage.getItem('proppulse_access_token')
      } catch { }
    }

    const socket = io(socketUrl, {
      auth: {
        token: authToken || undefined,
      },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('⚡ Connected to PropPulse OS Real-Time WebSocket')
    })

    // 1. Real-time Incoming Message
    socket.on('message:new', (data: any) => {
      if (!data) return
      const message = data.message || data
      const convId =
        data.conversationId ||
        data.conversation?.id ||
        data.conversation?._id ||
        message?.conversationId

      // Invalidate RTK Query cache for messages and conversation list
      if (convId) {
        dispatch(baseApi.util.invalidateTags(['Conversations', 'Messages', { type: 'Messages', id: convId }]))
      } else {
        dispatch(baseApi.util.invalidateTags(['Conversations', 'Messages']))
      }

      if (
        message &&
        (message.direction === 'inbound' ||
          message.sender === 'lead' ||
          message.senderType === 'lead' ||
          message.sender === 'ai_isa')
      ) {
        const msgId = message.id || message._id
        toast.info(`💬 New message from ${message.senderName || 'Lead'}`, {
          id: msgId ? `msg-${msgId}` : undefined,
          description: (message.body || '').slice(0, 80),
        })
      }
    })

    // 2. Real-time Conversation List Update
    socket.on('conversation:updated', () => {
      dispatch(baseApi.util.invalidateTags(['Conversations', 'Messages']))
    })

    // 3. Real-time Push Notification (Central Toast Broadcaster with Deduplication)
    socket.on('notification:new', (notification) => {
      if (!notification) return
      dispatch(baseApi.util.invalidateTags(['Notifications']))

      // Suppress toast if this notification was triggered by the current user's own action
      // (the user already received immediate direct UI feedback / optimistic toast)
      const actorId =
        notification.metadata?.actorId ||
        notification.metadata?.userId ||
        notification.metadata?.movedByUserId
      if (actorId && user?.id && String(actorId) === String(user.id)) {
        return
      }

      const notifId =
        notification.id ||
        notification._id ||
        `${notification.title}-${notification.createdAt || ''}`

      toast(notification.title || 'Notification', {
        id: notifId ? `notif-${notifId}` : undefined,
        description: notification.message,
      })
    })

    // 4. Real-time Lead Intake (Data-sync invalidation only; visual alert handled by notification:new)
    socket.on('lead:new', (payload) => {
      if (!payload?.lead) return
      dispatch(baseApi.util.invalidateTags(['Contacts', 'Leads', 'LeadSources']))
    })

    // 5. Real-time Deal Stage Progression (Data-sync invalidation only; Kanban updates silently in real time)
    socket.on('deal:stageChanged', (payload) => {
      if (!payload?.deal) return
      dispatch(baseApi.util.invalidateTags(['Deals', 'Pipeline']))
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, user?.id, token, dispatch])

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected: socketRef.current?.connected ?? false,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
