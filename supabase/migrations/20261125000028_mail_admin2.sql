-- 관리자 지급: 고대 룬석 · 신화의 정수 · 카드 팩 추가
create or replace function public.admin_gift2(p_user uuid, p_gold bigint, p_stones int, p_bless int, p_refine int, p_cores int, p_scales int, p_runes int, p_myth int, p_packs int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  update saves set data = data || jsonb_build_object(
      'gold', coalesce((data->>'gold')::bigint,0) + p_gold,
      'stones', coalesce((data->>'stones')::bigint,0) + p_stones,
      'blessings', coalesce((data->>'blessings')::bigint,0) + p_bless,
      'refineStones', coalesce((data->>'refineStones')::bigint,0) + p_refine,
      'cores', coalesce((data->>'cores')::bigint,0) + p_cores,
      'scales', coalesce((data->>'scales')::bigint,0) + p_scales,
      'runes', coalesce((data->>'runes')::bigint,0) + p_runes,
      'mythEss', coalesce((data->>'mythEss')::bigint,0) + p_myth,
      'cardPacks', coalesce((data->>'cardPacks')::bigint,0) + p_packs,
      'day', coalesce((data->>'day')::int,0) + 1),
    day = day + 1, updated_at = now()
  where user_id = p_user
  returning jsonb_build_object('gold', data->'gold', 'day', day) into r;
  if r is null then raise exception 'no save'; end if;
  insert into events (user_id, username, kind, detail) select p_user, username, 'admin_gift',
    format('골드 %s · 강화석 %s · 축복 %s · 제련석 %s · 핵 %s · 파편 %s · 룬석 %s · 정수 %s · 카드팩 %s', p_gold, p_stones, p_bless, p_refine, p_cores, p_scales, p_runes, p_myth, p_packs) from profiles where id = p_user;
  return r;
end $$;
revoke all on function public.admin_gift2(uuid, bigint, int, int, int, int, int, int, int, int) from public;
grant execute on function public.admin_gift2(uuid, bigint, int, int, int, int, int, int, int, int) to authenticated;

-- 친구 우편 (장비 보내기): 보낸 쪽은 가방에서 빠지고, 받는 쪽이 받기를 누르면 들어감
create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships f where f.status = 'accepted'
    and least(f.requester, f.addressee) = least(a, b) and greatest(f.requester, f.addressee) = greatest(a, b));
$$;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

create table if not exists public.mail (
  id bigint generated always as identity primary key,
  sender uuid not null references auth.users(id) on delete cascade default auth.uid(),
  recipient uuid not null references auth.users(id) on delete cascade,
  sender_name text not null default '',
  item jsonb not null,
  note text not null default '' check (char_length(note) <= 60),
  created_at timestamptz not null default now()
);
alter table public.mail enable row level security;
create policy "mail visible to both" on public.mail for select to authenticated using (auth.uid() in (sender, recipient));
create policy "mail send to friends" on public.mail for insert to authenticated with check (auth.uid() = sender and sender <> recipient and public.are_friends(sender, recipient));
grant select, insert on public.mail to authenticated;
create index if not exists mail_recipient_idx on public.mail (recipient, id desc);

create or replace function public.mail_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.sender := auth.uid();
  new.sender_name := (select username from public.profiles where id = new.sender);
  new.created_at := now();
  if (select count(*) from public.mail where recipient = new.recipient) >= 50 then raise exception 'mailbox full' using errcode = 'P0001'; end if;
  if exists (select 1 from public.mail where sender = new.sender and created_at > now() - interval '1 second') then raise exception 'too fast' using errcode = 'P0001'; end if;
  return new;
end $$;
drop trigger if exists mail_guard on public.mail;
create trigger mail_guard before insert on public.mail for each row execute function public.mail_guard();

-- 받기: 지우면서 내용 반환 (한 번만 받을 수 있음)
create or replace function public.claim_mail(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare it jsonb;
begin
  delete from public.mail where id = p_id and recipient = auth.uid() returning item into it;
  if it is null then raise exception 'no mail'; end if;
  return it;
end $$;
revoke all on function public.claim_mail(bigint) from public;
grant execute on function public.claim_mail(bigint) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.mail;
exception when duplicate_object then null; when undefined_object then null; end $$;

insert into public.notices (kind, title, body, pinned) values
('patch', '11/25 패치: 친구에게 장비 보내기 📮', '· 창고에서 가방 장비를 펼치면 「친구에게 보내기」가 있어요 (친구끼리만, 장착 중인 장비는 해제 후)
· 받은 장비는 창고 맨 위 「우편함」에서 받기를 누르면 가방에 들어와요
· 우편함은 최대 50개까지 쌓여요', false);
