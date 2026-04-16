export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'VIEWER'
export type CardStatus = 'ACTIVE' | 'BLOCKED' | 'LOST'
export type AccessEventType = 'ENTRY' | 'EXIT' | 'UNKNOWN_CARD' | 'BLOCKED_CARD'
export type Plan = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  tenantId: string
  plan?: Plan
}

export interface Client {
  id: string
  name: string
  phone: string
  email?: string
  document?: string
  isActive: boolean
  tenantId: string
  cards?: Card[]
  _count?: { cards: number }
  createdAt: string
}

export interface Card {
  id: string
  uid: string
  label?: string
  status: CardStatus
  clientId?: string
  client?: Client
  lastSeenAt?: string
  tenantId: string
  createdAt: string
}

export interface Device {
  id: string
  name: string
  location?: string
  apiKey: string
  isOnline: boolean
  lastHeartbeat?: string
  tenantId: string
}

export interface AccessLog {
  id: string
  eventType: AccessEventType
  cardUid: string
  clientId?: string
  client?: Client
  deviceId: string
  device?: Device
  whatsappSent: boolean
  tenantId: string
  createdAt: string
}

export interface DashboardSummary {
  totalClients: number
  totalCards: number
  totalDevices: number
  todayEntries: number
  todayExits: number
  unknownCards: number
}

export interface Pagination<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
