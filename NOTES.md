# Submission note

## How I modeled the booking status/state logic, and why

The status is a Postgres `booking_status` enum with the five required states. The key
decision was **where to enforce the state machine**. I chose to make the **database the
source of truth**, for two reasons: (1) all data access happens through the client's
Supabase connection under RLS, so a bug or a crafted request in the app layer must not be
able to produce an illegal state; (2) the task explicitly grades "no invalid transitions
possible," which to me means "possible at the API/DB, not just hidden in the UI."

So the machine lives in three layers, strongest first:

1. **A `BEFORE UPDATE` trigger** (`enforce_booking_rules`) that whitelists exactly the
   legal transitions and rejects everything else, and also freezes immutable fields
   (date/time/note/renter). This is the real guarantee.
2. **RLS policies** that decide *who* may attempt an update. The renter policy is written
   so a renter can only move their own booking `clarification_requested → renter_responded`
   (the `USING` clause pins the old state, `WITH CHECK` pins the new one). Admins may
   attempt updates on any booking; which transitions are legal is left to the trigger.
   Inserts are forced to `status = 'pending'` so a renter can't self-approve.
3. **A mirrored TypeScript machine** (`src/lib/status.ts`) used only to show the right
   buttons and fail fast with a friendly message. It is deliberately a *mirror*, not the
   authority — the DB will reject an illegal call even if this and the DB ever disagree.

Admin actions also use an optimistic-concurrency guard (`.eq('status', <expected>)`) so
two admins (or a stale tab) can't both act on the same booking.

## Edge cases handled

- Renter cannot see or touch another renter's bookings (RLS `select_own`); admin sees all.
- Renter cannot insert a booking in any state other than `pending`.
- Admin cannot Accept/Reject a booking that is `clarification_requested` (must wait for the
  renter) — this is the exact example the spec calls out.
- No second clarification loop: "Ask for clarification" is only offered from `pending`.
- Terminal `accepted`/`rejected` bookings reject any further transition.
- A renter can't replay their response or change the date while responding (immutable-field
  guard); a double-submit becomes a harmless 0-row no-op.
- Signup trigger auto-creates a `renter` profile; there is no self-service admin path, so a
  renter can never escalate to admin.

## Edge cases knowingly skipped

- No booking cancellation/withdrawal by the renter (out of scope for the given flow).
- No pagination on the admin list (fine for the volumes here).
- Not validating that the booking date is in the future — the spec doesn't require it and
  admins can just reject.
- Minimal styling / no mobile work, as the brief explicitly says not to.

## Which AI agent(s) I used and how

I used **Claude Code (Claude/Anthropic)** as a single agent to scaffold, write the schema
and RLS, build the Next.js app, and — importantly — to *test its own output* against a
live Supabase project (create users, run every transition including the illegal ones, check
RLS separation) before I trusted it.

## A time the agent got something wrong, and how I caught it

The scaffold came up on **Next.js 16**, and the agent initially reported the files were
written and moved on. I didn't assume it worked — I ran `npm run build`, which **exited with
signal SIGBUS (135) and printed nothing**, and then the dev server booted but **crashed the
moment a page was requested** (the first `curl` returned connection-refused because the
compile worker had died). TypeScript (`tsc --noEmit`) passed cleanly, which told me the
*code* was fine and the failure was in the toolchain, not my logic — a native SWC/Turbopack
crash on this machine's kernel. I verified the diagnosis by confirming `next --version` and
the SWC module both loaded fine in isolation, then **pinned the project to Next.js 15.5.4**,
after which `npm run build` produced a clean optimized build and `next start` served every
route (login 200, protected routes 307 → /login). I also had to fix the ESLint flat-config
that the 16→15 change left dangling. Lesson reinforced: a green typecheck is not a working
app — I only believed it once I saw the build succeed and the server actually respond.

(Second, smaller intervention: I insisted the state machine be enforced by a DB trigger, not
just the server action, and wrote an 18-assertion negative-test script against the live DB —
e.g. trying `clarification_requested → accepted` as an admin and confirming a 4xx — to prove
the guarantee rather than assume the policies were right.)

## Roughly how much time

- ~1.5 hrs — Supabase schema, RLS policies, transition trigger, auth wiring
- ~1.5 hrs — renter + admin dashboards and the status-flow server actions
- ~1 hr    — catching/fixing the Next 16 build crash, plus the live RLS/state-machine tests
- ~1 hr    — Supabase project setup, deploy, and this write-up
