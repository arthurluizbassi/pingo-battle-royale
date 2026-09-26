-- Students can join a class with a code; the teacher approves each request.

alter table public.classes
  add column join_code text unique check (join_code ~ '^[A-Z0-9]{6}$'),
  add column join_enabled boolean not null default false;

-- pending = signed up with the class code, waiting for the teacher.
-- Pending profiles are also inactive, so every RLS helper already hides the class from them.
alter table public.profiles
  add column pending boolean not null default false;

-- a user can always read their OWN profile (needed to tell "pending" apart from "deactivated" at login)
create policy "read own profile" on public.profiles for select to authenticated
  using (id = auth.uid());

-- setup_profile gains p_pending (drop first so there is no ambiguous overload)
drop function public.setup_profile(uuid, uuid, text, text, public.user_role, text, boolean);
create function public.setup_profile(
  p_user_id uuid, p_class_id uuid, p_username text, p_display_name text,
  p_role public.user_role, p_pingo_name text, p_must_change_password boolean, p_pending boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, class_id, username, display_name, role, must_change_password, pending, active)
  values (p_user_id, p_class_id, p_username, p_display_name, p_role, p_must_change_password, p_pending, not p_pending);
  if p_role = 'student' then
    insert into public.wallets (owner_id) values (p_user_id);
    insert into public.pingos (owner_id, name) values (p_user_id, p_pingo_name);
  end if;
end $$;

-- new functions are executable by PUBLIC by default: lock it down again
revoke all on function public.setup_profile(uuid, uuid, text, text, public.user_role, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.setup_profile(uuid, uuid, text, text, public.user_role, text, boolean, boolean) to service_role;
