import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../src/lib/api'
import type { TenantSettings } from '../../src/types'

export default function SettingsScreen() {
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery<TenantSettings>({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  })

  const mutation = useMutation({
    mutationFn: (patch: Partial<TenantSettings>) => api.patch('/settings', patch),
    onSuccess: (res) => {
      queryClient.setQueryData(['settings'], res.data)
    },
    onError: () => Alert.alert('Erro', 'Não foi possível guardar as definições'),
  })

  function toggle(field: 'notifyOnEntry' | 'notifyOnExit' | 'notifyOnUnknown') {
    if (!settings) return
    mutation.mutate({ [field]: !settings[field] })
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    )
  }

  if (!settings) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Erro ao carregar definições</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificações WhatsApp</Text>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Notificar Entradas</Text>
            <Text style={styles.rowSub}>Receber notificação quando alguém entra</Text>
          </View>
          <Switch
            value={settings.notifyOnEntry}
            onValueChange={() => toggle('notifyOnEntry')}
            trackColor={{ false: '#334155', true: '#4f46e5' }}
            thumbColor={settings.notifyOnEntry ? '#6366f1' : '#94a3b8'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Notificar Saídas</Text>
            <Text style={styles.rowSub}>Receber notificação quando alguém sai</Text>
          </View>
          <Switch
            value={settings.notifyOnExit}
            onValueChange={() => toggle('notifyOnExit')}
            trackColor={{ false: '#334155', true: '#4f46e5' }}
            thumbColor={settings.notifyOnExit ? '#6366f1' : '#94a3b8'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Notificar Cartões Desconhecidos</Text>
            <Text style={styles.rowSub}>Alertar quando um cartão não identificado é lido</Text>
          </View>
          <Switch
            value={settings.notifyOnUnknown}
            onValueChange={() => toggle('notifyOnUnknown')}
            trackColor={{ false: '#334155', true: '#4f46e5' }}
            thumbColor={settings.notifyOnUnknown ? '#6366f1' : '#94a3b8'}
          />
        </View>
      </View>

      {settings.whatsappProvider ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WhatsApp</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Provider</Text>
            <Text style={styles.infoValue}>{settings.whatsappProvider}</Text>
          </View>
          {settings.whatsappInstanceId ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Instância</Text>
              <Text style={styles.infoValue}>{settings.whatsappInstanceId}</Text>
            </View>
          ) : null}
          {settings.whatsappApiUrl ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>API URL</Text>
              <Text style={[styles.infoValue, styles.infoValueMono]} numberOfLines={1}>
                {settings.whatsappApiUrl}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, rowGap: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  errorText: { color: '#f87171', fontSize: 16 },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowInfo: { flex: 1, marginRight: 16 },
  rowLabel: { color: '#f1f5f9', fontSize: 15, fontWeight: '500' },
  rowSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: { color: '#94a3b8', fontSize: 14 },
  infoValue: { color: '#f1f5f9', fontSize: 14, fontWeight: '500', maxWidth: '60%' },
  infoValueMono: { fontSize: 12 },
})
