-- General admin: a teacher (or any account) that can see EVERY class, read-only.
-- It is a flag, not a new role, so the admin keeps being the teacher of their own class.
-- Users only have SELECT on tables (writes go through the service role), so nobody can
-- turn this on for themselves: only `npm run make-admin` (service role) sets it.
alter table public.profiles
  add column is_admin boolean not null default false;
