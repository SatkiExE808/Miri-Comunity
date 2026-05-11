import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { useData } from '../../src/store/data';
import { colors, radius, spacing } from '../../src/theme';

type Action = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: '/(tabs)/marketplace' | '/(tabs)/services' | '/(tabs)/transport';
};

const actions: Action[] = [
  { title: 'Sell something', subtitle: 'Post an item with a photo', icon: 'pricetag-outline', href: '/(tabs)/marketplace' },
  { title: 'Send a parcel', subtitle: 'Book a delivery rider', icon: 'cube-outline', href: '/(tabs)/services' },
  { title: 'Help me buy', subtitle: 'Ask someone to buy & deliver', icon: 'basket-outline', href: '/(tabs)/services' },
  { title: 'Book a ride', subtitle: 'Motorcycle or car', icon: 'car-outline', href: '/(tabs)/transport' },
];

export default function Home() {
  const { user } = useAuth();
  const { listings, deliveries, bookings } = useData();
  const router = useRouter();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <View>
          <Text style={{ color: colors.muted }}>Welcome back,</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{user?.name ?? 'friend'} 👋</Text>
        </View>

        <View style={styles.grid}>
          {actions.map((a) => (
            <Pressable key={a.title} style={styles.tile} onPress={() => router.push(a.href)}>
              <View style={styles.iconBubble}>
                <Ionicons name={a.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.tileTitle}>{a.title}</Text>
              <Text style={styles.tileSubtitle}>{a.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Quick stats</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
            <Stat label="Listings" value={listings.length} />
            <Stat label="My orders" value={deliveries.filter((d) => d.userId === user?.id).length} />
            <Stat label="My rides" value={bookings.filter((b) => b.userId === user?.id).length} />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary }}>{value}</Text>
      <Text style={{ color: colors.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  tileSubtitle: { color: colors.muted, fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
});
