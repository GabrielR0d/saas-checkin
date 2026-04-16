import { useState } from 'react'
import {
  View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet,
  TextInput, Alert,
} from 'react-native'
import { useQuery, useMutation } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { getSettings, updateSettings, updatePushToken } from '../../api'
import { useAuthStore } from '../../stores/auth.store'
import { COLORS } from '../../constants'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  OPERATOR: 'Operador',
  VIEWER: 'Visualizador',
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore()
  const [expandWa, setExpandWa] = useState(false)
  const [waForm, setWaForm] = useState({ whatsappInstanceId: '', whatsappToken: '' })
  const [pushEnabled, setPushEnabled] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['settings-mobile'],
    queryFn: getSettings,
  })

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateSettings(data),
  })

  const handleToggle = (key: string) => (value: boolean) => mutation.mutate({ [key]: value })

  const handleEnablePush = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Habilite as notificações nas configurações do dispositivo.')
        return
      }
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId ?? '',
      })
      await updatePushToken(tokenData.data)
    }
    setPushEnabled(value)
  }

  const handleLogout = () => {
    Alert.alert('Encerrar sessão', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login') },
      },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{user?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</Text>
          </View>
        </View>
      </View>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>Notificações</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Push no celular</Text>
          <Switch
            value={pushEnabled}
            onValueChange={handleEnablePush}
            trackColor={{ true: COLORS.primary, false: COLORS.gray200 }}
            thumbColor={COLORS.white}
          />
        </View>
        <View style={styles.divider} />
        {[
          { key: 'notifyOnEntry', label: 'Entradas' },
          { key: 'notifyOnExit', label: 'Saídas' },
          { key: 'notifyOnUnknown', label: 'Cartões desconhecidos' },
        ].map(({ key, label }, i, arr) => (
          <View key={key}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Switch
                value={!!(settings as Record<string, unknown> | undefined)?.[key]}
                onValueChange={handleToggle(key)}
                trackColor={{ true: COLORS.primary, false: COLORS.gray200 }}
                thumbColor={COLORS.white}
              />
            </View>
            {i < arr.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {/* WhatsApp */}
      <Text style={styles.sectionTitle}>WhatsApp</Text>
      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={() => setExpandWa((v) => !v)}>
          <View style={styles.rowLeft}>
            <View style={[styles.statusDot, { backgroundColor: (settings as Record<string, unknown> | undefined)?.whatsappInstanceId ? COLORS.success : COLORS.gray300 }]} />
            <Text style={styles.rowLabel}>
              {(settings as Record<string, unknown> | undefined)?.whatsappInstanceId
                ? String((settings as Record<string, unknown>).whatsappInstanceId)
                : 'Não configurado'}
            </Text>
          </View>
          <Ionicons name={expandWa ? 'chevron-up' : 'create-outline'} size={18} color={COLORS.gray400} />
        </TouchableOpacity>
        {expandWa && (
          <View style={styles.waForm}>
            <View style={styles.divider} />
            {[
              { key: 'whatsappInstanceId', label: 'Instance ID', placeholder: 'minha-instancia', secure: false },
              { key: 'whatsappToken', label: 'Token', placeholder: '••••••••', secure: true },
            ].map(({ key, label, placeholder, secure }) => (
              <View key={key} style={styles.waField}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={waForm[key as keyof typeof waForm]}
                  onChangeText={(v) => setWaForm((p) => ({ ...p, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.gray400}
                  secureTextEntry={secure}
                  autoCapitalize="none"
                />
              </View>
            ))}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => { mutation.mutate(waForm); setExpandWa(false) }}
            >
              <Text style={styles.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>Sobre</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Versão</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
        <Text style={styles.logoutText}>Encerrar sessão</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { padding: 20, paddingBottom: 48 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.gray100 },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  profileAvatarText: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: COLORS.gray900 },
  profileEmail: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  roleBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  section: { backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.gray100, marginBottom: 24, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 15, color: COLORS.gray700 },
  rowValue: { fontSize: 14, color: COLORS.gray500 },
  divider: { height: 1, backgroundColor: COLORS.gray100, marginHorizontal: 16 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  waForm: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  waField: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray600 },
  fieldInput: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.gray900 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.danger, borderRadius: 16, height: 52, marginTop: 8 },
  logoutText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
})
