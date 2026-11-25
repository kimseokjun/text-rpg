-- 관리자 대시보드: 관리자 표시 · 접속 시각 · 활동 로그 · 관리자 전용 함수
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists muted boolean not null default false;
alter table public.profiles add column if not exists login_count int not null default 0;

-- 본인이 is_admin·muted를 바꾸지 못하게 (프로필 수정은 last_seen 정도만)
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and coalesce(current_setting('app.bypass', true), '') <> '1' and coalesce(current_setting('request.jwt.claims', true), '') <> '' then
    new.is_admin := old.is_admin; new.muted := old.muted; new.username := old.username; new.login_count := old.login_count;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- 접속 기록 (로그인 시 + 접속 중 몇 분마다)
create or replace function public.touch(p_login boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass', '1', true);
  update public.profiles set last_seen = now(), login_count = login_count + case when p_login then 1 else 0 end where id = auth.uid();
end $$;
grant execute on function public.touch(boolean) to authenticated;

-- 활동 로그
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  username text not null default '',
  kind text not null check (char_length(kind) between 1 and 32),
  detail text not null default '' check (char_length(detail) <= 300),
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "events insert own" on public.events for insert to authenticated with check (auth.uid() = user_id);
create policy "events admin read" on public.events for select to authenticated using (public.is_admin());
grant insert, select on public.events to authenticated;
create index if not exists events_time on public.events (created_at desc);
create index if not exists events_user on public.events (user_id, created_at desc);
create or replace function public.events_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid(); new.created_at := now();
  new.username := coalesce((select username from public.profiles where id = new.user_id), '');
  return new;
end $$;
drop trigger if exists events_guard on public.events;
create trigger events_guard before insert on public.events for each row execute function public.events_guard();

-- 채팅: 관리자 삭제, 채팅 금지된 유저는 못 보냄
create policy "chat admin delete" on public.chat_messages for delete to authenticated using (public.is_admin());
grant delete on public.chat_messages to authenticated;
create or replace function public.chat_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.username := (select username from public.profiles where id = new.user_id);
  new.created_at := now();
  if coalesce((select muted from public.profiles where id = new.user_id), false) then
    raise exception 'muted' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.chat_messages where user_id = new.user_id and created_at > now() - interval '1.5 seconds') then
    raise exception 'too fast' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- ───── 관리자 전용 함수 ─────
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  select jsonb_build_object(
    'users', (select count(*) from profiles),
    'active24', (select count(*) from profiles where last_seen > now() - interval '24 hours'),
    'active7', (select count(*) from profiles where last_seen > now() - interval '7 days'),
    'new24', (select count(*) from profiles where created_at > now() - interval '24 hours'),
    'events24', (select count(*) from events where created_at > now() - interval '24 hours'),
    'chats24', (select count(*) from chat_messages where created_at > now() - interval '24 hours'),
    'rooms24', (select count(*) from rooms where created_at > now() - interval '24 hours'),
    'wb', (select jsonb_build_object('season', season, 'hp', hp, 'max_hp', max_hp, 'killed_at', killed_at) from worldboss order by season desc limit 1),
    'signups', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]') from (
        select (created_at at time zone 'Asia/Seoul')::date as d, count(*) as n from profiles where created_at > now() - interval '14 days' group by 1) x),
    'dau', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]') from (
        select (created_at at time zone 'Asia/Seoul')::date as d, count(distinct user_id) as n from events where created_at > now() - interval '14 days' group by 1) x),
    'kinds', (select coalesce(jsonb_object_agg(kind, n), '{}') from (select kind, count(*) as n from events where created_at > now() - interval '24 hours' group by kind) x)
  ) into r;
  return r;
end $$;

create or replace function public.admin_users() returns table (
  id uuid, username text, created_at timestamptz, last_seen timestamptz, login_count int, is_admin boolean, muted boolean,
  day int, max_floor int, power int, gold bigint, tower_best int, saved_at timestamptz, events bigint, chats bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  return query
    select p.id, p.username, p.created_at, p.last_seen, p.login_count, p.is_admin, p.muted,
      s.day, (s.data->>'maxFloor')::int, s.power, (s.data->>'gold')::bigint, coalesce(r.tower_best, 0), s.updated_at,
      (select count(*) from events e where e.user_id = p.id), (select count(*) from chat_messages c where c.user_id = p.id)
    from profiles p left join saves s on s.user_id = p.id left join ranks r on r.user_id = p.id
    order by p.last_seen desc;
end $$;

create or replace function public.admin_user_save(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  return (select data from saves where user_id = p_user);
end $$;

-- 재료 지급 (세이브에 바로 더함, day +1 로 다른 기기 로컬보다 우선되게)
create or replace function public.admin_gift(p_user uuid, p_gold bigint, p_stones int, p_bless int, p_refine int, p_cores int, p_scales int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  update saves set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(data,
      '{gold}', to_jsonb(coalesce((data->>'gold')::bigint,0) + p_gold)),
      '{stones}', to_jsonb(coalesce((data->>'stones')::bigint,0) + p_stones)),
      '{blessings}', to_jsonb(coalesce((data->>'blessings')::bigint,0) + p_bless)),
      '{refineStones}', to_jsonb(coalesce((data->>'refineStones')::bigint,0) + p_refine)),
      '{cores}', to_jsonb(coalesce((data->>'cores')::bigint,0) + p_cores)),
      '{scales}', to_jsonb(coalesce((data->>'scales')::bigint,0) + p_scales)),
      '{day}', to_jsonb(coalesce((data->>'day')::int,0) + 1)),
    day = day + 1, updated_at = now()
  where user_id = p_user
  returning jsonb_build_object('gold', data->'gold', 'day', day) into r;
  if r is null then raise exception 'no save'; end if;
  insert into events (user_id, username, kind, detail) select p_user, username, 'admin_gift',
    format('골드 %s · 강화석 %s · 축복 %s · 제련석 %s · 핵 %s · 파편 %s', p_gold, p_stones, p_bless, p_refine, p_cores, p_scales) from profiles where id = p_user;
  return r;
end $$;

create or replace function public.admin_set(p_user uuid, p_muted boolean, p_admin boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  if p_user = auth.uid() and p_admin = false then raise exception 'cannot remove own admin'; end if;
  perform set_config('app.bypass', '1', true);
  update profiles set muted = p_muted, is_admin = p_admin where id = p_user;
end $$;

grant execute on function public.admin_stats(), public.admin_users(), public.admin_user_save(uuid), public.admin_gift(uuid, bigint, int, int, int, int, int), public.admin_set(uuid, boolean, boolean), public.is_admin() to authenticated;
