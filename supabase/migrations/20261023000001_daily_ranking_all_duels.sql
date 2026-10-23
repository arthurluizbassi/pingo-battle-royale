-- The daily duel ranking now counts EVERY duel of the day, friendly ones included (past the 12
-- XP duels): whoever plays more can win. XP stays limited to 12 duels a day.

create or replace function public.ranking_of_day(p_class uuid, p_day date)
returns table (profile_id uuid, wins integer, duels integer, reached_at timestamptz, place integer)
language sql stable security definer set search_path = public as $$
  with d as (
    select challenger_id as pid, created_at, winner_id = challenger_id as won
      from public.duels
     where class_id = p_class
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

create or replace function public.settle_pending_rankings(p_class uuid)
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
    perform public.settle_daily_ranking(p_class, v_day);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- "create or replace" keeps the existing grants; repeat them so the intent stays explicit
revoke all on function public.ranking_of_day(uuid, date) from public, anon, authenticated;
revoke all on function public.settle_pending_rankings(uuid) from public, anon, authenticated;
grant execute on function public.ranking_of_day(uuid, date) to service_role;
grant execute on function public.settle_pending_rankings(uuid) to service_role;
