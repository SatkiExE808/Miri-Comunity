import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Screen } from '../../src/components/ui';
import { useAuth, type User } from '../../src/store/auth';
import { useData } from '../../src/store/data';
import { colors, radius, spacing } from '../../src/theme';

export default function Profile() {
  const { user, isAdmin, logout, listUsers, setUserBanned } = useAuth();
  const { listings, deliveries, bookings, removeUserContent } = useData();
  const [users, setUsers] = useState<User[]>([]);

  const refreshUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsers(await listUsers());
  }, [isAdmin, listUsers]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const myListings = listings.filter((l) => l.sellerId === user?.id);
  const myDeliveries = deliveries.filter((d) => d.userId === user?.id);
  const myBookings = bookings.filter((b) => b.userId === user?.id);

  function confirmLogout() {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  function confirmBan(target: User) {
    const wasBanned = !!target.banned;
    const verb = wasBanned ? 'Unban' : 'Ban';
    Alert.alert(`${verb} ${target.name}?`, target.email, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: verb,
        style: wasBanned ? 'default' : 'destructive',
        onPress: async () => {
          const next = await setUserBanned(target.id, !wasBanned);
          setUsers(next);
        },
      },
    ]);
  }

  function confirmWipeUser(target: User) {
    Alert.alert(
      `Delete all of ${target.name}'s content?`,
      'Listings, deliveries, and ride bookings will be removed. The account stays — use Ban to disable login.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete content',
          style: 'destructive',
          onPress: () => removeUserContent(target.id),
        },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{user?.name}</Text>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>ADMIN</Text>
              </View>
            )}
          </View>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{user?.email}</Text>
          <Text style={{ color: colors.muted }}>{user?.phone || '—'}</Text>
        </Card>

        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>Your activity</Text>
          <Row label="Items listed" value={myListings.length} />
          <Row label="Delivery / help-to-buy orders" value={myDeliveries.length} />
          <Row label="Transport bookings" value={myBookings.length} />
        </Card>

        {isAdmin && (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>User management</Text>
              <Pressable onPress={refreshUsers} hitSlop={8}>
                <Ionicons name="refresh" size={18} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, marginBottom: spacing.sm }}>
              {users.length} {users.length === 1 ? 'user' : 'users'} registered. Tap a user for actions.
            </Text>
            <View style={{ gap: spacing.sm }}>
              {users
                .filter((u) => u.id !== user?.id)
                .map((u) => (
                  <UserRow
                    key={u.id}
                    u={u}
                    onBan={() => confirmBan(u)}
                    onWipe={() => confirmWipeUser(u)}
                  />
                ))}
              {users.filter((u) => u.id !== user?.id).length === 0 && (
                <Text style={{ color: colors.muted, fontSize: 12 }}>No other users yet.</Text>
              )}
            </View>
          </Card>
        )}

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

function UserRow({ u, onBan, onWipe }: { u: User; onBan: () => void; onWipe: () => void }) {
  return (
    <View style={styles.userRow}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>{u.name}</Text>
          {u.role === 'admin' && <Text style={styles.tag}>admin</Text>}
          {u.banned && <Text style={[styles.tag, styles.tagBanned]}>banned</Text>}
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{u.email}</Text>
      </View>
      <Pressable onPress={onWipe} style={styles.actionBtn} hitSlop={6}>
        <Ionicons name="trash-outline" size={16} color={colors.muted} />
      </Pressable>
      <Pressable onPress={onBan} style={[styles.actionBtn, u.banned ? styles.actionUnban : styles.actionBan]} hitSlop={6}>
        <Ionicons name={u.banned ? 'checkmark-circle-outline' : 'ban-outline'} size={16} color={u.banned ? colors.success : '#dc2626'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tag: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.primary,
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  tagBanned: {
    color: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  actionBan: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  actionUnban: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
});
