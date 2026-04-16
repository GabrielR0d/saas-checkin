import { api } from './client'
import type {
  AccessLog,
  Card,
  Client,
  DashboardSummary,
  Device,
  Pagination,
  PlanInfo,
  TenantSettings,
  User,
} from '../types'

// Auth
export const login = (email: string, password: string) =>
  api.post<{ accessToken: string; user: User }>('/auth/login', { email, password }).then((r) => r.data)

export const signup = (data: {
  name: string
  email: string
  password: string
  companyName: string
  slug: string
}) => api.post('/auth/signup', data).then((r) => r.data)

export const checkSlug = (slug: string) =>
  api.get<{ available: boolean }>(`/auth/check-slug?slug=${slug}`).then((r) => r.data)

// Reports
export const getSummary = () =>
  api.get<DashboardSummary>('/reports/summary').then((r) => r.data)

export const exportCsv = (params?: Record<string, string>) =>
  api.get('/reports/export/csv', { params, responseType: 'blob' }).then((r) => r.data as Blob)

// Access Logs
export const getAccessLogs = (params?: Record<string, string | number>) =>
  api.get<Pagination<AccessLog>>('/access-logs', { params }).then((r) => r.data)

// Clients
export const getClients = (params?: Record<string, string | number>) =>
  api.get<Pagination<Client>>('/clients', { params }).then((r) => r.data)

export const createClient = (data: Partial<Client>) =>
  api.post<Client>('/clients', data).then((r) => r.data)

export const updateClient = (id: string, data: Partial<Client>) =>
  api.put<Client>(`/clients/${id}`, data).then((r) => r.data)

export const deleteClient = (id: string) =>
  api.delete(`/clients/${id}`).then((r) => r.data)

// Cards
export const getCards = (params?: Record<string, string | number>) =>
  api.get<Pagination<Card>>('/cards', { params }).then((r) => r.data)

export const createCard = (data: Partial<Card>) =>
  api.post<Card>('/cards', data).then((r) => r.data)

export const updateCard = (id: string, data: Partial<Card>) =>
  api.put<Card>(`/cards/${id}`, data).then((r) => r.data)

// Devices
export const getDevices = (params?: Record<string, string | number>) =>
  api.get<Pagination<Device>>('/devices', { params }).then((r) => r.data)

export const createDevice = (data: Partial<Device>) =>
  api.post<Device>('/devices', data).then((r) => r.data)

export const updateDevice = (id: string, data: Partial<Device>) =>
  api.put<Device>(`/devices/${id}`, data).then((r) => r.data)

export const rotateDeviceKey = (id: string) =>
  api.post<Device>(`/devices/${id}/rotate-key`).then((r) => r.data)

// Settings
export const getSettings = () =>
  api.get<TenantSettings>('/settings').then((r) => r.data)

export const updateSettings = (data: Partial<TenantSettings>) =>
  api.patch<TenantSettings>('/settings', data).then((r) => r.data)

// WhatsApp
export const getWhatsappStatus = () =>
  api.get('/whatsapp/status').then((r) => r.data)

export const getWhatsappQrCode = () =>
  api.get<{ qrcode: string }>('/whatsapp/qrcode').then((r) => r.data)

// Plans / Billing
export const getPlans = () =>
  api.get<PlanInfo[]>('/billing/plans').then((r) => r.data)

export const createCheckout = (plan: string) =>
  api.post<{ url: string }>('/billing/checkout', { plan }).then((r) => r.data)
