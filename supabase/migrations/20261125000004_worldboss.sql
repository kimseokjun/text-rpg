-- 4단계: 월드보스 (모든 유저가 피통 하나를 공유, 딜은 서버 함수가 계산)
create table if not exists public.worldboss (
  season int primary key,
  max_hp bigint not null,
  hp bigint not null,
  started_at timestamptz not null default now(),
  killed_at timestamptz,
  killer text
);
alter table public.worldboss enable row level security;
create policy "worldboss readable" on public.worldboss for select using (true);
grant select on public.worldboss to anon, authenticated;

create table if not exists public.worldboss_hits (
  id bigint generated always as identity primary key,
  season int not null references public.worldboss(season) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default '',
  damage bigint not null check (damage >= 0),
  kst_date date not null,
  created_at timestamptz not null default now()
);
alter table public.worldboss_hits enable row level security;
create policy "hits readable" on public.worldboss_hits for select using (true);
grant select on public.worldboss_hits to anon, authenticated;
create index if not exists wb_hits_user_date on public.worldboss_hits (user_id, kst_date);
create index if not exists wb_hits_season on public.worldboss_hits (season);

create table if not exists public.worldboss_claims (
  season int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (season, user_id)
);
alter table public.worldboss_claims enable row level security;
create policy "claims own" on public.worldboss_claims for select to authenticated using (auth.uid() = user_id);
grant select on public.worldboss_claims to authenticated;

create or replace view public.worldboss_rank with (security_invoker = true) as
  select season, user_id, max(username) as username, sum(damage)::bigint as total, count(*)::int as hits
  from public.worldboss_hits group by season, user_id;
grant select on public.worldboss_rank to anon, authenticated;

-- 피해 적용: 행 잠금으로 동시 공격도 안전하게
create or replace function public.wb_hit(p_season int, p_user uuid, p_dmg bigint, p_date date)
returns table (applied bigint, hp_left bigint, killed_now boolean)
language plpgsql security definer set search_path = public as $$
declare b public.worldboss; a bigint; nm text;
begin
  select * into b from public.worldboss where season = p_season for update;
  if b is null then raise exception 'no boss'; end if;
  a := least(greatest(p_dmg, 0), greatest(b.hp, 0));
  nm := (select username from public.profiles where id = p_user);
  insert into public.worldboss_hits (season, user_id, username, damage, kst_date) values (p_season, p_user, coalesce(nm, '?'), a, p_date);
  update public.worldboss set hp = b.hp - a,
    killed_at = case when b.hp - a <= 0 and b.killed_at is null then now() else b.killed_at end,
    killer = case when b.hp - a <= 0 and b.killed_at is null then nm else b.killer end
  where season = p_season;
  return query select a, greatest(b.hp - a, 0), (b.hp - a <= 0 and b.killed_at is null);
end $$;
revoke all on function public.wb_hit(int, uuid, bigint, date) from public, anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.worldboss;
exception when duplicate_object then null; when undefined_object then null; end $$;
