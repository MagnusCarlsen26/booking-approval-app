-- Promote a user to admin AFTER they have signed up through the app.
-- Run this in the Supabase SQL editor. Replace the email below.
--
-- (Admins are seeded manually on purpose — there is no self-service
--  "sign up as admin" path, so a renter can never grant themselves
--  admin rights. See the note in 0001_init.sql.)

update public.profiles
set role = 'admin'
where email = 'admin@example.com';

-- Verify:
-- select id, email, role from public.profiles order by created_at;
