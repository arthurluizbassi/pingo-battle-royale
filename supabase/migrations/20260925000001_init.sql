-- Pingo Battle Royale — initial schema
-- Principles:
--   * Every balance change goes through a SECURITY DEFINER function that writes the ledger.
--   * Browser clients (anon/authenticated) can only SELECT (via RLS) and call the two student RPCs
--     (buy_item, equip_item). Everything else runs server-side with the service role.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- types
create type public.user_role as enum ('student', 'teacher');
create type public.item_category as enum ('weapon', 'helmet', 'outfit');
create type public.tx_type as enum ('activity', 'admin_adjustment', 'purchase', 'special_reward');
create type public.battle_status as enum ('scheduled', 'locked', 'finished', 'cancelled');
create type public.rotation_mode as enum ('auto', 'manual');

-- ---------------------------------------------------------------- tables
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  shop_rotation_days integer not null default 7 check (shop_rotation_days between 1 and 60),
  shop_items_per_category integer not null default 5 check (shop_items_per_category between 1 and 30),
  shop_auto_rotate boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  class_id uuid not null references public.classes (id),
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  role public.user_role not null default 'student',
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);
create index profiles_class_idx on public.profiles (class_id);

create table public.pingos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  body_color text not null default 'azul' check (body_color ~ '^[a-z]{1,20}$'),
  eyes text not null default 'redondo' check (eyes ~ '^[a-z]{1,20}$'),
  mouth text not null default 'sorriso' check (mouth ~ '^[a-z]{1,20}$'),
  detail text not null default 'bochechas' check (detail ~ '^[a-z]{1,20}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallets (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- Catalog mirror of src/content/items (synced automatically by the server).
create table public.items (
  id text primary key,
  category public.item_category not null,
  name text not null,
  tier smallint not null check (tier between 1 and 4),
  price integer not null check (price > 0),
  data jsonb not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0),
  type public.tx_type not null,
  reason text not null check (char_length(reason) between 1 and 200),
  balance_after integer not null check (balance_after >= 0),
  item_id text references public.items (id),
  batch_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index wallet_transactions_owner_idx on public.wallet_transactions (owner_id, created_at desc);

create table public.inventories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null references public.items (id),
  acquired_at timestamptz not null default now(),
  unique (owner_id, item_id)
);

create table public.equipped_items (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slot public.item_category not null,
  item_id text not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, slot),
  -- you can only equip what you own
  foreign key (owner_id, item_id) references public.inventories (owner_id, item_id) on delete cascade
);

create table public.shop_rotations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  item_ids text[] not null,
  mode public.rotation_mode not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index shop_rotations_class_idx on public.shop_rotations (class_id, starts_at desc);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index seasons_one_active_per_class on public.seasons (class_id) where active;

create table public.battles (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  season_id uuid references public.seasons (id) on delete set null,
  number integer not null,
  name text not null check (char_length(name) between 1 and 80),
  scheduled_at timestamptz,
  prize_text text check (char_length(prize_text) <= 200),
  status public.battle_status not null default 'scheduled',
  seed integer,
  engine_version text,
  balance_snapshot jsonb,
  winner_id uuid references public.profiles (id) on delete set null,
  summary jsonb,
  locked_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (class_id, number)
);
create index battles_class_idx on public.battles (class_id, created_at desc);

create table public.battle_participants (
  battle_id uuid not null references public.battles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- frozen copy at LOCK LOADOUTS: names, cosmetics, full item definitions, stats, effects
  snapshot jsonb,
  power_score integer,
  placement integer,
  kills integer,
  attacks integer,
  hits integer,
  crits integer,
  dodges integer,
  blocks integer,
  damage_dealt integer,
  damage_taken integer,
  biggest_hit integer,
  eliminated_by uuid,
  joined_at timestamptz not null default now(),
  primary key (battle_id, profile_id)
);
create index battle_participants_profile_idx on public.battle_participants (profile_id);

create table public.battle_events (
  battle_id uuid not null references public.battles (id) on delete cascade,
  seq integer not null,
  tick integer not null,
  type text not null,
  payload jsonb not null,
  primary key (battle_id, seq)
);

create table public.trophies (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  battle_id uuid references public.battles (id) on delete cascade,
  season_id uuid references public.seasons (id) on delete set null,
  kind text not null check (kind in ('champion', 'runner_up', 'third', 'top_eliminator', 'season_champion')),
  label text not null,
  created_at timestamptz not null default now()
);
create index trophies_profile_idx on public.trophies (profile_id);

create table public.app_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- auth helpers
-- SECURITY DEFINER so RLS policies can use them without recursive policy checks.
create or replace function public.auth_class_id()
returns uuid language sql stable security definer set search_path = public as $$
  select class_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.auth_is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'teacher' from public.profiles where id = auth.uid() and active), false)
$$;

create or replace function public.in_my_class(p_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = p_profile and p.class_id = public.auth_class_id()
  )
$$;

