import type { DuplicateStatus } from '../../models/DuplicateCandidate.js'

// ── Contact DTO for Duplicate Presentation ──────────────
export interface DuplicateContactSummary {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  tags: string[]
  leadSource: string
  leadScore: number
  dealCount: number
  activityCount: number
  createdAt: string
}

export interface DuplicateCandidateDto {
  id: string
  contact1: DuplicateContactSummary
  contact2: DuplicateContactSummary
  matchScore: number
  matchFields: string[]
  status: DuplicateStatus
  createdAt: string
}

// ── Health Score Response ───────────────────────────────
export interface DataHealthTrendItem {
  date: string
  score: number
}

export interface DataHealthScoreResponse {
  overallScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  duplicatesFound: number
  unverifiedPhones: number
  invalidEmails: number
  missingFields: number
  totalContacts: number
  lastScanAt: string
  trend: DataHealthTrendItem[]
}

// ── Merge Request DTO ───────────────────────────────────
export interface MergeContactInput {
  primaryContactId: string
  secondaryContactId: string
  fieldOverrides?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    tags?: string[]
    notes?: string
  }
}

// ── Scan Result DTO ─────────────────────────────────────
export interface ScanResultDto {
  scannedCount: number
  issuesFound: number
  message: string
}

// ── Contact Data Hygiene Issue DTOs ────────────────────
export interface ContactDataIssue {
  type: 'email' | 'phone' | 'missing'
  field: string
  title: string
  description: string
  severity: 'error' | 'warning' | 'info'
}

export interface ContactWithDataIssues {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  leadSource: string
  leadScore: number
  status: string
  tags: string[]
  notes?: string
  propertyInterests?: string[]
  assignedAgentName?: string
  dealCount: number
  activityCount: number
  createdAt: string
  updatedAt: string
  lastContactedAt?: string
  hasInvalidEmail: boolean
  hasInvalidPhone: boolean
  hasMissingFields: boolean
  issues: ContactDataIssue[]
}

