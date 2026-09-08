export interface ExtractedTask {
  title: string
  dueDate?: string
  priority?: 'low' | 'medium' | 'high'
}

export interface ExtractedVoiceEntities {
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  summary: string
  discussionPoints: string[]
  nextFollowUpDate?: string | null
  tasks: ExtractedTask[]
  dealStage?: string | null
  dealNotes?: string | null
  sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent'
  propertyAddress?: string | null
  tags: string[]
}

export interface VoiceNoteResult {
  audioUrl: string
  storageKey: string
  durationSeconds?: number
  transcription: string
  transcriptionProvider: 'openai' | 'groq' | 'local_fallback'
  extractedEntities: ExtractedVoiceEntities
  contactUpdated: boolean
  contact?: {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
    notes?: string
    nextFollowUpDate?: string | null
    tags?: string[]
  }
  activityId?: string
  dealUpdated?: boolean
  dealId?: string
}

export interface ProcessVoiceNoteOptions {
  contactId?: string
  dealId?: string
  promptHint?: string
}

export interface TextExtractInput {
  text: string
  contactId?: string
}
