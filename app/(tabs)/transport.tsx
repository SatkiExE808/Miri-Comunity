import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { useData, type TransportBooking } from '../../src/store/data';
import { colors, radius, spacing } from '../../src/theme';

type Vehicle = 'motorcycle' | 'car';

const vehicles: { key: Vehicle; label: string; icon: keyof typeof Ionicons.glyphMap; subtitle: string; rate: string }[] = [
  { key: 'motorcycle', label: 'Motorcycle', icon: 'bicycle-outline', subtitle: 'Fast through traffic, 1 passenger', rate: 'from RM 5' },
  { key: 'car', label: 'Car', icon: 'car-outline', subtitle: 'Up to 4 passengers, AC', rate: 'from RM 12' },
];

export default function Transport() {
  const { user } = useAuth();
  const { bookings, addBooking } = useData();
  const [vehicle, setVehicle] = useState<Vehicle>('motorcycle');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [when, setWhen] = useState('Now');
  const [passengers, setPassengers] = useState('1');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const myBookings = bookings.filter((b) => b.userId === user?.id);

  async function onSubmit() {
    if (!pickup.trim() || !dropoff.trim()) {
      Alert.alert('Missing info', 'Please enter pickup and drop-off.');
      return;
    }
    const pax = parseInt(passengers, 10) || 1;
    if (vehicle === 'motorcycle' && pax > 1) {
      Alert.alert('Too many passengers', 'A motorcycle can only carry 1 passenger.');
      return;
    }
    if (!user) return;
    try {
      setBusy(true);
      await addBooking({
        vehicle,
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        when: when.trim() || 'Now',
        passengers: pax,
        notes: notes.trim() || undefined,
        userId: user.id,
      });
      setPickup('');
      setDropoff('');
      setNotes('');
      Alert.alert('Ride requested', 'We are finding a driver near you.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen style={{ padding: 0 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Book a ride</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>Around Miri — motorcycle or car.</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {vehicles.map((v) => {
              const active = v.key === vehicle;
              return (
                <Pressable
                  key={v.key}
                  onPress={() => setVehicle(v.key)}
                  style={[
                    styles.vehicleTile,
                    { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? '#ECFEFF' : '#fff' },
                  ]}
                >
                  <Ionicons name={v.icon} size={28} color={active ? colors.primary : colors.muted} />
                  <Text style={{ fontWeight: '700', color: colors.text, marginTop: 6 }}>{v.label}</Text>
                  <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>{v.subtitle}</Text>
                  <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 4 }}>{v.rate}</Text>
                </Pressable>
              );
            })}
          </View>

          <Card style={{ gap: spacing.md }}>
            <Field label="Pickup" value={pickup} onChangeText={setPickup} placeholder="e.g. Bintang Megamall" />
            <Field label="Drop-off" value={dropoff} onChangeText={setDropoff} placeholder="e.g. Miri Airport" />
            <Field label="When" value={when} onChangeText={setWhen} placeholder="Now, or 5:30 PM" />
            {vehicle === 'car' && (
              <Field label="Passengers" keyboardType="number-pad" value={passengers} onChangeText={setPassengers} placeholder="1" />
            )}
            <Field
              label="Notes for driver (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Have a big bag, etc."
              multiline
              numberOfLines={2}
              style={{ minHeight: 60, textAlignVertical: 'top' }}
            />
            <Button title={busy ? 'Requesting…' : 'Request ride'} onPress={onSubmit} disabled={busy} />
          </Card>

          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>Your recent rides</Text>
            {myBookings.length === 0 ? (
              <Text style={{ color: colors.muted }}>No rides booked yet.</Text>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {myBookings.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function BookingRow({ booking }: { booking: TransportBooking }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconBubble}>
        <Ionicons name={booking.vehicle === 'car' ? 'car-outline' : 'bicycle-outline'} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {booking.pickup} → {booking.dropoff}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {booking.vehicle} · {booking.when} · {booking.passengers} pax
        </Text>
      </View>
      <Text style={styles.status}>{booking.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  vehicleTile: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
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
