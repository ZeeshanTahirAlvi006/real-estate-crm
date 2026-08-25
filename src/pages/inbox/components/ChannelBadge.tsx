import React from 'react'
import type { ChannelType } from '@/types/communication'
import {
  ChatBubbleLeftEllipsisIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline'

interface ChannelBadgeProps {
  channel: ChannelType
  showLabel?: boolean
  className?: string
}

export const ChannelBadge: React.FC<ChannelBadgeProps> = ({
  channel,
  showLabel = false,
  className = '',
}) => {
  switch (channel) {
    case 'whatsapp':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          <span>WhatsApp</span>
        </span>
      )
    case 'sms':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 ${className}`}
        >
          <ChatBubbleLeftEllipsisIcon className="w-3 h-3" />
          {showLabel && <span>SMS</span>}
        </span>
      )
    case 'email':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 ${className}`}
        >
          <EnvelopeIcon className="w-3 h-3" />
          {showLabel && <span>Email</span>}
        </span>
      )
    case 'call':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 ${className}`}
        >
          <PhoneIcon className="w-3 h-3" />
          {showLabel && <span>Call</span>}
        </span>
      )
    default:
      return null
  }
}