-- ---------------------------------------------------------------- RLS (read-only for clients)
alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.pingos enable row level security;
alter table public.wallets enable row level security;
alter table public.items enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.inventories enable row level security;
alter table public.equipped_items enable row level security;
alter table public.shop_rotations enable row level security;
alter table public.seasons enable row level security;
alter table public.battles enable row level security;
alter table public.battle_participants enable row level security;
alter table public.battle_events enable row level security;
alter table public.trophies enable row level security;
alter table public.app_meta enable row level security;

create policy "read own class" on public.classes for select to authenticated
  using (id = public.auth_class_id());
create policy "read classmates" on public.profiles for select to authenticated
  using (class_id = public.auth_class_id());
create policy "read classmates pingos" on public.pingos for select to authenticated
  using (public.in_my_class(owner_id));
create policy "read own wallet or teacher" on public.wallets for select to authenticated
  using (owner_id = auth.uid() or (public.auth_is_teacher() and public.in_my_class(owner_id)));
create policy "read catalog" on public.items for select to authenticated using (true);
create policy "read own transactions or teacher" on public.wallet_transactions for select to authenticated
  using (owner_id = auth.uid() or (public.auth_is_teacher() and public.in_my_class(owner_id)));
create policy "read own inventory or teacher" on public.inventories for select to authenticated
  using (owner_id = auth.uid() or (public.auth_is_teacher() and public.in_my_class(owner_id)));
create policy "read classmates loadouts" on public.equipped_items for select to authenticated
  using (public.in_my_class(owner_id));
create policy "read class shop" on public.shop_rotations for select to authenticated
  using (class_id = public.auth_class_id());
create policy "read class seasons" on public.seasons for select to authenticated
  using (class_id = public.auth_class_id());
create policy "read class battles" on public.battles for select to authenticated
  using (class_id = public.auth_class_id());
create policy "read class battle participants" on public.battle_participants for select to authenticated
  using (exists (select 1 from public.battles b where b.id = battle_id and b.class_id = public.auth_class_id()));
create policy "read finished battle events" on public.battle_events for select to authenticated
  using (exists (
    select 1 from public.battles b
    where b.id = battle_id and b.class_id = public.auth_class_id() and b.status = 'finished'
  ));
create policy "read class trophies" on public.trophies for select to authenticated
  using (public.in_my_class(profile_id));
-- app_meta: no policy => no client access

