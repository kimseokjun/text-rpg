-- 친구 프로필: 결투용 조회에 진행도 정보 추가
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
    'maxFloor', d->'maxFloor', 'tower', d->'tower', 'guildLevel', d->'guildLevel', 'codex', jsonb_array_length(coalesce(d->'codex', '[]'::jsonb)));
end $$;
revoke all on function public.duel_target(uuid) from public;
grant execute on function public.duel_target(uuid) to authenticated;

insert into public.notices (kind, title, body, pinned) values
('patch', '11/25 패치: 친구 프로필 👤', '· 친구 목록·결투 화면에서 「프로필」을 누르면 친구의 파티를 구경할 수 있어요
· 단원별 장비(강화·잠재·에디셔널), 동행 펫, 카드 덱과 세트 효과, 진행도(최고 층·무한 탑·길드)를 보여줘요
· 프로필에서 바로 결투도 걸 수 있어요', false);
