-- 업적·칭호: 채팅에 칭호 표시, 프로필에 칭호·업적 점수
alter table public.chat_messages add column if not exists title text;

create or replace function public.chat_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.username := (select username from public.profiles where id = new.user_id);
  new.title := left((select data->>'title' from public.saves where user_id = new.user_id), 40);
  new.created_at := now();
  if coalesce((select muted from public.profiles where id = new.user_id), false) then
    raise exception 'muted' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.chat_messages where user_id = new.user_id and created_at > now() - interval '1.5 seconds') then
    raise exception 'too fast' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function public.duel_target(p_target uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d jsonb; u text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_target <> auth.uid() and not exists (
    select 1 from public.friendships f where f.status = 'accepted'
      and least(f.requester, f.addressee) = least(auth.uid(), p_target)
      and greatest(f.requester, f.addressee) = greatest(auth.uid(), p_target)
  ) then raise exception 'not friends'; end if;
  select s.data into d from public.saves s where s.user_id = p_target;
  if d is null then raise exception 'no save'; end if;
  select username into u from public.profiles where id = p_target;
  return jsonb_build_object('username', u, 'roster', d->'roster', 'party', d->'party', 'pets', d->'pets',
    'activePet', d->'activePet', 'cards', d->'cards', 'deck', d->'deck',
    'maxFloor', d->'maxFloor', 'tower', d->'tower', 'guildLevel', d->'guildLevel', 'codex', jsonb_array_length(coalesce(d->'codex', '[]'::jsonb)),
    'title', d->'title', 'ach', d->'ach');
end $$;
revoke all on function public.duel_target(uuid) from public;
grant execute on function public.duel_target(uuid) to authenticated;

insert into public.notices (kind, title, body, pinned) values
('patch', '11/25 패치: 업적 · 칭호 🏆', '· 🏆 업적 34종: 탐험·전투·성장·장비·수집·함께·일상. 단계마다 골드·강화석·룬석·카드 팩 보상 + 업적 점수
· 점수 마일스톤(100/250/450/700점) 보상: 골드·카드 팩·신화의 정수, 700점에 칭호 「업적의 달인」
· 🎖️ 칭호 17종: 업적 특정 단계를 달성하면 얻어요. 하나를 달면 출전 파티 전원에게 작은 효과(+2~5% 등)가 붙고, 채팅·프로필에 표시돼요
· 최고 층·전투력·보유 용병·장비 같은 업적은 지금 상태로 바로 달성! 처치 수·결투 승리·골드 벌이·빌려주기는 이번 업데이트부터 세요', false);
