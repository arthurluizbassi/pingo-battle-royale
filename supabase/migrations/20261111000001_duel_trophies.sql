-- Duel trophies (Clash-style): the daily ranking stops counting wins and starts counting trophies.
-- Everyone starts the day with p_trophy_start trophies. Each duel is worth p_trophy_k trophies,
-- split by the trophy gap: beating someone with more trophies pays more, losing to someone with
-- fewer costs more. Only the CHALLENGER's trophies move; the defender is never touched.
-- All new parameters have defaults, so the previous server code keeps working during the deploy.

-- null = a duel from before the trophy system
alter table public.duels add column trophy_delta integer;

-- ---------------------------------------------------------------- record a duel (server only)
drop function public.record_duel(uuid, uuid, uuid, integer, text, jsonb, jsonb, jsonb, integer, integer, integer, integer, integer[]);

create function public.record_duel(
  p_challenger uuid, p_defender uuid, p_winner uuid, p_seed integer, p_engine_version text,
  p_balance jsonb, p_snapshots jsonb, p_events jsonb,
  p_xp_win integer, p_xp_loss integer, p_daily_limit integer, p_min_interval_seconds integer,
  p_level_thresholds integer[],
  p_trophy_start integer default 1000, p_trophy_k integer default 60, p_trophy_scale integer default 400
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
  v_day_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_mine integer;
  v_foe integer;
  v_expected numeric;
  v_delta integer;
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

  -- trophies of the day (every duel counts, friendly ones included). Same formula as src/lib/trophies.ts
  select p_trophy_start + coalesce(sum(trophy_delta), 0) into v_mine from public.duels
   where challenger_id = p_challenger and created_at >= v_day_start;
  select p_trophy_start + coalesce(sum(trophy_delta), 0) into v_foe from public.duels
   where challenger_id = p_defender and created_at >= v_day_start;
  v_expected := 1.0 / (1.0 + power(10.0::double precision, (v_foe - v_mine)::double precision / p_trophy_scale));
  if p_winner = p_challenger then
    v_delta := greatest(1, round(p_trophy_k * (1 - v_expected))::integer);
  else
    -- floor: never below zero
    v_delta := -least(v_mine, greatest(1, round(p_trophy_k * v_expected)::integer));
  end if;

  insert into public.duels (class_id, challenger_id, defender_id, winner_id, seed, engine_version, balance,
                            snapshots, events, xp_gained, counted, trophy_delta)
  values (v_class, p_challenger, p_defender, p_winner, p_seed, p_engine_version, p_balance,
          p_snapshots, p_events, v_gained, v_counted, v_delta)
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
    'duels_today', v_today + case when v_counted then 1 else 0 end,
    'trophies_before', v_mine,
    'trophies_after', v_mine + v_delta,
    'foe_trophies', v_foe
  );
end $$;

-- ---------------------------------------------------------------- daily ranking by trophies
drop function public.daily_ranking(date);
drop function public.ranking_of_day(uuid, date);
drop function public.settle_daily_ranking(uuid, date);
drop function public.settle_pending_rankings(uuid);

-- Order: who qualified for the podium first (p_min_duels duels in the day), then trophies, then wins;
-- tie: whoever got there first. A day from before the trophy system has no trophy data: everyone
-- sits at p_start, so it falls back to the old rule (wins, at least one win to qualify).
create function public.ranking_of_day(p_class uuid, p_day date, p_min_duels integer default 5, p_start integer default 1000)
returns table (profile_id uuid, trophies integer, wins integer, duels integer, reached_at timestamptz, place integer, qualified boolean)
language sql stable security definer set search_path = public as $$
  with d as (
    select challenger_id as pid, created_at, winner_id = challenger_id as won, trophy_delta
      from public.duels
     where class_id = p_class
       and (created_at at time zone 'America/Sao_Paulo')::date = p_day
  ), day as (
    select coalesce(bool_or(trophy_delta is not null), false) as has_trophies from d
  ), agg as (
    select pid, (p_start + coalesce(sum(trophy_delta), 0))::integer as trophies,
           count(*) filter (where won)::integer as wins, count(*)::integer as duels,
           case when (select has_trophies from day) then max(created_at) else max(created_at) filter (where won) end as reached_at,
           case when (select has_trophies from day) then count(*) >= p_min_duels else count(*) filter (where won) > 0 end as qualified
      from d group by pid
  )
  select a.pid, a.trophies, a.wins, a.duels, a.reached_at,
         (row_number() over (order by a.qualified desc, a.trophies desc, a.wins desc, a.reached_at asc nulls last, a.pid))::integer,
         a.qualified
    from agg a
    join public.profiles p on p.id = a.pid and p.role = 'student' and p.active and not p.pending
   order by 6
