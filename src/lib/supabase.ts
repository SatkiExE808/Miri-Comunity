import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Public (publishable) anon key — safe to ship in the client.
// Never put the service_role key here.
const SUPABASE_URL = 'https://yzcjocslxkrzjurnifse.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_q4K4MYXZo6fesVt_sUpMtA_XRpa52s8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  profiles: {
    id: string;
    name: string;
    phone: string;
    role: 'user' | 'admin';
    banned: boolean;
    created_at: string;
  };
  listings: {
    id: string;
    title: string;
    price: number;
    description: string;
    image_uri: string | null;
    seller_id: string;
    seller_name: string;
    created_at: string;
  };
  deliveries: {
    id: string;
    kind: 'parcel' | 'help_to_buy';
    pickup: string;
    dropoff: string;
    details: string;
    budget: number | null;
    user_id: string;
    status: 'pending' | 'accepted' | 'completed';
    created_at: string;
  };
  bookings: {
    id: string;
    vehicle: 'motorcycle' | 'car';
    pickup: string;
    dropoff: string;
    when_time: string;
    passengers: number;
    notes: string | null;
    offer_amount: number | null;
    user_id: string;
    user_name: string;
    status: 'pending' | 'accepted' | 'completed' | 'cancelled' | 'expired';
    accepted_by: string | null;
    accepted_by_name: string | null;
    accepted_at: string | null;
    created_at: string;
  };
};
