-- Duels (1v1 against a classmate's Pingo), XP, levels and stat points.
-- Everything is written by the server (service role) through the functions below;
-- students only READ, filtered by RLS — same model as wallets and battles.

-- One row per student, created on the first duel. Missing row = level 1, 0 XP.
create table public.pingo_progress (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level between 1 and 100),
  -- how many times each stat was upgraded, e.g. {"hp": 3, "spd": 1}
  stat_points jsonb not null default '{}'::jsonb,
  -- points already used (an upgrade can cost more than 1 point)
  points_spent integer not null default 0 check (points_spent >= 0),
  updated_at timestamptz not null default now()
);

create table public.duels (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id),
  challenger_id uuid not null references public.profiles (id) on delete cascade,
  defender_id uuid not null references public.profiles (id) on delete cascade,
  winner_id uuid not null references public.profiles (id) on delete cascade,
  seed integer not null,
  engine_version text not null,
  balance jsonb not null,
  -- both Pingos frozen at the moment of the duel: [challenger, defender]
  snapshots jsonb not null,
  events jsonb not null,
  xp_gained integer not null default 0 check (xp_gained >= 0),
  -- false = past the daily limit (a friendly duel, no XP)
  counted boolean not null,
  created_at timestamptz not null default now(),
  check (challenger_id <> defender_id)
);
create index duels_challenger_idx on public.duels (challenger_id, created_at desc);
create index duels_defender_idx on public.duels (defender_id, created_at desc);
create index duels_class_idx on public.duels (class_id, created_at desc);

alter table public.pingo_progress enable row level security;
alter table public.duels enable row level security;

-- levels are public inside the class (shown in the duel VS screen and profiles)
create policy "read classmates progress" on public.pingo_progress for select to authenticated
  using (public.in_my_class(owner_id));
-- a duel is visible to the two students in it, and to the teacher of the class
create policy "read own duels or teacher" on public.duels for select to authenticated
  using (
    challenger_id = auth.uid() or defender_id = auth.uid()
    or (public.auth_is_teacher() and class_id = public.auth_class_id())
  );

grant all on public.pingo_progress, public.duels to service_role;
revoke all on public.pingo_progress, public.duels from anon, authenticated;
grant select on public.pingo_progress, public.duels to authenticated;

-- ---------------------------------------------------------------- record a duel (server only)
-- The server picks the opponent and runs the engine; this function saves the result and
-- decides the XP atomically: daily limit, anti-spam interval and level-ups all happen here.
-- p_level_thresholds[i] = total XP needed to reach level i + 1 (from src/lib/levels.ts).
create function public.record_duel(
  p_challenger uuid, p_defender uuid, p_winner uuid, p_seed integer, p_engine_version text,
  p_balance jsonb, p_snapshots jsonb, p_events jsonb,
  p_xp_win integer, p_xp_loss integer, p_daily_limit integer, p_min_interval_seconds integer,
  p_level_thresholds integer[]
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_class uuid;
  v_progress public.pingo_progress;
  v_today integer;
  v_counted boolean;
  v_gained integer;
  v_xp integer;
  v_level integer;
  v_id uuid;
begin
  if p_winner not in (p_challenger, p_defender) then raise exception 'invalid_winner'; end if;

  select c.class_id into v_class
    from public.profiles c join public.profiles d on d.class_id = c.class_id
   where c.id = p_challenger and d.id = p_defender
     and c.role = 'student' and d.role = 'student'
     and c.active and d.active and not c.pending and not d.pending;
  if v_class is null then raise exception 'not_allowed'; end if;

  insert into public.pingo_progress (owner_id) values (p_challenger) on conflict do nothing;
  -- row lock: two duels started at the same time are counted one after the other
  select * into v_progress from public.pingo_progress where owner_id = p_challenger for update;

  if exists (
    select 1 from public.duels
     where challenger_id = p_challenger and created_at > now() - make_interval(secs => p_min_interval_seconds)
  ) then
    raise exception 'too_fast';
  end if;

  select count(*) into v_today from public.duels
   where challenger_id = p_challenger and counted
     and (created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;

  v_counted := v_today < p_daily_limit;
  v_gained := case when not v_counted then 0 when p_winner = p_challenger then p_xp_win else p_xp_loss end;
  v_xp := v_progress.xp + v_gained;
  v_level := 1 + (select count(*) from unnest(p_level_thresholds) as t where t <= v_xp);

  insert into public.duels (class_id, challenger_id, defender_id, winner_id, seed, engine_version, balance,
                            snapshots, events, xp_gained, counted)
  values (v_class, p_challenger, p_defender, p_winner, p_seed, p_engine_version, p_balance,
          p_snapshots, p_events, v_gained, v_counted)
  returning id into v_id;

  update public.pingo_progress set xp = v_xp, level = v_level, updated_at = now() where owner_id = p_challenger;

  return jsonb_build_object(
    'duel_id', v_id,
    'counted', v_counted,
    'xp_gained', v_gained,
    'xp_before', v_progress.xp,
    'xp_after', v_xp,
    'level_before', v_progress.level,
    'level_after', v_level,
    'duels_today', v_today + case when v_counted then 1 else 0 end
  );
end $$;

-- ---------------------------------------------------------------- stat points (server only)
-- The server validates the stat caps with the engine first; this keeps the point budget atomic.
create function public.spend_stat_point(p_owner uuid, p_stat text, p_cost integer, p_points_per_level integer)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_progress public.pingo_progress;
begin
  if p_stat not in ('hp', 'atk', 'def', 'spd', 'crit', 'dodge') or p_cost < 1 then raise exception 'not_allowed'; end if;
  insert into public.pingo_progress (owner_id) values (p_owner) on conflict do nothing;
  select * into v_progress from public.pingo_progress where owner_id = p_owner for update;
  if (v_progress.level - 1) * p_points_per_level - v_progress.points_spent < p_cost then
    raise exception 'no_points';
  end if;
  update public.pingo_progress
     set stat_points = jsonb_set(stat_points, array[p_stat], to_jsonb(coalesce((stat_points ->> p_stat)::integer, 0) + 1)),
         points_spent = points_spent + p_cost,
         updated_at = now()
   where owner_id = p_owner;
end $$;

create function public.reset_stat_points(p_owner uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.pingo_progress set stat_points = '{}'::jsonb, points_spent = 0, updated_at = now()
   where owner_id = p_owner;
end $$;

-- teacher: new season, everyone starts again from level 1 (duel history is kept)
create function public.reset_class_progress(p_class uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.pingo_progress p
   using public.profiles s
   where s.id = p.owner_id and s.class_id = p_class;
end $$;

-- new functions are executable by PUBLIC by default: server only
revoke all on function public.record_duel(uuid, uuid, uuid, integer, text, jsonb, jsonb, jsonb, integer, integer, integer, integer, integer[]) from public, anon, authenticated;
revoke all on function public.spend_stat_point(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.reset_stat_points(uuid) from public, anon, authenticated;
revoke all on function public.reset_class_progress(uuid) from public, anon, authenticated;
grant execute on function public.record_duel(uuid, uuid, uuid, integer, text, jsonb, jsonb, jsonb, integer, integer, integer, integer, integer[]) to service_role;
grant execute on function public.spend_stat_point(uuid, text, integer, integer) to service_role;
grant execute on function public.reset_stat_points(uuid) to service_role;
grant execute on function public.reset_class_progress(uuid) to service_role;
