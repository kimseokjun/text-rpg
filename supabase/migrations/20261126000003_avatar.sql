-- 용병단장 아바타: 친구 프로필에 아바타 표시
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
    'title', d->'title', 'ach', d->'ach', 'avatar', d->'avatar');
end $$;
revoke all on function public.duel_target(uuid) from public;
grant execute on function public.duel_target(uuid) to authenticated;

insert into public.notices (kind, title, body, pinned) values
('patch', '패치: 용병단장 꾸미기 🎨', '· 마을에 「용병단장」이 생겼어요: 전투에는 나가지 않는 나만의 캐릭터. 체형·머리·머리색·피부·수염·모자·옷 색·무기·방패를 자유롭게, 망토·날개·오라·이름표·등장 효과는 상점·레이드·업적으로
· 4인 레이드 처치 보상: 노말 = 보스 망토·이름표, 하드 = 보스 오라, 헬 = 보스 날개 (보상 횟수와 상관없이 처음 잡을 때)
· 용병도 망토·오라·이름표·등장 효과를 달 수 있어요 (캐릭터 창 「꾸미기」 탭). 레이드 무대·결투에 보여요
· 친구 프로필에 용병단장 모습이 보여요', false);
