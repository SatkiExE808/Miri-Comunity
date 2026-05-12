import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

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
  userName?: string;
  createdAt: number;
  status: BookingStatus;
  acceptedBy?: string;
  acceptedByName?: string;
  acceptedAt?: number;
};

export const BOOKING_TIMEOUT_MS = 10 * 60 * 1000;

type DataState = {
  listings: Listing[];
  deliveries: DeliveryOrder[];
  bookings: TransportBooking[];
  loading: boolean;
  addListing: (l: Omit<Listing, 'id' | 'createdAt'>) => Promise<void>;
  addDelivery: (d: Omit<DeliveryOrder, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  addBooking: (b: Omit<TransportBooking, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  setBookingStatus: (id: string, status: BookingStatus) => Promise<void>;
  acceptBooking: (id: string, driverId: string, driverName: string) => Promise<void>;
  removeListing: (id: string) => Promise<void>;
  removeDelivery: (id: string) => Promise<void>;
  removeBooking: (id: string) => Promise<void>;
  removeUserContent: (userId: string) => Promise<void>;
};

const DataContext = createContext<DataState | null>(null);

// ----- Row → app type converters ------------------------------------------

function rowToListing(r: any): Listing {
  return {
    id: r.id,
    title: r.title,
    price: Number(r.price),
    description: r.description ?? '',
    imageUri: r.image_uri ?? undefined,
    sellerId: r.seller_id,
    sellerName: r.seller_name,
    createdAt: new Date(r.created_at).getTime(),
  };
}

function rowToDelivery(r: any): DeliveryOrder {
  return {
    id: r.id,
    kind: r.kind,
    pickup: r.pickup,
    dropoff: r.dropoff,
    details: r.details ?? '',
    budget: r.budget == null ? undefined : Number(r.budget),
    userId: r.user_id,
    createdAt: new Date(r.created_at).getTime(),
    status: r.status,
  };
}

function rowToBooking(r: any): TransportBooking {
  return {
    id: r.id,
    vehicle: r.vehicle,
    pickup: r.pickup,
    dropoff: r.dropoff,
    when: r.when_time,
    passengers: r.passengers,
    notes: r.notes ?? undefined,
    offerAmount: r.offer_amount == null ? undefined : Number(r.offer_amount),
    userId: r.user_id,
    userName: r.user_name ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
    status: r.status,
    acceptedBy: r.accepted_by ?? undefined,
    acceptedByName: r.accepted_by_name ?? undefined,
    acceptedAt: r.accepted_at ? new Date(r.accepted_at).getTime() : undefined,
  };
}

// Generic helper: keep a sorted-newest-first array in sync with Postgres changes.
function applyChange<T extends { id: string; createdAt: number }>(
  arr: T[],
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  next: T | null,
  oldId: string | null,
): T[] {
  if (event === 'DELETE' && oldId) {
    return arr.filter((x) => x.id !== oldId);
  }
  if (!next) return arr;
  if (event === 'INSERT') {
    if (arr.some((x) => x.id === next.id)) return arr;
    return [next, ...arr].sort((a, b) => b.createdAt - a.createdAt);
  }
  return arr.map((x) => (x.id === next.id ? next : x));
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [bookings, setBookings] = useState<TransportBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load + realtime subscriptions.
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const [l, d, b] = await Promise.all([
        supabase.from('listings').select('*').order('created_at', { ascending: false }),
        supabase.from('deliveries').select('*').order('created_at', { ascending: false }),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      ]);
      if (!mounted) return;
      if (l.data) setListings(l.data.map(rowToListing));
      if (d.data) setDeliveries(d.data.map(rowToDelivery));
      if (b.data) setBookings(b.data.map(rowToBooking));
      setLoading(false);
    })();

    const channel = supabase
      .channel('public-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, (p: any) => {
        if (!mounted) return;
        const next = p.new ? rowToListing(p.new) : null;
        const oldId = p.old?.id ?? null;
        setListings((curr) => applyChange(curr, p.eventType, next, oldId));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, (p: any) => {
        if (!mounted) return;
        const next = p.new ? rowToDelivery(p.new) : null;
        const oldId = p.old?.id ?? null;
        setDeliveries((curr) => applyChange(curr, p.eventType, next, oldId));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (p: any) => {
        if (!mounted) return;
        const next = p.new ? rowToBooking(p.new) : null;
        const oldId = p.old?.id ?? null;
        setBookings((curr) => applyChange(curr, p.eventType, next, oldId));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);  // refetch when the user changes (login/logout)

  const value = useMemo<DataState>(
    () => ({
      listings,
      deliveries,
      bookings,
      loading,
      async addListing(l) {
        const { error } = await supabase.from('listings').insert({
          title: l.title,
          price: l.price,
          description: l.description,
          image_uri: l.imageUri ?? null,
          seller_id: l.sellerId,
          seller_name: l.sellerName,
        });
        if (error) throw new Error(error.message);
      },
      async addDelivery(d) {
        const { error } = await supabase.from('deliveries').insert({
          kind: d.kind,
          pickup: d.pickup,
          dropoff: d.dropoff,
          details: d.details,
          budget: d.budget ?? null,
          user_id: d.userId,
        });
        if (error) throw new Error(error.message);
      },
      async addBooking(b) {
        const { error } = await supabase.from('bookings').insert({
          vehicle: b.vehicle,
          pickup: b.pickup,
          dropoff: b.dropoff,
          when_time: b.when,
          passengers: b.passengers,
          notes: b.notes ?? null,
          offer_amount: b.offerAmount ?? null,
          user_id: b.userId,
          user_name: b.userName ?? 'User',
        });
        if (error) throw new Error(error.message);
      },
      async setBookingStatus(id, status) {
        const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
        if (error) throw new Error(error.message);
      },
      async acceptBooking(id, driverId, driverName) {
        const { error } = await supabase
          .from('bookings')
          .update({
            status: 'accepted',
            accepted_by: driverId,
            accepted_by_name: driverName,
            accepted_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('status', 'pending');  // race-safe — only flip pending
        if (error) throw new Error(error.message);
      },
      async removeListing(id) {
        const { error } = await supabase.from('listings').delete().eq('id', id);
        if (error) throw new Error(error.message);
      },
      async removeDelivery(id) {
        const { error } = await supabase.from('deliveries').delete().eq('id', id);
        if (error) throw new Error(error.message);
      },
      async removeBooking(id) {
        const { error } = await supabase.from('bookings').delete().eq('id', id);
        if (error) throw new Error(error.message);
      },
      async removeUserContent(userId) {
        await Promise.all([
          supabase.from('listings').delete().eq('seller_id', userId),
          supabase.from('deliveries').delete().eq('user_id', userId),
          supabase.from('bookings').delete().eq('user_id', userId),
        ]);
      },
    }),
    [listings, deliveries, bookings, loading],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
