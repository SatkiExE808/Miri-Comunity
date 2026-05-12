import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Listing = {
  id: string;
  title: string;
  price: number;
  description: string;
  imageUri?: string;
  sellerId: string;
  sellerName: string;
  createdAt: number;
};

export type DeliveryOrder = {
  id: string;
  kind: 'parcel' | 'help_to_buy';
  pickup: string;
  dropoff: string;
  details: string;
  budget?: number;
  userId: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'completed';
};

export type BookingStatus = 'pending' | 'accepted' | 'completed' | 'cancelled' | 'expired';

export type TransportBooking = {
  id: string;
  vehicle: 'motorcycle' | 'car';
  pickup: string;
  dropoff: string;
  when: string;
  passengers: number;
  notes?: string;
  offerAmount?: number;
  userId: string;
  createdAt: number;
  status: BookingStatus;
};

export const BOOKING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

type DataState = {
  listings: Listing[];
  deliveries: DeliveryOrder[];
  bookings: TransportBooking[];
  addListing: (l: Omit<Listing, 'id' | 'createdAt'>) => Promise<void>;
  addDelivery: (d: Omit<DeliveryOrder, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  addBooking: (b: Omit<TransportBooking, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  setBookingStatus: (id: string, status: BookingStatus) => Promise<void>;
  removeListing: (id: string) => Promise<void>;
  removeDelivery: (id: string) => Promise<void>;
  removeBooking: (id: string) => Promise<void>;
  removeUserContent: (userId: string) => Promise<void>;
};

const DataContext = createContext<DataState | null>(null);
const KEY = 'miri.data.v1';

const seed = {
  listings: [
    {
      id: 'l_seed1',
      title: 'Mountain bike (used)',
      price: 450,
      description: 'Good condition, recently serviced. Pickup at Pujut.',
      sellerId: 'u_seed',
      sellerName: 'Adi',
      createdAt: Date.now() - 86400000,
    },
    {
      id: 'l_seed2',
      title: 'PlayStation 4 + 2 controllers',
      price: 850,
      description: '500GB, with FIFA and GTA V.',
      sellerId: 'u_seed',
      sellerName: 'Jaya',
      createdAt: Date.now() - 3600000,
    },
  ] as Listing[],
  deliveries: [] as DeliveryOrder[],
  bookings: [] as TransportBooking[],
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [bookings, setBookings] = useState<TransportBooking[]>([]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setListings(parsed.listings ?? []);
        setDeliveries(parsed.deliveries ?? []);
        setBookings(parsed.bookings ?? []);
      } else {
        setListings(seed.listings);
        setDeliveries(seed.deliveries);
        setBookings(seed.bookings);
      }
    })();
  }, []);

  async function persist(next: { listings: Listing[]; deliveries: DeliveryOrder[]; bookings: TransportBooking[] }) {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }

  const value = useMemo<DataState>(
    () => ({
      listings,
      deliveries,
      bookings,
      async addListing(l) {
        const item: Listing = { ...l, id: `l_${Date.now()}`, createdAt: Date.now() };
        const next = [item, ...listings];
        setListings(next);
        await persist({ listings: next, deliveries, bookings });
      },
      async addDelivery(d) {
        const item: DeliveryOrder = { ...d, id: `d_${Date.now()}`, createdAt: Date.now(), status: 'pending' };
        const next = [item, ...deliveries];
        setDeliveries(next);
        await persist({ listings, deliveries: next, bookings });
      },
      async addBooking(b) {
        const item: TransportBooking = { ...b, id: `b_${Date.now()}`, createdAt: Date.now(), status: 'pending' };
        const next = [item, ...bookings];
        setBookings(next);
        await persist({ listings, deliveries, bookings: next });
      },
      async setBookingStatus(id, status) {
        const next = bookings.map((b) => (b.id === id ? { ...b, status } : b));
        setBookings(next);
        await persist({ listings, deliveries, bookings: next });
      },
      async removeListing(id) {
        const next = listings.filter((l) => l.id !== id);
        setListings(next);
        await persist({ listings: next, deliveries, bookings });
      },
      async removeDelivery(id) {
        const next = deliveries.filter((d) => d.id !== id);
        setDeliveries(next);
        await persist({ listings, deliveries: next, bookings });
      },
      async removeBooking(id) {
        const next = bookings.filter((b) => b.id !== id);
        setBookings(next);
        await persist({ listings, deliveries, bookings: next });
      },
      async removeUserContent(userId) {
        const nextListings = listings.filter((l) => l.sellerId !== userId);
        const nextDeliveries = deliveries.filter((d) => d.userId !== userId);
        const nextBookings = bookings.filter((b) => b.userId !== userId);
        setListings(nextListings);
        setDeliveries(nextDeliveries);
        setBookings(nextBookings);
        await persist({ listings: nextListings, deliveries: nextDeliveries, bookings: nextBookings });
      },
    }),
    [listings, deliveries, bookings],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
