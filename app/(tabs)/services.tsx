import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Pill, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { useData, type DeliveryOrder } from '../../src/store/data';
import { colors, radius, spacing } from '../../src/theme';

type Kind = 'parcel' | 'help_to_buy';

export default function Services() {
  const { user } = useAuth();
  const { deliveries, addDelivery } = useData();
  const [kind, setKind] = useState<Kind>('parcel');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [details, setDetails] = useState('');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);

  const myOrders = deliveries.filter((d) => d.userId === user?.id);

  async function onSubmit() {
    if (!dropoff.trim() || !details.trim()) {
      Alert.alert('Missing info', 'Please fill in the drop-off and details.');
      return;
    }
    if (kind === 'parcel' && !pickup.trim()) {
      Alert.alert('Missing info', 'Please enter a pickup location.');
      return;
    }
    if (!user) return;
    const budgetNum = budget ? parseFloat(budget) : undefined;
    try {
      setBusy(true);
      await addDelivery({
        kind,
        pickup: pickup.trim() || '(buyer to source)',
        dropoff: dropoff.trim(),
        details: details.trim(),
        budget: Number.isFinite(budgetNum) ? budgetNum : undefined,
        userId: user.id,
      });
      setPickup('');
      setDropoff('');
      setDetails('');
      setBudget('');
      Alert.alert('Order placed', 'A rider will be matched with your order shortly.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen style={{ padding: 0 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Send & shop</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              Send parcels around Miri or ask someone to help buy items for you.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pill label="Parcel delivery" active={kind === 'parcel'} onPress={() => setKind('parcel')} />
            <Pill label="Help to buy" active={kind === 'help_to_buy'} onPress={() => setKind('help_to_buy')} />
          </View>

          <Card style={{ gap: spacing.md }}>
            {kind === 'parcel' && (
              <Field label="Pickup address" value={pickup} onChangeText={setPickup} placeholder="e.g. Pelita Commercial Centre" />
            )}
            <Field
              label="Drop-off address"
              value={dropoff}
              onChangeText={setDropoff}
              placeholder="e.g. Lutong, Lorong 3"
            />
            <Field
              label={kind === 'parcel' ? 'Parcel details' : 'What to buy'}
              value={details}
              onChangeText={setDetails}
              placeholder={kind === 'parcel' ? 'Size, weight, notes…' : 'e.g. 2x nasi lemak from Lin Restoran'}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <Field
              label={kind === 'parcel' ? 'Tip / budget (RM, optional)' : 'Spending budget (RM)'}
              keyboardType="decimal-pad"
              value={budget}
              onChangeText={setBudget}
              placeholder="0.00"
            />
            <Button title={busy ? 'Placing…' : 'Place order'} onPress={onSubmit} disabled={busy} />
          </Card>

          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>Your recent orders</Text>
            {myOrders.length === 0 ? (
              <Text style={{ color: colors.muted }}>No orders yet.</Text>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {myOrders.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function OrderRow({ order }: { order: DeliveryOrder }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconBubble}>
        <Ionicons name={order.kind === 'parcel' ? 'cube-outline' : 'basket-outline'} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: colors.text }}>
          {order.kind === 'parcel' ? 'Parcel' : 'Help to buy'} → {order.dropoff}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{order.details}</Text>
      </View>
      <Text style={styles.status}>{order.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
