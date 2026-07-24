import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../src/lib/api'
import type { Device } from '../../src/types'

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Nunca'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  return `há ${Math.floor(hrs / 24)}d`
}

function DeviceCard({ item }: { item: Device }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: item.isOnline ? '#4ade80' : '#ef4444' }]} />
          <Text style={styles.name}>{item.name}</Text>
        </View>
        <Text style={[styles.status, { color: item.isOnline ? '#4ade80' : '#ef4444' }]}>
          {item.isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>

      {item.location ? (
        <View style={styles.row}>
          <Ionicons name="location-outline" size={14} color="#64748b" />
          <Text style={styles.sub}>{item.location}</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Ionicons name="time-outline" size={14} color="#64748b" />
        <Text style={styles.sub}>Último heartbeat: {timeAgo(item.lastHeartbeat)}</Text>
      </View>
    </View>
  )
}

export default function DevicesScreen() {
  const { data: devices, isLoading, refetch } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => (await api.get('/devices')).data?.data ?? [],
    refetchInterval: 30_000,
  })

  return (
    <View style={styles.container}>
      <FlatList
        data={devices ?? []}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <DeviceCard item={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6366f1" />
        }
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>{isLoading ? 'A carregar...' : 'Sem dispositivos'}</Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    rowGap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { color: '#f1f5f9', fontWeight: '600', fontSize: 16 },
  status: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  sub: { color: '#64748b', fontSize: 13 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
})
