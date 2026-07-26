import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCheckIns } from '../../src/hooks/useCheckIns'
import type { AccessLog, AccessEventType } from '../../src/types'

const EVENT_CONFIG: Record<
  AccessEventType,
  { label: string; color: string; bg: string; icon: string }
> = {
  ENTRY: { label: 'Entrada', color: '#4ade80', bg: '#166534', icon: 'log-in' },
  EXIT: { label: 'Saída', color: '#fbbf24', bg: '#92400e', icon: 'log-out' },
  UNKNOWN_CARD: { label: 'Desconhecido', color: '#f87171', bg: '#7f1d1d', icon: 'help-circle' },
  BLOCKED_CARD: { label: 'Bloqueado', color: '#ef4444', bg: '#450a0a', icon: 'ban' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  return `há ${Math.floor(hrs / 24)}d`
}

function LogCard({ item }: { item: AccessLog }) {
  const cfg = EVENT_CONFIG[item.eventType]
  const isWhatsApp = item.checkinSource === 'whatsapp'
  return (
    <View style={styles.card}>
      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon as any} size={16} color="#fff" />
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.client?.name ?? item.cardUid ?? '—'}
          </Text>
          {isWhatsApp && (
            <View style={styles.waBadge}>
              <Text style={styles.waBadgeText}>WA</Text>
            </View>
          )}
        </View>
        <Text style={styles.sub}>
          {item.device?.name ?? (isWhatsApp ? 'WhatsApp' : 'Dispositivo desconhecido')} · {timeAgo(item.occurredAt)}
        </Text>
      </View>
      <Text style={[styles.eventLabel, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  )
}

export default function DashboardScreen() {
  const { data: logs, isLoading, refetch } = useCheckIns(50)

  return (
    <View style={styles.container}>
      <FlatList
        data={logs ?? []}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <LogCard item={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6366f1" />
        }
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>{isLoading ? 'A carregar...' : 'Sem registos'}</Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  list: { padding: 16, paddingTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: '#f1f5f9', fontWeight: '600', fontSize: 15, flexShrink: 1 },
  waBadge: { backgroundColor: '#166534', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  waBadgeText: { color: '#4ade80', fontSize: 10, fontWeight: '700' },
  sub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  eventLabel: { fontSize: 13, fontWeight: '600', marginLeft: 8 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
})
