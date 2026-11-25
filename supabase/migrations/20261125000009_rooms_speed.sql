-- 멀티: 방장이 정하는 전투 배속 (1·2배, 0 = 스킵)
alter table public.rooms add column if not exists speed int not null default 1 check (speed in (0, 1, 2));
