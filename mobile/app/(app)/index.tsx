import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useCheckIns } from '../../src/hooks/useCheckIns'
import { clearToken, clearUser } from '../../src/lib/auth'
import type { AccessLog, AccessEventType } from '../../src/types'

const EVENT_CONFIG: Record<
  AccessEventType,
  { label: string; color: string; bg: string; icon: string }
> = {
  ENTRY: { label: 'Entrada', color: '#4ade80', bg: '#166534', icon: 'log-in' },
  EXIT: { label: 'Saída', color: '#fbbf24', bg: '#92400e', icon: 'log-out' },
  UNKNOWN_CARD: { label: 'Cartão Desconhecido', color: '#f87171', bg: '#7f1d1d', icon: 'help-circle' },
  BLOCKED_CARD: { label: 'Cartão Bloqueado', color: '#ef4444', bg: '#450a0a', icon: 'ban' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

function LogCard({ item }: { item: AccessLog }) {
  const cfg = EVENT_CONFIG[item.eventType]
  return (
    <View style={styles.card}>
      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon as any} size={16} color="#fff" />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.client?.name ?? item.cardUid}</Text>
        <Text style={styles.sub}>
          {item.device?.name ?? 'Dispositivo desconhecido'} · {timeAgo(item.occurredAt)}
        </Text>
      </View>
      <Text style={[styles.eventLabel, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  )
}

export default function DashboardScreen() {
  const { data: logs, isLoading, refetch } = useCheckIns(50)

  async function handleLogout() {
    await clearToken()
    await clearUser()
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#94a3b8" />
      </TouchableOpacity>
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
  logoutBtn: { position: 'absolute', top: 12, right: 16, zIndex: 10 },
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
  name: { color: '#f1f5f9', fontWeight: '600', fontSize: 15 },
  sub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  eventLabel: { fontSize: 13, fontWeight: '600' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
})
