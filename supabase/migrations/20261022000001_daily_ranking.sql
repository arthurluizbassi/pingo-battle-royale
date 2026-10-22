-- Daily duel ranking: wins in XP-counted duels of the school day (America/Sao_Paulo).
-- The teacher sets the coin prize of the top 3 (0 = no prize). Past days are settled lazily
-- (the first page load after midnight pays yesterday) and exactly once per class and day.

alter table public.classes
  add column daily_prizes integer[] not null default '{0,0,0}'
    check (cardinality(daily_prizes) = 3 and 0 <= all (daily_prizes) and 1000 >= all (daily_prizes));

-- one row per class and settled day: the podium and what each one got
create table public.daily_rankings (
  class_id uuid not null references public.classes (id) on delete cascade,
  day date not null,
  -- [{ "profile_id": uuid, "place": 1, "wins": 9, "prize": 30 }]
  podium jsonb not null default '[]'::jsonb,
  settled_at timestamptz not null default now(),
  primary key (class_id, day)
);
alter table public.daily_rankings enable row level security;
create policy "read class daily rankings" on public.daily_rankings for select to authenticated
  using (class_id = public.auth_class_id());
grant all on public.daily_rankings to service_role;
revoke all on public.daily_rankings from anon, authenticated;
grant select on public.daily_rankings to authenticated;

-- The ranking of one class on one day (internal: callers decide which class).
-- Only XP-counted duels started by the student; ties: whoever reached that number of wins first.
create function public.ranking_of_day(p_class uuid, p_day date)
returns table (profile_id uuid, wins integer, duels integer, reached_at timestamptz, place integer)
language sql stable security definer set search_path = public as $$
  with d as (
    select challenger_id as pid, created_at, winner_id = challenger_id as won
      from public.duels
     where class_id = p_class and counted
       and (created_at at time zone 'America/Sao_Paulo')::date = p_day
  ), agg as (
    select pid, count(*) filter (where won)::integer as wins, count(*)::integer as duels,
           max(created_at) filter (where won) as reached_at
      from d group by pid
  )
  select a.pid, a.wins, a.duels, a.reached_at,
         (row_number() over (order by a.wins desc, a.reached_at asc nulls last, a.pid))::integer
    from agg a
    join public.profiles p on p.id = a.pid and p.role = 'student' and p.active and not p.pending
   order by 5
$$;

-- For students and the teacher: the ranking of THEIR class (default: today).
create function public.daily_ranking(p_day date default null)
returns table (profile_id uuid, wins integer, duels integer, reached_at timestamptz, place integer)
language sql stable security definer set search_path = public as $$
  select * from public.ranking_of_day(
    public.auth_class_id(),
    coalesce(p_day, (now() at time zone 'America/Sao_Paulo')::date)
  )
$$;

-- Pays the podium of a finished day, once. Returns the podium (also when it was already paid).
create function public.settle_daily_ranking(p_class uuid, p_day date)
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
  for r in select * from public.ranking_of_day(p_class, p_day) where wins > 0 and place <= 3 order by place loop
    v_prize := v_prizes[r.place];
    if v_prize > 0 then
      perform public.grant_coins(
        r.profile_id, v_prize, 'special_reward',
        format('Ranking diário de duelos: %sº lugar (%s)', r.place, to_char(p_day, 'DD/MM')), null
      );
    end if;
    v_podium := v_podium || jsonb_build_object('profile_id', r.profile_id, 'place', r.place, 'wins', r.wins, 'prize', v_prize);
  end loop;
  insert into public.daily_rankings (class_id, day, podium) values (p_class, p_day, v_podium);
  return v_podium;
end $$;

-- Settles every finished day of the last two weeks that had duels and is not settled yet.
create function public.settle_pending_rankings(p_class uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_day date;
  v_count integer := 0;
begin
  for v_day in
    select distinct (created_at at time zone 'America/Sao_Paulo')::date
      from public.duels
     where class_id = p_class and counted
       and created_at > now() - interval '14 days'
       and (created_at at time zone 'America/Sao_Paulo')::date < (now() at time zone 'America/Sao_Paulo')::date
    except
    select day from public.daily_rankings where class_id = p_class
  loop
    perform public.settle_daily_ranking(p_class, v_day);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke all on function public.ranking_of_day(uuid, date) from public, anon, authenticated;
revoke all on function public.daily_ranking(date) from public, anon;
revoke all on function public.settle_daily_ranking(uuid, date) from public, anon, authenticated;
revoke all on function public.settle_pending_rankings(uuid) from public, anon, authenticated;
grant execute on function public.daily_ranking(date) to authenticated;
grant execute on function public.ranking_of_day(uuid, date) to service_role;
grant execute on function public.daily_ranking(date) to service_role;
grant execute on function public.settle_daily_ranking(uuid, date) to service_role;
grant execute on function public.settle_pending_rankings(uuid) to service_role;
