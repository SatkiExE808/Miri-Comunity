import { Alert, ScrollView, Text, View } from 'react-native';
import { Button, Card, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { useData } from '../../src/store/data';
import { colors, spacing } from '../../src/theme';

export default function Profile() {
  const { user, logout } = useAuth();
  const { listings, deliveries, bookings } = useData();

  const myListings = listings.filter((l) => l.sellerId === user?.id);
  const myDeliveries = deliveries.filter((d) => d.userId === user?.id);
  const myBookings = bookings.filter((b) => b.userId === user?.id);

  function confirmLogout() {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <Card>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{user?.name}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{user?.email}</Text>
          <Text style={{ color: colors.muted }}>{user?.phone}</Text>
        </Card>

        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>Your activity</Text>
          <Row label="Items listed" value={myListings.length} />
          <Row label="Delivery / help-to-buy orders" value={myDeliveries.length} />
          <Row label="Transport bookings" value={myBookings.length} />
        </Card>

        <Button title="Sign out" variant="ghost" onPress={confirmLogout} />
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: colors.text }}>{label}</Text>
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}
