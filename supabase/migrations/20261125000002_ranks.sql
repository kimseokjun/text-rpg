-- 2단계: 랭킹 (무한 탑 최고층 · 파티 전투력 · 이번 주 레이드 최고 딜)
create table if not exists public.ranks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default '',
  power int not null default 0 check (power between 0 and 100000000),
  tower_best int not null default 0 check (tower_best between 0 and 10000),
  raid_best bigint not null default 0 check (raid_best between 0 and 100000000000),
  raid_week int not null default 0,
  max_floor int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.ranks enable row level security;
create policy "ranks readable by all" on public.ranks for select using (true);
create policy "ranks insert own" on public.ranks for insert with check (auth.uid() = user_id);
create policy "ranks update own" on public.ranks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select on public.ranks to anon, authenticated;
grant insert, update on public.ranks to authenticated;

-- 이름은 프로필에서 (클라이언트가 바꿔치기 못 하게), 탑 기록은 한 번에 60층 넘게 못 뛰게
create or replace function public.ranks_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.username := (select username from public.profiles where id = new.user_id);
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.tower_best > old.tower_best + 60 then new.tower_best := old.tower_best; end if;
  if tg_op = 'INSERT' and new.tower_best > 60 then new.tower_best := 60; end if;
  return new;
end $$;
drop trigger if exists ranks_guard on public.ranks;
create trigger ranks_guard before insert or update on public.ranks for each row execute function public.ranks_guard();
create index if not exists ranks_power_idx on public.ranks (power desc);
create index if not exists ranks_tower_idx on public.ranks (tower_best desc);
create index if not exists ranks_raid_idx on public.ranks (raid_week, raid_best desc);
