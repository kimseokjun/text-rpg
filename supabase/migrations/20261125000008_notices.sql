-- 공지사항 (패치 노트 · 예정 · 공지). 누구나 읽고, 관리자만 쓴다
create table if not exists public.notices (
  id bigint generated always as identity primary key,
  kind text not null default 'patch' check (kind in ('patch', 'plan', 'notice')),
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 4000),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notices enable row level security;
create policy "notices readable" on public.notices for select using (true);
create policy "notices admin write" on public.notices for insert to authenticated with check (public.is_admin());
create policy "notices admin edit" on public.notices for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "notices admin delete" on public.notices for delete to authenticated using (public.is_admin());
grant select on public.notices to anon, authenticated;
grant insert, update, delete on public.notices to authenticated;

insert into public.notices (kind, title, body, pinned, created_at) values
('notice', '서버 버전 오픈!', '이제 아이디로 로그인해서 어느 기기에서든 이어할 수 있어요.
· 명예의 전당(랭킹) · 전체 채팅 · 친구 · 월드보스 · 멀티 던전이 열렸어요.
· 예전 아티팩트 버전 세이브는 저장 관리 → 세이브 코드로 옮길 수 있어요.', true, now() - interval '3 hours'),
('patch', '11/25 패치: 서버 기능 오픈', '· 로그인 · 클라우드 세이브
· 명예의 전당: 무한 탑 · 전투력 · 주간 레이드 순위
· 채팅(💬) · 친구 · 접속 중 목록
· 월드보스: 모두가 피통 하나를 함께 깎는 주간 보스 (서버가 딜 계산)
· 멀티 던전: 친구와 단원을 모아 4인 파티로 3층 진행', false, now() - interval '150 minutes'),
('patch', '11/25 패치: 방어력 개편 · 무한 탑 · 마을 정리', '· 방어·마저가 받는 피해를 비율로 줄이도록 바뀌었어요 (탱커·방어구가 쓸모 있어짐)
· 전투력 공식 재설계: 민첩·회복량·치명 상한 반영
· 마왕성 난이도 완화, 보스 대비 카드, 전투 리포트·패배 분석
· 무한 탑 오픈 (마왕숲 50층 클리어 후)
· 마을 건물 6개로 정리, 어둠의 파편 → 군단장의 핵 통합, 다음 목표 가이드', false, now() - interval '140 minutes'),
('patch', '11/25 패치: 펫 우리 · 용병 도감 · 편의', '· 펫 우리 개편: 동행 펫 크게, 펫 가방, 중복 자동 합성, 일괄 보내기
· 용병 도감: 모든 용병과 등급별 모집 확률
· 전직 가능 알림 (⚡ 전직!)
· 60라운드 시간 초과를 전멸과 구분 (손실 없이 후퇴)
· 새 버전이 나오면 화면 위에 새로고침 알림', false, now() - interval '5 minutes'),
('plan', '준비 중인 것', '· 멀티 던전 보상 조정 (자기 진행도 기준) — 검토 중
· 마왕방 (마왕성 다음 지역)
· 멀티 레이드: 친구와 함께 벨리알 공략', false, now() - interval '4 minutes');
