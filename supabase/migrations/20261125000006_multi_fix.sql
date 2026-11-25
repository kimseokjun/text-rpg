-- 멀티 던전 보정: 참가자 검사 트리거가 항상 건너뛰던 문제 수정 (security definer 안에서는 current_user가 소유자라서)
create or replace function public.members_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.rooms; n int;
begin
  if coalesce(auth.role(), '') = 'service_role' then return new; end if;
  select * into r from public.rooms where id = new.room_id;
  if r is null or r.status <> 'open' then raise exception 'room closed' using errcode = 'P0001'; end if;
  if tg_op = 'INSERT' then
    select count(*) into n from public.room_members where room_id = new.room_id;
    if n >= r.max_players then raise exception 'room full' using errcode = 'P0001'; end if;
    -- 다른 열린 방에서는 나감
    delete from public.room_members m using public.rooms o where m.room_id = o.id and m.user_id = new.user_id and o.status = 'open' and o.id <> new.room_id;
  end if;
  new.username := (select username from public.profiles where id = new.user_id);
  new.claimed := coalesce(old.claimed, false);
  return new;
end $$;

-- 이미 들어간 참가자 이름 채우기
update public.room_members m set username = p.username from public.profiles p where p.id = m.user_id and (m.username is null or m.username = '');
-- 오래된 열린 방 정리
delete from public.rooms where status = 'open' and created_at < now() - interval '6 hours';
