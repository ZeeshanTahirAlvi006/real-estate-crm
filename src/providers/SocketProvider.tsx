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
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

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
      : 'https://real-estate-crm-4748.onrender.com'

    const socket = io(socketUrl, {
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
        toast.info(`💬 New message from ${message.senderName || 'Lead'}`, {
          description: (message.body || '').slice(0, 80),
        })
      }
    })

    // 2. Real-time Conversation List Update
    socket.on('conversation:updated', () => {
      dispatch(baseApi.util.invalidateTags(['Conversations', 'Messages']))
    })

    // 3. Real-time Push Notification
    socket.on('notification:new', (notification) => {
      if (!notification) return
      dispatch(baseApi.util.invalidateTags(['Notifications']))
      toast(notification.title || 'Notification', {
        description: notification.message,
      })
    })

    // 4. Real-time Lead Intake Alert
    socket.on('lead:new', (payload) => {
      if (!payload?.lead) return
      const lead = payload.lead
      dispatch(baseApi.util.invalidateTags(['Contacts', 'Leads', 'LeadSources']))
      toast.success('🔥 New Lead Ingested', {
        description: `${lead.firstName} ${lead.lastName} (Score: ${lead.leadScore || 50})`,
      })
    })

    // 5. Real-time Deal Stage Progression
    socket.on('deal:stageChanged', (payload) => {
      if (!payload?.deal) return
      const deal = payload.deal
      dispatch(baseApi.util.invalidateTags(['Deals', 'Pipeline']))
      toast.info('🚀 Deal Stage Updated', {
        description: `${deal.propertyAddress || 'Deal'} moved to ${deal.stageName || 'next stage'}`,
      })
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, user, dispatch])

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
