-- 관리: '12' 계정 오늘(KST) 월드보스 도전 횟수 초기화 (입힌 피해·순위는 그대로, 날짜만 하루 전으로)
update public.worldboss_hits h set kst_date = kst_date - 1
where h.kst_date = (now() at time zone 'Asia/Seoul')::date
  and h.user_id = (select id from public.profiles where username = '12');
