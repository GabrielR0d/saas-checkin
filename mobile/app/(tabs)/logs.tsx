import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getAccessLogs } from '../../api'
import { COLORS, EVENT_LABELS } from '../../constants'
import type { AccessLog, AccessEventType } from '../../types'

const FILTERS: Array<{ label: string; value: string }> = [
  { label: 'Todos', value: '' },
  { label: 'Entradas', value: 'ENTRY' },
  { label: 'Saídas', value: 'EXIT' },
  { label: 'Desconhecidos', value: 'UNKNOWN_CARD' },
]

export default function LogsScreen() {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['logs-mobile', page, filter],
    queryFn: () => getAccessLogs({ page, limit: 30, ...(filter ? { eventType: filter } : {}) }),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['logs-mobile'] })
    setRefreshing(false)
  }

  const renderItem = ({ item }: { item: AccessLog }) => {
    const cfg = EVENT_LABELS[item.eventType as AccessEventType] ?? EVENT_LABELS.UNKNOWN_CARD
    return (
      <View style={styles.row}>
        <Text style={styles.emoji}>{cfg.emoji}</Text>
        <View style={styles.info}>
          <Text style={styles.name}>{item.client?.name ?? item.cardUid}</Text>
          <Text style={styles.device}>{item.device?.name ?? 'Leitor'}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.date}>{format(new Date(item.createdAt), 'dd/MM HH:mm')}</Text>
          {item.whatsappSent && (
            <View style={styles.waBadge}>
              <Text style={styles.waText}>WA</Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Registros</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => { setFilter(f.value); setPage(1) }}
            style={[styles.chip, filter === f.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListFooterComponent={
          (data?.totalPages ?? 0) > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                disabled={page === 1}
                onPress={() => setPage((p) => p - 1)}
                style={[styles.pageBtn, page === 1 && { opacity: 0.4 }]}
              >
                <Text style={styles.pageBtnText}>‹ Anterior</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>{page} / {data?.totalPages}</Text>
              <TouchableOpacity
                disabled={page >= (data?.totalPages ?? 1)}
                onPress={() => setPage((p) => p + 1)}
                style={[styles.pageBtn, page >= (data?.totalPages ?? 1) && { opacity: 0.4 }]}
              >
                <Text style={styles.pageBtnText}>Próximo ›</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={<Text style={styles.empty}>Nenhum registro encontrado.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  chips: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.gray200 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.gray600 },
  chipTextActive: { color: COLORS.white, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 14 },
  separator: { height: 1, backgroundColor: COLORS.gray50 },
  emoji: { fontSize: 22, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: COLORS.gray900 },
  device: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  label: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },
  waBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  waText: { fontSize: 10, color: '#15803d', fontWeight: '700' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  pageBtn: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  pageBtnText: { fontSize: 13, color: COLORS.gray700 },
  pageInfo: { fontSize: 13, color: COLORS.gray500 },
  empty: { textAlign: 'center', color: COLORS.gray400, paddingVertical: 40, fontSize: 14 },
})
