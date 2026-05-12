import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { BOOKING_TIMEOUT_MS, useData, type TransportBooking } from '../../src/store/data';
import { colors, radius, spacing } from '../../src/theme';

type Vehicle = 'motorcycle' | 'car';

const vehicles: { key: Vehicle; label: string; icon: keyof typeof Ionicons.glyphMap; subtitle: string; rate: string }[] = [
  { key: 'motorcycle', label: 'Motorcycle', icon: 'bicycle-outline', subtitle: 'Fast through traffic, 1 passenger', rate: 'from RM 5' },
  { key: 'car', label: 'Car', icon: 'car-outline', subtitle: 'Up to 4 passengers, AC', rate: 'from RM 12' },
];

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`;
}

function timeRemaining(ts: number, now: number): string {
  const left = BOOKING_TIMEOUT_MS - (now - ts);
  if (left <= 0) return '0:00';
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function Transport() {
  const { user } = useAuth();
  const { bookings, addBooking, setBookingStatus, acceptBooking } = useData();
  const [vehicle, setVehicle] = useState<Vehicle>('motorcycle');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [when, setWhen] = useState('Now');
  const [passengers, setPassengers] = useState('1');
  const [offer, setOffer] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Tick every second so countdown + auto-expire stay current.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-expire pending bookings that have aged past the timeout.
  useEffect(() => {
    bookings.forEach((b) => {
      if (b.status === 'pending' && now - b.createdAt >= BOOKING_TIMEOUT_MS) {
        setBookingStatus(b.id, 'expired');
      }
    });
  }, [now, bookings, setBookingStatus]);

  const myBookings = bookings.filter((b) => b.userId === user?.id);
  const openRequests = bookings.filter(
    (b) => b.userId !== user?.id && b.status === 'pending',
  );

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
    let offerAmount: number | undefined;
    if (offer.trim()) {
      const parsed = parseFloat(offer.trim());
      if (!Number.isFinite(parsed) || parsed <= 0) {
        Alert.alert('Invalid offer', 'Enter a positive amount in RM, or leave it blank.');
        return;
      }
      offerAmount = Math.round(parsed * 100) / 100;
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
        offerAmount,
        notes: notes.trim() || undefined,
        userId: user.id,
        userName: user.name,
      });
      setPickup('');
      setDropoff('');
      setNotes('');
      setOffer('');
      Alert.alert('Ride requested', 'Searching for a driver. Request will auto-cancel in 10 minutes if no driver accepts.');
    } finally {
      setBusy(false);
    }
  }

  function confirmCancel(b: TransportBooking) {
    Alert.alert('Cancel this ride?', `${b.pickup} → ${b.dropoff}`, [
      { text: 'Keep searching', style: 'cancel' },
      { text: 'Cancel ride', style: 'destructive', onPress: () => setBookingStatus(b.id, 'cancelled') },
    ]);
  }

  function confirmAccept(b: TransportBooking) {
    if (!user) return;
    Alert.alert(
      'Accept this ride?',
      `${b.pickup} → ${b.dropoff}\n${b.vehicle} · ${b.when}${b.offerAmount != null ? ` · RM ${b.offerAmount.toFixed(2)}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: () => acceptBooking(b.id, user.id, user.name) },
      ],
    );
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
              label="Offer amount (RM, optional)"
              keyboardType="decimal-pad"
              value={offer}
              onChangeText={setOffer}
              placeholder="e.g. 15"
            />
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
                  <BookingRow key={b.id} booking={b} now={now} onCancel={() => confirmCancel(b)} />
                ))}
              </View>
            )}
          </View>

          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
              <Ionicons name="people-outline" size={16} color={colors.text} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                Open requests in Miri
              </Text>
              {openRequests.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{openRequests.length}</Text>
                </View>
              )}
            </View>
            {openRequests.length === 0 ? (
              <Text style={{ color: colors.muted }}>No open requests right now.</Text>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {openRequests.map((b) => (
                  <OpenRequestRow key={b.id} booking={b} now={now} onAccept={() => confirmAccept(b)} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function OpenRequestRow({ booking, now, onAccept }: { booking: TransportBooking; now: number; onAccept: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBubble, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name={booking.vehicle === 'car' ? 'car-outline' : 'bicycle-outline'} size={20} color="#B45309" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>
            {booking.pickup} → {booking.dropoff}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            by {booking.userName || 'someone'} · {booking.vehicle} · {booking.when} · {booking.passengers} pax
          </Text>
        </View>
        {booking.offerAmount != null && (
          <View style={styles.offerPill}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>RM {booking.offerAmount.toFixed(2)}</Text>
          </View>
        )}
      </View>

      {booking.notes && (
        <Text style={{ color: colors.muted, fontSize: 12, fontStyle: 'italic' }}>"{booking.notes}"</Text>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          <Ionicons name="time-outline" size={12} color={colors.muted} /> Requested {formatRelative(booking.createdAt, now)}
        </Text>
        <Text style={[styles.metaText, { color: colors.accent, fontWeight: '700' }]}>
          Expires in {timeRemaining(booking.createdAt, now)}
        </Text>
      </View>

      <Pressable onPress={onAccept} style={styles.acceptBtn}>
        <Ionicons name="checkmark-circle" size={16} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700' }}>Accept ride</Text>
      </Pressable>
    </View>
  );
}

function BookingRow({ booking, now, onCancel }: { booking: TransportBooking; now: number; onCancel: () => void }) {
  const isPending = booking.status === 'pending';
  const isCancelled = booking.status === 'cancelled' || booking.status === 'expired';
  const statusColor = isCancelled ? colors.muted : isPending ? colors.accent : colors.primary;

  return (
    <View style={styles.row}>
      <View style={styles.headerRow}>
        <View style={styles.iconBubble}>
          <Ionicons name={booking.vehicle === 'car' ? 'car-outline' : 'bicycle-outline'} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>
            {booking.pickup} → {booking.dropoff}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {booking.vehicle} · {booking.when} · {booking.passengers} pax
            {booking.offerAmount != null ? ` · RM ${booking.offerAmount.toFixed(2)}` : ''}
          </Text>
        </View>
        <Text style={[styles.status, { color: statusColor }]}>{booking.status}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          <Ionicons name="time-outline" size={12} color={colors.muted} /> Requested {formatTime(booking.createdAt)} · {formatRelative(booking.createdAt, now)}
        </Text>
        {isPending && (
          <Text style={[styles.metaText, { color: colors.accent, fontWeight: '700' }]}>
            Auto-cancel in {timeRemaining(booking.createdAt, now)}
          </Text>
        )}
      </View>

      {booking.status === 'accepted' && booking.acceptedByName && (
        <View style={styles.acceptedBanner}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={{ color: colors.success, fontWeight: '700', fontSize: 12 }}>
            Accepted by {booking.acceptedByName}
          </Text>
        </View>
      )}

      {isPending && (
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
          <Text style={{ color: '#dc2626', fontWeight: '700' }}>Cancel search</Text>
        </Pressable>
      )}
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
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaText: {
    color: colors.muted,
    fontSize: 11,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#f0fdf4',
    borderRadius: radius.sm,
  },
  offerPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  countBadge: {
    backgroundColor: colors.accent,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
