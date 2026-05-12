-- ============================================================================
-- Miri Comunity — Supabase schema
--
-- 1. Run this ONCE in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- 2. THEN: Dashboard → Authentication → Providers → Email → toggle OFF
--    "Confirm email" (otherwise signups need an emailed link before login works).
-- 3. THEN: sign up once via the app, and run the UPDATE at the bottom of this
--    file to promote your account to admin.
-- ============================================================================

-- ----- Tables ---------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'User',
  phone text default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price numeric not null,
  description text default '',
  image_uri text,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  seller_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('parcel', 'help_to_buy')),
  pickup text not null,
  dropoff text not null,
  details text default '',
  budget numeric,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  vehicle text not null check (vehicle in ('motorcycle', 'car')),
  pickup text not null,
  dropoff text not null,
  when_time text not null default 'Now',
  passengers int not null default 1,
  notes text,
  offer_amount numeric,
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'completed', 'cancelled', 'expired')),
  accepted_by uuid references public.profiles(id),
  accepted_by_name text,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists listings_created_idx  on public.listings  (created_at desc);
create index if not exists bookings_created_idx  on public.bookings  (created_at desc);
create index if not exists bookings_status_idx   on public.bookings  (status, created_at desc);
create index if not exists deliveries_created_idx on public.deliveries (created_at desc);

-- ----- Auto-create profile on signup ---------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- Admin helper --------------------------------------------------------

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = uid), false);
$$;

-- ----- Row-Level Security --------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.listings   enable row level security;
alter table public.deliveries enable row level security;
alter table public.bookings   enable row level security;

-- profiles: everyone can read; users can update their own profile; admins anything
drop policy if exists "profiles select"        on public.profiles;
drop policy if exists "profiles self update"   on public.profiles;
drop policy if exists "profiles admin update"  on public.profiles;
create policy "profiles select"       on public.profiles for select using (true);
create policy "profiles self update"  on public.profiles for update using (auth.uid() = id);
create policy "profiles admin update" on public.profiles for update using (public.is_admin(auth.uid()));

-- listings: public read; owner insert/update/delete; admin delete
drop policy if exists "listings select"      on public.listings;
drop policy if exists "listings own insert"  on public.listings;
drop policy if exists "listings own update"  on public.listings;
drop policy if exists "listings own delete"  on public.listings;
drop policy if exists "listings admin all"   on public.listings;
create policy "listings select"      on public.listings for select using (true);
create policy "listings own insert"  on public.listings for insert with check (auth.uid() = seller_id);
create policy "listings own update"  on public.listings for update using (auth.uid() = seller_id);
create policy "listings own delete"  on public.listings for delete using (auth.uid() = seller_id);
create policy "listings admin all"   on public.listings for all    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- deliveries: public read; owner insert/update; admin all
drop policy if exists "deliveries select"     on public.deliveries;
drop policy if exists "deliveries own insert" on public.deliveries;
drop policy if exists "deliveries own update" on public.deliveries;
drop policy if exists "deliveries admin all"  on public.deliveries;
create policy "deliveries select"     on public.deliveries for select using (true);
create policy "deliveries own insert" on public.deliveries for insert with check (auth.uid() = user_id);
create policy "deliveries own update" on public.deliveries for update using (auth.uid() = user_id);
create policy "deliveries admin all"  on public.deliveries for all    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- bookings: public read; owner full control; any authenticated user can mark a pending booking as accepted
drop policy if exists "bookings select"        on public.bookings;
drop policy if exists "bookings own insert"    on public.bookings;
drop policy if exists "bookings own update"    on public.bookings;
drop policy if exists "bookings own delete"    on public.bookings;
drop policy if exists "bookings accept update" on public.bookings;
drop policy if exists "bookings admin all"     on public.bookings;
create policy "bookings select"        on public.bookings for select using (true);
create policy "bookings own insert"    on public.bookings for insert with check (auth.uid() = user_id);
create policy "bookings own update"    on public.bookings for update using (auth.uid() = user_id);
create policy "bookings own delete"    on public.bookings for delete using (auth.uid() = user_id);
create policy "bookings accept update" on public.bookings for update
  using (auth.role() = 'authenticated')
  with check (
    accepted_by = auth.uid()
    and status in ('accepted', 'completed')
  );
create policy "bookings admin all"     on public.bookings for all    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ----- Realtime ------------------------------------------------------------

alter publication supabase_realtime add table public.listings;
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.deliveries;
alter publication supabase_realtime add table public.profiles;

-- ============================================================================
-- After your first signup, run THIS to promote your account to admin:
--
--   update public.profiles
--     set role = 'admin'
--     where id = (select id from auth.users where email = 'your@email.com');
-- ============================================================================
