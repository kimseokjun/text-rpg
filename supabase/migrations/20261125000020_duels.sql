-- 친구 결투: 친구의 파티 정보 조회 (친구끼리만) + 결투 기록
create or replace function public.duel_target(p_target uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d jsonb; u text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists (
    select 1 from public.friendships f where f.status = 'accepted'
      and least(f.requester, f.addressee) = least(auth.uid(), p_target)
      and greatest(f.requester, f.addressee) = greatest(auth.uid(), p_target)
  ) then raise exception 'not friends'; end if;
  select s.data into d from public.saves s where s.user_id = p_target;
  if d is null then raise exception 'no save'; end if;
  select username into u from public.profiles where id = p_target;
  return jsonb_build_object('username', u, 'roster', d->'roster', 'party', d->'party', 'pets', d->'pets',
    'activePet', d->'activePet', 'cards', d->'cards', 'deck', d->'deck');
end $$;
revoke all on function public.duel_target(uuid) from public;
grant execute on function public.duel_target(uuid) to authenticated;

create table if not exists public.duels (
  id bigint generated always as identity primary key,
  attacker uuid not null references auth.users(id) on delete cascade default auth.uid(),
  defender uuid not null references auth.users(id) on delete cascade,
  attacker_name text not null default '',
  defender_name text not null default '',
  size int not null check (size between 1 and 4),
  win boolean not null,
  created_at timestamptz not null default now()
);
alter table public.duels enable row level security;
create policy "duels visible to both" on public.duels for select to authenticated using (auth.uid() in (attacker, defender));
create policy "duels insert own" on public.duels for insert to authenticated with check (auth.uid() = attacker);
grant select, insert on public.duels to authenticated;
create index if not exists duels_attacker_idx on public.duels (attacker, id desc);
create index if not exists duels_defender_idx on public.duels (defender, id desc);

create or replace function public.duel_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.attacker := auth.uid();
  new.attacker_name := (select username from public.profiles where id = new.attacker);
  new.defender_name := (select username from public.profiles where id = new.defender);
  new.created_at := now();
  if exists (select 1 from public.duels where attacker = new.attacker and created_at > now() - interval '3 seconds') then
    raise exception 'too fast' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists duel_guard on public.duels;
create trigger duel_guard before insert on public.duels for each row execute function public.duel_guard();

do $$ begin
  alter publication supabase_realtime add table public.duels;
exception when duplicate_object then null; when undefined_object then null; end $$;

insert into public.notices (kind, title, body, pinned) values
('patch', '11/25 패치: 친구 결투 ⚔️', '· 모험 탭 「결투」에서 친구와 2:2 · 3:3 · 4:4 결투를 할 수 있어요
· 내 단원은 직접 고르고, 상대는 친구의 출전 파티에서 전투력 높은 순으로 나와요 (펫·카드 효과 포함)
· 친구가 접속해 있지 않아도 돼요. 결투가 걸리면 친구에게 알림이 가요
· 결투에선 피해 60% · 회복 50%로 적용돼요. 60라운드가 지나면 남은 HP가 많은 쪽이 승리
· 보상은 없고 전적만 기록돼요 (자랑용)', false);
