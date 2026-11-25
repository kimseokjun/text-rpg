-- 게임 하루가 한국 시간 오전 4시에 바뀌도록: 관리자 도전 횟수 초기화도 같은 기준
create or replace function public.admin_reset_tries(p_user uuid, p_daily boolean, p_raid boolean, p_r4 boolean, p_wb boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; d jsonb; n int := 0;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  select data into d from saves where user_id = p_user;
  if d is null then raise exception 'no save'; end if;
  if p_daily and d ? 'daily' then d := jsonb_set(d, '{daily,used}', '{}'::jsonb); end if;
  if p_raid and d ? 'raid' then d := jsonb_set(d, '{raid,used}', '0'::jsonb); end if;
  if p_r4 and d ? 'r4' then d := jsonb_set(d, '{r4,done}', '[]'::jsonb); end if;
  d := jsonb_set(d, '{day}', to_jsonb(coalesce((d->>'day')::int, 0) + 1));
  update saves set data = d, day = day + 1, updated_at = now() where user_id = p_user;
  if p_wb then
    update worldboss_hits set kst_date = kst_date - 1
      where user_id = p_user and kst_date = ((now() at time zone 'Asia/Seoul') - interval '4 hours')::date;
    get diagnostics n = row_count;
  end if;
  insert into events (user_id, username, kind, detail) select p_user, username, 'admin_reset',
    concat_ws(' · ', case when p_daily then '일일 던전' end, case when p_raid then '개인 레이드' end, case when p_r4 then '4인 레이드' end, case when p_wb then format('월드보스(%s회)', n) end) || ' 초기화'
    from profiles where id = p_user;
  return jsonb_build_object('wb', n);
end $$;
revoke all on function public.admin_reset_tries(uuid, boolean, boolean, boolean, boolean) from public;
grant execute on function public.admin_reset_tries(uuid, boolean, boolean, boolean, boolean) to authenticated;

insert into public.notices (kind, title, body, pinned) values
('patch', '패치: 하루 초기화 시간이 오전 4시로', '· 일일 던전·개인 레이드·4인 레이드 보상·월드보스 도전·오늘의 상점·카드 팩·일일 미션·친구 용병이 모두 한국 시간 오전 4시에 초기화돼요 (기존 자정)
· 주간 보스(개인 레이드·월드보스·4인 레이드 로테이션)도 월요일 오전 4시에 바뀌어요', false);
