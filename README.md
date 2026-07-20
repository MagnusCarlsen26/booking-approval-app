# Booking Approval App

A small booking-approval app with two roles — **Renter** and **Admin** — built with
Next.js (App Router) + TypeScript and Supabase (Auth + Postgres + Row Level Security).

**Live app:** https://booking-approval-app.vercel.app

### Demo accounts (email auto-confirm is on, so you can also just sign up)

| Role   | Email                    | Password      |
| ------ | ------------------------ | ------------- |
| Admin  | admin.demo@example.com   | demopass123   |
| Renter | renter.demo@example.com  | demopass123   |

You can also sign up a fresh account (always created as a **renter**) and, if you want a
second admin, promote it with `supabase/seed-admin.sql`.


- Renters submit booking requests (date, time, note) and track their status.
- Admins review every request and can **Accept**, **Reject**, or **Ask for clarification**.
- The booking status flows through a strict state machine that is enforced in the
  **database** (RLS policies + a `BEFORE UPDATE` trigger), not just the UI.

## Status flow (enforced in the DB)

```
pending
  ├─ accepted                 (admin accepts)
  ├─ rejected                 (admin rejects)
  └─ clarification_requested  (admin asks for clarification)
       └─ renter_responded    (renter replies)
            ├─ accepted        (admin accepts)
            └─ rejected        (admin rejects)
```

Any other transition (e.g. `clarification_requested → accepted`, or changing a
terminal `accepted`/`rejected` booking) is rejected by the trigger.
See `supabase/migrations/0001_init.sql` and `src/lib/status.ts`.

## Roles

- Everyone who signs up is a **renter**.
- **Admins are seeded manually** — there is no "sign up as admin" path, so a renter
  can never grant themselves admin rights. Promote a user with
  `supabase/seed-admin.sql` (set the email, run it in the Supabase SQL editor).

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase **Project URL** and
   **publishable (anon) key** (Supabase dashboard → Project Settings → API Keys).
3. Apply the schema: run `supabase/migrations/0001_init.sql` in the Supabase SQL editor
   (or `supabase db push`).
4. In Supabase → Authentication, this project uses email auto-confirm so signups can
   log in immediately (no inbox round-trip needed for testing).
5. `npm run dev` and open http://localhost:3000.
6. Promote your admin account via `supabase/seed-admin.sql`.

## Tech notes

- **Auth / session**: `@supabase/ssr` with a Next.js `middleware.ts` that refreshes the
  session cookie and keeps unauthenticated users out of `/renter` and `/admin`.
- **Data access**: all reads/writes go through the logged-in user's Supabase client, so
  **RLS is the real access-control boundary** — the UI only decides which buttons to show.
- **Mutations**: Next.js Server Actions (`src/app/**/actions.ts`). Admin actions also
  re-check the transition and use an optimistic-concurrency `.eq('status', …)` guard so a
  stale tab can't drive an illegal change.

## Project structure

```
src/
  app/
    login, signup            auth pages
    auth/actions.ts          login / signup / logout server actions
    renter/                  renter dashboard, booking form, clarification reply
    admin/                   admin dashboard, accept/reject/clarify actions
  components/                shared header + status badge
  lib/
    status.ts                the state machine (mirrors the DB)
    supabase/                browser / server / middleware clients
    auth.ts                  getCurrentUser + requireRole guards
supabase/
  migrations/0001_init.sql   schema + RLS + transition trigger
  seed-admin.sql             promote a user to admin
```
