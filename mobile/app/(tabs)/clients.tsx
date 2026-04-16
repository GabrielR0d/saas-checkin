import { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { getClients, createClient, updateClient } from '../../api'
import { COLORS } from '../../constants'
import type { Client } from '../../types'

const FIELDS = [
  { key: 'name', label: 'Nome', placeholder: 'Nome completo', required: true, keyboardType: 'default' as const },
  { key: 'phone', label: 'Telefone', placeholder: '+55 11 99999-9999', required: true, keyboardType: 'phone-pad' as const },
  { key: 'email', label: 'E-mail', placeholder: 'email@exemplo.com', required: false, keyboardType: 'email-address' as const },
]

function ClientModal({ client, onClose }: { client?: Client; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: client?.name ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
  })

  const mutation = useMutation({
    mutationFn: () =>
      client ? updateClient(client.id, form) : createClient(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients-mobile'] }); onClose() },
    onError: () => Alert.alert('Erro', 'Não foi possível salvar o cliente.'),
  })

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{client ? 'Editar cliente' : 'Novo cliente'}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.gray600} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          {FIELDS.map(({ key, label, placeholder, keyboardType }) => (
            <View key={key} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.fieldInput}
                value={form[key as keyof typeof form]}
                onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                placeholder={placeholder}
                placeholderTextColor={COLORS.gray400}
                keyboardType={keyboardType}
                autoCapitalize={key === 'email' ? 'none' : 'words'}
              />
            </View>
          ))}
          <TouchableOpacity
            style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.saveBtnText}>Salvar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default function ClientsScreen() {
  const [search, setSearch] = useState('')
  const [dSearch, setDSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; client?: Client }>({ open: false })
  const [refreshing, setRefreshing] = useState(false)
  const qc = useQueryClient()

  const handleSearch = useCallback((v: string) => {
    setSearch(v)
    clearTimeout((handleSearch as unknown as { timer?: ReturnType<typeof setTimeout> }).timer)
    ;(handleSearch as unknown as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => setDSearch(v), 400)
  }, [])

  const { data } = useQuery({
    queryKey: ['clients-mobile', dSearch],
    queryFn: () => getClients({ limit: 50, search: dSearch }),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['clients-mobile'] })
    setRefreshing(false)
  }

  const renderItem = ({ item }: { item: Client }) => (
    <TouchableOpacity style={styles.item} onPress={() => setModal({ open: true, client: item })}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPhone}>{item.phone}</Text>
        {item.email && <Text style={styles.itemEmail}>{item.email}</Text>}
      </View>
      <View style={styles.itemRight}>
        {(item._count?.cards ?? 0) > 0 && (
          <View style={styles.cardBadge}>
            <Ionicons name="card-outline" size={12} color={COLORS.primary} />
            <Text style={styles.cardBadgeText}>{item._count?.cards}</Text>
          </View>
        )}
        <View style={[styles.statusDot, { backgroundColor: item.isActive ? COLORS.success : COLORS.gray300 }]} />
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clientes</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.gray400} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar clientes..."
          placeholderTextColor={COLORS.gray400}
          value={search}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDSearch('') }}>
            <Ionicons name="close-circle" size={18} color={COLORS.gray400} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum cliente encontrado.</Text>}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModal({ open: true })}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {modal.open && <ClientModal client={modal.client} onClose={() => setModal({ open: false })} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 20, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray200, paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.gray900 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 14 },
  separator: { height: 1, backgroundColor: COLORS.gray50 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: COLORS.gray900 },
  itemPhone: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  itemEmail: { fontSize: 12, color: COLORS.gray400, marginTop: 1 },
  itemRight: { alignItems: 'flex-end', gap: 6 },
  cardBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  cardBadgeText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray900 },
  modalBody: { padding: 20, gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray700 },
  fieldInput: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.gray900 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  empty: { textAlign: 'center', color: COLORS.gray400, paddingVertical: 40, fontSize: 14 },
})