$$;

-- For students and the teacher: the ranking of THEIR class (default: today).
create function public.daily_ranking(p_day date default null, p_min_duels integer default 5, p_start integer default 1000)
returns table (profile_id uuid, trophies integer, wins integer, duels integer, reached_at timestamptz, place integer, qualified boolean)
language sql stable security definer set search_path = public as $$
  select * from public.ranking_of_day(
    public.auth_class_id(),
    coalesce(p_day, (now() at time zone 'America/Sao_Paulo')::date),
    p_min_duels, p_start
  )
$$;

-- Pays the podium of a finished day, once. Returns the podium (also when it was already paid).
create function public.settle_daily_ranking(p_class uuid, p_day date, p_min_duels integer default 5, p_start integer default 1000)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_prizes integer[];
  v_podium jsonb := '[]'::jsonb;
  v_prize integer;
  r record;
begin
  if p_day >= (now() at time zone 'America/Sao_Paulo')::date then raise exception 'day_not_over'; end if;
  -- the class row lock makes two simultaneous settlements run one after the other
  select daily_prizes into v_prizes from public.classes where id = p_class for update;
  if not found then raise exception 'not_allowed'; end if;
  select podium into v_podium from public.daily_rankings where class_id = p_class and day = p_day;
  if found then return v_podium; end if;

  v_podium := '[]'::jsonb;
  for r in select * from public.ranking_of_day(p_class, p_day, p_min_duels, p_start) where qualified and place <= 3 order by place loop
    v_prize := v_prizes[r.place];
    if v_prize > 0 then
      perform public.grant_coins(
        r.profile_id, v_prize, 'special_reward',
        format('Ranking diário de duelos: %sº lugar (%s)', r.place, to_char(p_day, 'DD/MM')), null
      );
    end if;
    v_podium := v_podium || jsonb_build_object(
      'profile_id', r.profile_id, 'place', r.place, 'wins', r.wins, 'trophies', r.trophies, 'prize', v_prize);
  end loop;
  insert into public.daily_rankings (class_id, day, podium) values (p_class, p_day, v_podium);
  return v_podium;
end $$;

-- Settles every finished day of the last two weeks that had duels and is not settled yet.
create function public.settle_pending_rankings(p_class uuid, p_min_duels integer default 5, p_start integer default 1000)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_day date;
  v_count integer := 0;
begin
  for v_day in
    select distinct (created_at at time zone 'America/Sao_Paulo')::date
      from public.duels
     where class_id = p_class
       and created_at > now() - interval '14 days'
       and (created_at at time zone 'America/Sao_Paulo')::date < (now() at time zone 'America/Sao_Paulo')::date
    except
    select day from public.daily_rankings where class_id = p_class
  loop
    perform public.settle_daily_ranking(p_class, v_day, p_min_duels, p_start);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- new functions are executable by PUBLIC by default: server only (students only read the ranking)
revoke all on function public.record_duel(uuid, uuid, uuid, integer, text, jsonb, jsonb, jsonb, integer, integer, integer, integer, integer[], integer, integer, integer) from public, anon, authenticated;
revoke all on function public.ranking_of_day(uuid, date, integer, integer) from public, anon, authenticated;
revoke all on function public.daily_ranking(date, integer, integer) from public, anon;
revoke all on function public.settle_daily_ranking(uuid, date, integer, integer) from public, anon, authenticated;
revoke all on function public.settle_pending_rankings(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.record_duel(uuid, uuid, uuid, integer, text, jsonb, jsonb, jsonb, integer, integer, integer, integer, integer[], integer, integer, integer) to service_role;
grant execute on function public.ranking_of_day(uuid, date, integer, integer) to service_role;
grant execute on function public.daily_ranking(date, integer, integer) to authenticated;
grant execute on function public.daily_ranking(date, integer, integer) to service_role;
grant execute on function public.settle_daily_ranking(uuid, date, integer, integer) to service_role;
grant execute on function public.settle_pending_rankings(uuid, integer, integer) to service_role;
