export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

export const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#eff6ff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#ffffff',
  black: '#000000',
}

export const EVENT_LABELS = {
  ENTRY: { label: 'Entrada', color: COLORS.success, emoji: '✅' },
  EXIT: { label: 'Saída', color: COLORS.primary, emoji: '👋' },
  UNKNOWN_CARD: { label: 'Desconhecido', color: COLORS.warning, emoji: '⚠️' },
  BLOCKED_CARD: { label: 'Bloqueado', color: COLORS.danger, emoji: '🚫' },
} as const
