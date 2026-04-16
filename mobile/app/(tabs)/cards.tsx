import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import NfcManager, { NfcTech } from 'react-native-nfc-manager'
import { getCards, createCard, updateCard, getClients } from '../../api'
import { COLORS } from '../../constants'
import type { Card, CardStatus, Client } from '../../types'

const STATUS_COLORS: Record<CardStatus, string> = {
  ACTIVE: COLORS.success,
  BLOCKED: COLORS.danger,
  LOST: COLORS.warning,
}
const STATUS_LABELS: Record<CardStatus, string> = { ACTIVE: 'Ativo', BLOCKED: 'Bloqueado', LOST: 'Perdido' }

function CardModal({ card, onClose }: { card?: Card; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    uid: card?.uid ?? '',
    label: card?.label ?? '',
    status: card?.status ?? 'ACTIVE' as CardStatus,
    clientId: card?.clientId ?? '',
  })
  const [isScanning, setIsScanning] = useState(false)

  const { data: clients } = useQuery({
    queryKey: ['clients-picker'],
    queryFn: () => getClients({ limit: 200 }),
  })

  const mutation = useMutation({
    mutationFn: () =>
      card
        ? updateCard(card.id, { label: form.label, status: form.status, clientId: form.clientId || undefined })
        : createCard({ uid: form.uid.toUpperCase(), label: form.label, clientId: form.clientId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cards-mobile'] }); onClose() },
    onError: () => Alert.alert('Erro', 'Não foi possível salvar o cartão.'),
  })

  const scanNfc = async () => {
    try {
      const supported = await NfcManager.isSupported()
      if (!supported) { Alert.alert('NFC não suportado neste dispositivo'); return }
      setIsScanning(true)
      await NfcManager.requestTechnology(NfcTech.Ndef)
      const tag = await NfcManager.getTag()
      if (tag?.id) {
        const uid = tag.id.split(':').join('').toUpperCase()
        setForm((p) => ({ ...p, uid }))
      } else {
        Alert.alert('Aviso', 'Nenhum UID encontrado no cartão.')
      }
    } catch {
      // user cancelled or error
    } finally {
      NfcManager.cancelTechnologyRequest()
      setIsScanning(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{card ? 'Editar cartão' : 'Novo cartão'}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.gray600} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          {/* UID + NFC scan */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>UID *</Text>
            <View style={styles.uidRow}>
              <TextInput
                style={[styles.fieldInput, styles.uidInput, { fontFamily: 'monospace' }]}
                value={form.uid}
                onChangeText={(v) => setForm((p) => ({ ...p, uid: v.toUpperCase() }))}
                placeholder="A1B2C3D4"
                placeholderTextColor={COLORS.gray400}
                editable={!card}
                autoCapitalize="characters"
              />
              {!card && (
                <TouchableOpacity style={styles.nfcBtn} onPress={scanNfc} disabled={isScanning}>
                  <Ionicons name="wifi" size={22} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </View>
            {isScanning && <Text style={styles.scanHint}>Aproxime o cartão ao leitor NFC...</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.label}
              onChangeText={(v) => setForm((p) => ({ ...p, label: v }))}
              placeholder="Ex: Cartão principal"
              placeholderTextColor={COLORS.gray400}
            />
          </View>

          {/* Status select */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.statusRow}>
              {(['ACTIVE', 'BLOCKED', 'LOST'] as CardStatus[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setForm((p) => ({ ...p, status: s }))}
                  style={[styles.statusChip, form.status === s && { borderColor: STATUS_COLORS[s], backgroundColor: STATUS_COLORS[s] + '22' }]}
                >
                  <Text style={[styles.statusChipText, form.status === s && { color: STATUS_COLORS[s], fontWeight: '600' }]}>
                    {STATUS_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Client picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Cliente</Text>
            <View style={styles.clientPicker}>
              <TouchableOpacity
                style={[styles.clientChip, !form.clientId && styles.clientChipActive]}
                onPress={() => setForm((p) => ({ ...p, clientId: '' }))}
              >
                <Text style={[styles.clientChipText, !form.clientId && styles.clientChipTextActive]}>Nenhum</Text>
              </TouchableOpacity>
              {(clients?.data ?? []).map((c: Client) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.clientChip, form.clientId === c.id && styles.clientChipActive]}
                  onPress={() => setForm((p) => ({ ...p, clientId: c.id }))}
                >
                  <Text style={[styles.clientChipText, form.clientId === c.id && styles.clientChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

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
      </ScrollView>
    </Modal>
  )
}

export default function CardsScreen() {
  const [modal, setModal] = useState<{ open: boolean; card?: Card }>({ open: false })
  const [refreshing, setRefreshing] = useState(false)
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['cards-mobile'],
    queryFn: () => getCards({ limit: 50 }),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['cards-mobile'] })
    setRefreshing(false)
  }

  const renderItem = ({ item }: { item: Card }) => (
    <TouchableOpacity style={styles.item} onPress={() => setModal({ open: true, card: item })}>
      <View style={styles.cardIcon}>
        <Ionicons name="card" size={22} color={COLORS.primary} />
      </View>
      <View style={styles.itemInfo}>
        {item.label && <Text style={styles.itemLabel}>{item.label}</Text>}
        <Text style={[styles.itemUid, { fontFamily: 'monospace' }]}>{item.uid}</Text>
        {item.client && (
          <View style={styles.clientRow}>
            <Ionicons name="person-outline" size={12} color={COLORS.gray400} />
            <Text style={styles.clientName}>{item.client.name}</Text>
          </View>
        )}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
        <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
          {STATUS_LABELS[item.status]}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cartões</Text>
      </View>
      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORS.gray50 }} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum cartão cadastrado.</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setModal({ open: true })}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
      {modal.open && <CardModal card={modal.card} onClose={() => setModal({ open: false })} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 14 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 13, color: COLORS.gray500, marginBottom: 2 },
  itemUid: { fontSize: 15, fontWeight: '700', color: COLORS.gray900 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  clientName: { fontSize: 12, color: COLORS.gray400 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  empty: { textAlign: 'center', color: COLORS.gray400, paddingVertical: 40, fontSize: 14 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray900 },
  modalBody: { padding: 20, gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray700 },
  fieldInput: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.gray900 },
  uidRow: { flexDirection: 'row', gap: 10 },
  uidInput: { flex: 1 },
  nfcBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  scanHint: { fontSize: 12, color: COLORS.primary, fontStyle: 'italic' },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.gray200 },
  statusChipText: { fontSize: 13, color: COLORS.gray600 },
  clientPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clientChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.gray200 },
  clientChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  clientChipText: { fontSize: 13, color: COLORS.gray600 },
  clientChipTextActive: { color: COLORS.primary, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
})
