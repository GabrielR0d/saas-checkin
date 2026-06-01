export interface User {
  id: string
  name: string
  email: string
  role: string
  tenantId: string
}

export interface Client {
  id: string
  name: string
  phone: string
  email?: string
  document?: string
  isActive: boolean
  _count?: { cards: number }
  createdAt: string
}

export interface Card {
  id: string
  uid: string
  label?: string
  status: 'ACTIVE' | 'BLOCKED' | 'LOST'
  clientId?: string
  client?: Pick<Client, 'id' | 'name'>
  createdAt: string
}

export interface Device {
  id: string
  name: string
  location?: string
  isOnline: boolean
  lastHeartbeat?: string
  apiKey: string
  createdAt: string
}

export interface AccessLog {
  id: string
  eventType: 'ENTRY' | 'EXIT' | 'UNKNOWN_CARD' | 'BLOCKED_CARD'
  cardUid: string
  clientId?: string
  deviceId: string
  whatsappSent: boolean
  createdAt: string
  client?: Pick<Client, 'id' | 'name'>
  device?: Pick<Device, 'id' | 'name'>
  card?: Pick<Card, 'id' | 'uid' | 'label'>
}

export interface ReportSummary {
  totalClients: number
  totalCards: number
  totalDevices: number
  todayEntries: number
  todayExits: number
  unknownCards: number
}

export interface Settings {
  notifyEntry: boolean
  notifyExit: boolean
  notifyUnknown: boolean
  whatsappProvider: 'EVOLUTION' | 'ZAPI'
  whatsappInstanceId?: string
  whatsappToken?: string
  whatsappApiUrl?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
