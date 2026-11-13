// The bottom bar: Today, Challenges, Account.
import { Tabs } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { useColors } from '../../components/ui';
import { useT } from '../../lib/i18n';

function Icon({ name, color }: { name: 'today' | 'challenges' | 'account'; color: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {name === 'today' && <><Path d="M4 18c2-1 4-1 6 0s4 1 6 0 3-1 4-1" {...p} /><Path d="M6 13l3-3 3 2 4-5 3 3" {...p} /></>}
      {name === 'challenges' && <Path d="M2 20L9 7l4 6 3-4 6 11z" {...p} />}
      {name === 'account' && <><Circle cx={12} cy={8} r={4} {...p} /><Path d="M4 21c1-4 4-6 8-6s7 2 8 6" {...p} /></>}
    </Svg>
  );
}

export default function TabsLayout() {
  const c = useColors();
  const { t } = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.red,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.paper, borderTopColor: c.rule },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabToday, tabBarIcon: ({ color }) => <Icon name="today" color={String(color)} /> }} />
      <Tabs.Screen name="challenges" options={{ title: t.tabChallenges, tabBarIcon: ({ color }) => <Icon name="challenges" color={String(color)} /> }} />
      <Tabs.Screen name="account" options={{ title: t.tabAccount, tabBarIcon: ({ color }) => <Icon name="account" color={String(color)} /> }} />
    </Tabs>
  );
}
