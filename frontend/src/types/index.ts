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
  phoneNumber?: string
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
  direction?: 'IN' | 'OUT'
  cardUid?: string | null
  clientId?: string
  deviceId?: string
  whatsappSent: boolean
  checkinSource?: 'whatsapp' | 'rfid' | null
  occurredAt: string
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
  todayWhatsappCheckins: number
}

export interface Settings {
  notifyOnEntry: boolean
  notifyOnExit: boolean
  notifyOnUnknown: boolean
  whatsappProvider: 'EVOLUTION' | 'ZAPI'
  whatsappInstanceId?: string
  whatsappToken?: string
  whatsappApiUrl?: string
  whatsappEnabled: boolean
  locationLat?: number | null
  locationLng?: number | null
  locationRadius: number
}

export interface PaginatedMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginatedMeta
}
