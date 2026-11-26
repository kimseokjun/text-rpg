-- 월드보스 도전권: 오늘(오전 4시 기준) 도전 1회를 되돌림 (입힌 피해·순위는 그대로) · 하루 2번까지
create table if not exists public.wb_ticket_use (
  user_id uuid not null references auth.users(id) on delete cascade,
  kst_date date not null,
  n int not null default 0,
  primary key (user_id, kst_date)
);
alter table public.wb_ticket_use enable row level security;

create or replace function public.wb_use_ticket() returns boolean
language plpgsql security definer set search_path = public as $$
declare today date := ((now() at time zone 'Asia/Seoul') - interval '4 hours')::date; used int; hit bigint;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select n into used from wb_ticket_use where user_id = auth.uid() and kst_date = today;
  if coalesce(used, 0) >= 2 then raise exception 'limit'; end if;
  select id into hit from worldboss_hits where user_id = auth.uid() and kst_date = today order by id desc limit 1;
  if hit is null then raise exception 'no hit'; end if;
  update worldboss_hits set kst_date = kst_date - 1 where id = hit;
  insert into wb_ticket_use (user_id, kst_date, n) values (auth.uid(), today, 1)
    on conflict (user_id, kst_date) do update set n = wb_ticket_use.n + 1;
  return true;
end $$;
revoke all on function public.wb_use_ticket() from public;
grant execute on function public.wb_use_ticket() to authenticated;

insert into public.notices (kind, title, body, pinned) values
('patch', '패치: 이용권 🎫', '· 잡화점에 이용권이 생겼어요 (사두고 필요할 때 사용)
· 🔄 전직 초기화권 300만G: 단원을 1차 직업으로 되돌려 다른 갈래로 다시 전직 (레벨·장비·각성·초월 유지) — 캐릭터 창 「특성·전직」에서 사용
· 🗝️ 일일 던전 초기화권 50만G (하루 2장) · ⚔️ 레이드 도전권 +1 80만G (하루 3장) · 🛡️ 4인 레이드 도전권 +1 150만G (하루 1장) · 🐉 월드보스 도전권 +1 100만G (하루 2장)
· 각 화면(일일 던전·레이드·4인 레이드·월드보스)에 보유 중이면 「사용」 버튼이 떠요', false);
