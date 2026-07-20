-- =====================================================================
-- Booking Approval App — schema, RLS, and state-machine enforcement
-- =====================================================================
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- It is idempotent enough to re-run in a fresh project.

-- ---------------------------------------------------------------------
-- Status enum — the ONLY legal statuses a booking can hold.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum (
      'pending',
      'accepted',
      'rejected',
      'clarification_requested',
      'renter_responded'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------
-- profiles: one row per auth user, carries the role.
-- Role is seeded as 'renter'; admins are promoted manually (see
-- supabase/seed-admin.sql). Clients can never write this table.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'renter' check (role in ('renter', 'admin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  renter_id             uuid not null references public.profiles(id) on delete cascade,
  booking_date          date not null,
  booking_time          time not null,
  note                  text,
  status                booking_status not null default 'pending',
  clarification_message text,          -- admin's clarification question
  renter_response       text,          -- renter's reply to that question
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists bookings_renter_id_idx on public.bookings (renter_id);
create index if not exists bookings_status_idx    on public.bookings (status);

-- ---------------------------------------------------------------------
-- Auto-create a profile whenever a new auth user signs up.
-- SECURITY DEFINER so it can insert regardless of RLS.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'renter')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- is_admin(): true when the current user is an admin.
-- SECURITY DEFINER + owned by a privileged role so it bypasses RLS on
-- `profiles` and therefore does NOT cause recursive policy evaluation.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- State-machine + immutability enforcement at the DATABASE layer.
-- This is the source of truth: even a buggy client, a leaked service
-- key used carelessly, or a mis-scoped RLS policy cannot push a booking
-- through an illegal transition.
--
-- Legal transitions (exactly the spec, nothing more):
--   pending                 -> accepted | rejected | clarification_requested
--   clarification_requested -> renter_responded
--   renter_responded        -> accepted | rejected
-- Everything else (e.g. clarification_requested -> accepted, or any
-- transition out of a terminal accepted/rejected) is rejected.
-- ---------------------------------------------------------------------
create or replace function public.enforce_booking_rules()
returns trigger
language plpgsql
as $$
begin
  -- Fields that must never change after a booking is created.
  if new.renter_id    is distinct from old.renter_id
     or new.booking_date is distinct from old.booking_date
     or new.booking_time is distinct from old.booking_time
     or new.note         is distinct from old.note
     or new.created_at   is distinct from old.created_at then
    raise exception 'Cannot modify immutable booking fields';
  end if;

  -- Validate the status transition (only when status actually changes).
  if new.status is distinct from old.status then
    if not (
         (old.status = 'pending'
            and new.status in ('accepted', 'rejected', 'clarification_requested'))
      or (old.status = 'clarification_requested'
            and new.status = 'renter_responded')
      or (old.status = 'renter_responded'
            and new.status in ('accepted', 'rejected'))
    ) then
      raise exception 'Invalid status transition: % -> %', old.status, new.status;
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_booking_rules on public.bookings;
create trigger trg_enforce_booking_rules
  before update on public.bookings
  for each row execute function public.enforce_booking_rules();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;

-- ---- profiles ----
drop policy if exists profiles_select_own   on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;

-- A user can read their own profile...
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

-- ...and an admin can read every profile (needed to show renter emails).
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

-- No client-side INSERT/UPDATE/DELETE policies on profiles => the only
-- way a row is created is the SECURITY DEFINER signup trigger, and the
-- only way a role is changed is a privileged/service action. A renter
-- can therefore never promote themselves to admin.

-- ---- bookings ----
drop policy if exists bookings_select_own    on public.bookings;
drop policy if exists bookings_select_admin  on public.bookings;
drop policy if exists bookings_insert_renter on public.bookings;
drop policy if exists bookings_update_renter on public.bookings;
drop policy if exists bookings_update_admin  on public.bookings;

-- SELECT: renters see only their own bookings; admins see all.
create policy bookings_select_own on public.bookings
  for select using (renter_id = auth.uid());

create policy bookings_select_admin on public.bookings
  for select using (public.is_admin());

-- INSERT: a renter may create only their own booking, and only in the
-- 'pending' state (they cannot self-approve).
create policy bookings_insert_renter on public.bookings
  for insert with check (
    renter_id = auth.uid()
    and status = 'pending'
  );

-- UPDATE (renter): may act ONLY on their own booking, ONLY when it is
-- currently clarification_requested, and may move it ONLY to
-- renter_responded. USING = the existing row, WITH CHECK = the new row,
-- so this alone pins the renter to exactly one legal transition.
create policy bookings_update_renter on public.bookings
  for update
  using      (renter_id = auth.uid() and status = 'clarification_requested')
  with check (renter_id = auth.uid() and status = 'renter_responded');

-- UPDATE (admin): may act on any booking. WHICH transitions are legal is
-- enforced by the trg_enforce_booking_rules trigger above, so this policy
-- only needs to gate on the admin role.
create policy bookings_update_admin on public.bookings
  for update
  using      (public.is_admin())
  with check (public.is_admin());

-- No DELETE policy for anyone => bookings are never deleted by clients.
