export interface User {
  id: string
  name: string
  email: string
  role: string
  tenantId: string
}

export type AccessEventType = 'ENTRY' | 'EXIT' | 'UNKNOWN_CARD' | 'BLOCKED_CARD'
export type AccessDirection = 'IN' | 'OUT'

export interface AccessLog {
  id: string
  cardUid: string
  eventType: AccessEventType
  direction: AccessDirection
  occurredAt: string
  client: { id: string; name: string; phone: string } | null
  device: { id: string; name: string; location: string | null } | null
}

export interface Device {
  id: string
  name: string
  location: string | null
  isOnline: boolean
  lastHeartbeat: string | null
  createdAt: string
}

export interface TenantSettings {
  id: string
  tenantId: string
  notifyOnEntry: boolean
  notifyOnExit: boolean
  notifyOnUnknown: boolean
  whatsappProvider: string | null
  whatsappInstanceId: string | null
  whatsappToken: string | null
  whatsappApiUrl: string | null
  pushToken: string | null
}
