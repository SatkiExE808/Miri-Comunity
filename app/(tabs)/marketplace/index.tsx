import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../../src/components/ui';
import { useData, type Listing } from '../../../src/store/data';
import { colors, radius, spacing } from '../../../src/theme';

export default function MarketplaceList() {
  const { listings } = useData();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
  }, [listings, query]);

  return (
    <Screen style={{ padding: 0 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <Pressable style={styles.sellBtn} onPress={() => router.push('/(tabs)/marketplace/new')}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700' }}>Sell</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search items…"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xxl }}>
            <Text style={{ color: colors.muted }}>No items yet. Be the first to sell something!</Text>
          </View>
        }
        renderItem={({ item }) => <ListingCard item={item} />}
      />
    </Screen>
  );
}

function ListingCard({ item }: { item: Listing }) {
  return (
    <View style={styles.card}>
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={32} color={colors.muted} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.itemPrice}>RM {item.price.toFixed(2)}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>{item.description}</Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>Sold by {item.sellerName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  search: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: '#F1F5F9' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemPrice: { color: colors.primary, fontWeight: '800' },
});
