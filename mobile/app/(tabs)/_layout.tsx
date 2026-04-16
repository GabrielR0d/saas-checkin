import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../constants'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

const TABS: Array<{ name: string; title: string; icon: IoniconName; iconActive: IoniconName }> = [
  { name: 'index', title: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
  { name: 'logs', title: 'Registros', icon: 'list-outline', iconActive: 'list' },
  { name: 'clients', title: 'Clientes', icon: 'people-outline', iconActive: 'people' },
  { name: 'cards', title: 'Cartões', icon: 'card-outline', iconActive: 'card' },
  { name: 'settings', title: 'Config', icon: 'settings-outline', iconActive: 'settings' },
]

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray400,
        tabBarStyle: { height: 85, paddingBottom: 24 },
      }}
    >
      {TABS.map(({ name, title, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? iconActive : icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