-- ---------------------------------------------------------------- student RPCs (use auth.uid())
create or replace function public.buy_item(p_item_id text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_item public.items;
  v_rotation public.shop_rotations;
  v_balance integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found or not v_profile.active or v_profile.role <> 'student' then
    raise exception 'not_allowed';
  end if;

  select * into v_item from public.items where id = p_item_id and active;
  if not found then raise exception 'item_not_found'; end if;

  select * into v_rotation from public.shop_rotations
   where class_id = v_profile.class_id and starts_at <= now() and (ends_at is null or ends_at > now())
   order by starts_at desc limit 1;
  if not found or not (p_item_id = any (v_rotation.item_ids)) then
    raise exception 'item_not_in_shop';
  end if;

  if exists (select 1 from public.inventories where owner_id = v_uid and item_id = p_item_id) then
    raise exception 'already_owned';
  end if;

  -- atomic: the row is locked and the balance can never go negative
  update public.wallets set balance = balance - v_item.price, updated_at = now()
   where owner_id = v_uid and balance >= v_item.price
   returning balance into v_balance;
  if not found then raise exception 'insufficient_funds'; end if;

  insert into public.inventories (owner_id, item_id) values (v_uid, p_item_id);
  insert into public.wallet_transactions (owner_id, amount, type, reason, balance_after, item_id, created_by)
  values (v_uid, -v_item.price, 'purchase', 'Compra: ' || v_item.name, v_balance, p_item_id, v_uid);

  return jsonb_build_object('balance', v_balance, 'item_id', p_item_id);
end $$;

create or replace function public.equip_item(p_slot public.item_category, p_item_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_category public.item_category;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and active and role = 'student') then
    raise exception 'not_allowed';
  end if;

  if p_item_id is null then
    delete from public.equipped_items where owner_id = v_uid and slot = p_slot;
    return;
  end if;

  select category into v_category from public.items where id = p_item_id;
  if v_category is distinct from p_slot then raise exception 'wrong_slot'; end if;
  if not exists (select 1 from public.inventories where owner_id = v_uid and item_id = p_item_id) then
    raise exception 'not_owned';
  end if;

  insert into public.equipped_items (owner_id, slot, item_id) values (v_uid, p_slot, p_item_id)
  on conflict (owner_id, slot) do update set item_id = excluded.item_id, updated_at = now();
end $$;

-- ---------------------------------------------------------------- server-only functions (service role)
create or replace function public.setup_profile(
  p_user_id uuid, p_class_id uuid, p_username text, p_display_name text,
  p_role public.user_role, p_pingo_name text, p_must_change_password boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, class_id, username, display_name, role, must_change_password)
  values (p_user_id, p_class_id, p_username, p_display_name, p_role, p_must_change_password);
  if p_role = 'student' then
    insert into public.wallets (owner_id) values (p_user_id);
    insert into public.pingos (owner_id, name) values (p_user_id, p_pingo_name);
  end if;
end $$;

create or replace function public.grant_coins(
  p_owner uuid, p_amount integer, p_type public.tx_type, p_reason text, p_actor uuid, p_batch uuid default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
begin
  if p_amount = 0 then raise exception 'zero_amount'; end if;
  if p_type = 'purchase' then raise exception 'invalid_type'; end if;
  update public.wallets set balance = balance + p_amount, updated_at = now()
   where owner_id = p_owner and balance + p_amount >= 0
   returning balance into v_balance;
  if not found then raise exception 'insufficient_funds'; end if;
  insert into public.wallet_transactions (owner_id, amount, type, reason, balance_after, batch_id, created_by)
  values (p_owner, p_amount, p_type, p_reason, v_balance, p_batch, p_actor);
  return v_balance;
end $$;

-- all-or-nothing batch reward (e.g. "Atividade 04: +100 for Ana, Bruno, Daniel")
create or replace function public.grant_coins_batch(
  p_owners uuid[], p_amount integer, p_type public.tx_type, p_reason text, p_actor uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_batch uuid := gen_random_uuid();
  v_owner uuid;
begin
  foreach v_owner in array p_owners loop
    perform public.grant_coins(v_owner, p_amount, p_type, p_reason, p_actor, v_batch);
  end loop;
  return v_batch;
end $$;

create or replace function public.create_battle(
  p_class_id uuid, p_season_id uuid, p_name text, p_scheduled_at timestamptz, p_prize_text text, p_actor uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_number integer;
begin
  -- serialize numbering per class
  perform 1 from public.classes where id = p_class_id for update;
  select coalesce(max(number), 0) + 1 into v_number from public.battles where class_id = p_class_id;
  insert into public.battles (class_id, season_id, number, name, scheduled_at, prize_text, created_by)
  values (p_class_id, p_season_id, v_number, replace(p_name, '#N', '#' || v_number), p_scheduled_at, p_prize_text, p_actor)
  returning id into v_id;
  return v_id;
end $$;

-- LOCK LOADOUTS: stores the frozen snapshot of every participant
create or replace function public.lock_battle(p_battle_id uuid, p_snapshots jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
begin
  update public.battles set status = 'locked', locked_at = now()
   where id = p_battle_id and status = 'scheduled';
  if not found then raise exception 'battle_not_scheduled'; end if;
  for v_row in select * from jsonb_array_elements(p_snapshots) loop
    update public.battle_participants
       set snapshot = v_row -> 'snapshot', power_score = (v_row ->> 'power_score')::integer
     where battle_id = p_battle_id and profile_id = (v_row ->> 'profile_id')::uuid;
  end loop;
end $$;

-- START BATTLE result: everything is written in ONE transaction
create or replace function public.finish_battle(
  p_battle_id uuid, p_seed integer, p_engine_version text, p_balance jsonb, p_winner uuid,
  p_summary jsonb, p_results jsonb, p_events jsonb, p_trophies jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_season uuid;
begin
  update public.battles
     set status = 'finished', seed = p_seed, engine_version = p_engine_version, balance_snapshot = p_balance,
         winner_id = p_winner, summary = p_summary, started_at = now(), finished_at = now()
   where id = p_battle_id and status = 'locked'
   returning season_id into v_season;
  if not found then raise exception 'battle_not_locked'; end if;

  for v_row in select * from jsonb_array_elements(p_results) loop
    update public.battle_participants set
      placement = (v_row ->> 'placement')::integer,
      kills = (v_row ->> 'kills')::integer,
      attacks = (v_row ->> 'attacks')::integer,
      hits = (v_row ->> 'hits')::integer,
      crits = (v_row ->> 'crits')::integer,
      dodges = (v_row ->> 'dodges')::integer,
      blocks = (v_row ->> 'blocks')::integer,
      damage_dealt = (v_row ->> 'damageDealt')::integer,
      damage_taken = (v_row ->> 'damageTaken')::integer,
      biggest_hit = (v_row ->> 'biggestHit')::integer,
      eliminated_by = nullif(v_row ->> 'eliminatedBy', '')::uuid
    where battle_id = p_battle_id and profile_id = (v_row ->> 'profile_id')::uuid;
  end loop;

  insert into public.battle_events (battle_id, seq, tick, type, payload)
  select p_battle_id, (e.ordinality - 1)::integer, (e.value ->> 't')::integer, e.value ->> 'type', e.value
    from jsonb_array_elements(p_events) with ordinality as e;

  insert into public.trophies (profile_id, battle_id, season_id, kind, label)
  select (t ->> 'profile_id')::uuid, p_battle_id, v_season, t ->> 'kind', t ->> 'label'
    from jsonb_array_elements(p_trophies) as t;
end $$;

-- ---------------------------------------------------------------- privileges
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.auth_class_id() to authenticated;
grant execute on function public.auth_is_teacher() to authenticated;
grant execute on function public.in_my_class(uuid) to authenticated;
grant execute on function public.buy_item(text) to authenticated;
grant execute on function public.equip_item(public.item_category, text) to authenticated;
grant execute on all functions in schema public to service_role;

-- clients never write tables directly (no insert/update/delete policies), but be explicit:
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
