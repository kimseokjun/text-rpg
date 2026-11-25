-- 5단계: 실시간 멀티 던전 (방 · 참가자 · 보상)
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  host uuid not null references auth.users(id) on delete cascade default auth.uid(),
  host_name text not null default '',
  floor int not null check (floor between 1 and 70),
  max_players int not null default 2 check (max_players between 2 and 4),
  status text not null default 'open' check (status in ('open', 'running', 'done')),
  result jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz
);
alter table public.rooms enable row level security;
create policy "rooms readable" on public.rooms for select to authenticated using (true);
create policy "rooms create" on public.rooms for insert to authenticated with check (auth.uid() = host and status = 'open' and result is null);
create policy "rooms host edit" on public.rooms for update to authenticated using (auth.uid() = host and status = 'open') with check (auth.uid() = host and status = 'open' and result is null);
create policy "rooms host delete" on public.rooms for delete to authenticated using (auth.uid() = host);
grant select, insert, update, delete on public.rooms to authenticated;

create or replace function public.rooms_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.host_name := (select username from public.profiles where id = new.host);
    -- 이전에 열어둔 방은 정리
    delete from public.rooms where host = new.host and status = 'open';
  end if;
  return new;
end $$;
drop trigger if exists rooms_guard on public.rooms;
create trigger rooms_guard before insert on public.rooms for each row execute function public.rooms_guard();

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  username text not null default '',
  chars jsonb not null default '[]',
  ready boolean not null default false,
  claimed boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
alter table public.room_members enable row level security;
create policy "members readable" on public.room_members for select to authenticated using (true);
create policy "members join" on public.room_members for insert to authenticated with check (auth.uid() = user_id and claimed = false);
create policy "members edit own" on public.room_members for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and claimed = false);
create policy "members leave" on public.room_members for delete to authenticated using (auth.uid() = user_id or auth.uid() = (select host from public.rooms r where r.id = room_id));
grant select, insert, update, delete on public.room_members to authenticated;

create or replace function public.members_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.rooms; n int;
begin
  if coalesce(auth.role(), '') = 'service_role' or current_user in ('postgres', 'supabase_admin', 'service_role') then return new; end if;
  select * into r from public.rooms where id = new.room_id;
  if r is null or r.status <> 'open' then raise exception 'room closed' using errcode = 'P0001'; end if;
  if tg_op = 'INSERT' then
    select count(*) into n from public.room_members where room_id = new.room_id;
    if n >= r.max_players then raise exception 'room full' using errcode = 'P0001'; end if;
    new.username := (select username from public.profiles where id = new.user_id);
    -- 다른 열린 방에서는 나감
    delete from public.room_members m using public.rooms o where m.room_id = o.id and m.user_id = new.user_id and o.status = 'open' and o.id <> new.room_id;
  end if;
  new.claimed := coalesce(old.claimed, false);
  return new;
end $$;
drop trigger if exists members_guard on public.room_members;
create trigger members_guard before insert or update on public.room_members for each row execute function public.members_guard();

do $$ begin alter publication supabase_realtime add table public.rooms; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.room_members; exception when duplicate_object then null; when undefined_object then null; end $$;
