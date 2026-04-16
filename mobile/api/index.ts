import { api } from './client'
import type { AccessLog, Card, Client, DashboardSummary, Pagination, User } from '../types'

export const login = (email: string, password: string) =>
  api.post<{ accessToken: string; user: User }>('/auth/login', { email, password }).then((r) => r.data)

export const getSummary = () =>
  api.get<DashboardSummary>('/reports/summary').then((r) => r.data)

export const getAccessLogs = (params?: Record<string, string | number>) =>
  api.get<Pagination<AccessLog>>('/access-logs', { params }).then((r) => r.data)

export const getClients = (params?: Record<string, string | number>) =>
  api.get<Pagination<Client>>('/clients', { params }).then((r) => r.data)

export const createClient = (data: Partial<Client>) =>
  api.post<Client>('/clients', data).then((r) => r.data)

export const updateClient = (id: string, data: Partial<Client>) =>
  api.put<Client>(`/clients/${id}`, data).then((r) => r.data)

export const getCards = (params?: Record<string, string | number>) =>
  api.get<Pagination<Card>>('/cards', { params }).then((r) => r.data)

export const createCard = (data: { uid: string; label?: string; clientId?: string }) =>
  api.post<Card>('/cards', data).then((r) => r.data)

export const updateCard = (id: string, data: Partial<Card>) =>
  api.put<Card>(`/cards/${id}`, data).then((r) => r.data)

export const getSettings = () =>
  api.get('/settings').then((r) => r.data)

export const updateSettings = (data: Record<string, unknown>) =>
  api.patch('/settings', data).then((r) => r.data)

export const updatePushToken = (token: string) =>
  api.patch('/settings/push-token', { token }).then((r) => r.data)
