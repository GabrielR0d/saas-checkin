import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Ionicons } from '@expo/vector-icons'
import { getSummary, getAccessLogs } from '../../api'
import { useSocket } from '../../hooks/useSocket'
import { COLORS, EVENT_LABELS } from '../../constants'
import type { AccessLog, DashboardSummary } from '../../types'

type KpiKey = keyof DashboardSummary

const KPI_CONFIG: Array<{
  key: KpiKey
  label: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  color: string
  bg: string
}> = [
  { key: 'totalClients', label: 'Clientes', icon: 'people-outline', color: COLORS.primary, bg: COLORS.primaryLight },
  { key: 'totalCards', label: 'Cartões', icon: 'card-outline', color: '#6366f1', bg: '#eef2ff' },
  { key: 'totalDevices', label: 'Leitores', icon: 'hardware-chip-outline', color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'todayEntries', label: 'Entradas', icon: 'log-in-outline', color: COLORS.success, bg: '#ecfdf5' },
  { key: 'todayExits', label: 'Saídas', icon: 'log-out-outline', color: '#0ea5e9', bg: '#f0f9ff' },
  { key: 'unknownCards', label: 'Desconhecidos', icon: 'warning-outline', color: COLORS.warning, bg: '#fffbeb' },
]

export default function DashboardScreen() {
  const qc = useQueryClient()
  const [liveEvents, setLiveEvents] = useState<AccessLog[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: getSummary,
    refetchInterval: 30_000,
  })

  const { data: recentLogs } = useQuery({
    queryKey: ['recent-logs'],
    queryFn: () => getAccessLogs({ limit: 10 }),
  })

  const handleAccessNew = useCallback(
    (data: unknown) => {
      const log = data as AccessLog
      setLiveEvents((prev) => [log, ...prev].slice(0, 20))
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
    [qc],
  )

  useSocket('access:new', handleAccessNew)

  const onRefresh = async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['summary'] })
    await qc.invalidateQueries({ queryKey: ['recent-logs'] })
    setRefreshing(false)
  }

  const displayEvents = liveEvents.length > 0 ? liveEvents : (recentLogs?.data ?? [])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        {liveEvents.length > 0 && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>AO VIVO</Text>
          </View>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.grid}>
        {KPI_CONFIG.map(({ key, label, icon, color, bg }) => (
          <View key={key} style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: bg }]}>
              <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.kpiValue}>{summary?.[key] ?? '—'}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Recent events */}
      <Text style={styles.sectionTitle}>Eventos recentes</Text>
      <View style={styles.eventList}>
        {displayEvents.map((event, index) => {
          const cfg = EVENT_LABELS[event.eventType] ?? EVENT_LABELS.UNKNOWN_CARD
          const isFirst = index === 0 && liveEvents.length > 0
          return (
            <View key={event.id} style={[styles.eventRow, isFirst && styles.eventRowLive]}>
              <Text style={styles.eventEmoji}>{cfg.emoji}</Text>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>
                  {event.client?.name ?? `UID: ${event.cardUid}`}
                </Text>
                <Text style={styles.eventDevice}>{event.device?.name ?? 'Leitor'}</Text>
              </View>
              <View style={styles.eventRight}>
                <Text style={[styles.eventLabel, { color: cfg.color }]}>{cfg.label}</Text>
                <Text style={styles.eventTime}>
                  {format(new Date(event.createdAt), 'HH:mm:ss')}
                </Text>
              </View>
            </View>
          )
        })}
        {displayEvents.length === 0 && (
          <Text style={styles.empty}>Aguardando eventos...</Text>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger },
  liveText: { fontSize: 11, fontWeight: '700', color: COLORS.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  kpiCard: {
    width: '31%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  kpiLabel: { fontSize: 11, color: COLORS.gray500, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.gray700, marginBottom: 12 },
  eventList: { backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.gray100, overflow: 'hidden' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray50,
  },
  eventRowLive: { borderLeftWidth: 3, borderLeftColor: COLORS.primary, backgroundColor: '#eff6ff' },
  eventEmoji: { fontSize: 20, marginRight: 12 },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 14, fontWeight: '600', color: COLORS.gray900 },
  eventDevice: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  eventRight: { alignItems: 'flex-end' },
  eventLabel: { fontSize: 12, fontWeight: '600' },
  eventTime: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.gray400, paddingVertical: 24, fontSize: 14 },
})
