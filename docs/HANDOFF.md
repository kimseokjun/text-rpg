# 개발 인수인계

작업 완료 시 최신 항목을 위에 추가한다. 날짜, 담당, 기준 커밋, 브랜치 또는 PR, 변경 사항, 검증 명령과 결과, 다음 작업을 남긴다. 실패하거나 실행하지 못한 검증에는 이유를 적는다.

## 2026-11-26 · Claude 작업 시작·재개 규칙

- 담당 및 브랜치는 Claude Code, `claude/resume-rules`
- 기준 커밋 `2d9f378` (PR #2 병합 후 `origin/main`).
- `docs/CLAUDE_RESUME.md`를 추가했다. 작업 시작·재개 때 최신 커밋과 열린 PR을 확인하고, Codex가 올린 이미지를 요청 내역과 대조해 적용한다. 이미 적용된 리소스는 다시 처리하지 않는다.
- `CLAUDE.md`가 `AGENTS.md`와 함께 이 문서를 불러오도록 한 줄 추가했다. `AGENTS.md`는 바꾸지 않았다.
- 문서만 바꿨다. 참조 경로와 `git diff --check`를 확인했다. 코드 변경이 없어 typecheck, smoke, build는 실행하지 않았다.
- Codex 참고: 이미지를 올릴 때 파일 이름에 요청 ID(예: 카드 `c03`)를 넣어주면 대조가 정확하다.

## 2026-11-26 · 대기 브랜치 일괄 배포

- 담당 및 브랜치는 Claude Code, `claude/deploy-pending`
- 기준 커밋 `ad075d2` (PR #1 병합 직후 `origin/main`).
- 합친 브랜치: `feat/stage2d`(모든 전투 2D 무대, `src/ui/stage2d.ts`), `feat/raid-abyss`(4인 레이드 심연 1~10단계), `feat/preset-gear`(편성 프리셋에 장비 포함), `feat/skill-fx`(4인 레이드 스킬 이펙트, `src/ui/skillfx.ts`).
- 충돌 해결
  - `src/state/game.ts`의 `claimR4`: main의 처치 꾸미기 지급(`boss` 인자)과 심연 첫 돌파 기록을 합쳤다. 반환은 `[...firstLine, ...lines, ...cosLine]`.
  - `src/data/cosmetics.ts`의 `raidCosmetics`: 심연 난이도(`abyssN`)는 헬과 같은 등급으로 취급한다.
  - `src/ui/main.ts`: 4인 레이드 방 화면에서 실패 보상 확인(`r4ask`)과 심연 선택 드롭다운을 함께 둔다. 도전권 표시는 `G.r4SlotOf(d)`로 심연을 하나의 칸으로 본다.
  - `src/ui/r4stage.ts`, `src/ui/style.css`, `src/data/achievements.ts`: 양쪽 내용을 모두 유지했다.
- 공지 migration: 브랜치에 있던 `000007_notice_abyss`, `000008_notice_preset_gear`와 새 `000019_notice_stage2d_fx`.
- 검증
  - `npm run typecheck`, `npm run smoke`, `npm run build`, `git diff --check origin/main...HEAD`가 모두 통과했다. 빌드에서 Vite 500 kB 청크 경고가 그대로 나온다.
  - Playwright(오프라인 저장)로 던전 10층 보스전 2D 무대를 PC와 모바일에서 확인했다.
  - 4인 레이드 심연과 스킬 이펙트는 Supabase 실시간 연결이 필요해 이 환경에서는 화면 검증을 하지 못했다.
- 알려진 문제
  - 모바일 2D 무대에서 유닛 이름표가 조금 겹친다.
  - 전투 중에는 MP 바가 갱신되지 않고 층이 끝날 때만 갱신된다.
- 다음 작업은 전투 그림 교체(공격 모션 방식 결정)와 랜덤 디펜스 디자인 재작업이다.

## 2026-11-26 · 공동 개발 문서 설정

- 담당 및 브랜치는 Codex, `codex/ai-collaboration`
- 기준 커밋 `ffd4b0a`. 로컬 `HEAD`와 GitHub의 `main`이 일치함을 확인했다.
- 변경 사항은 공통 개발 규칙, Claude Code의 규칙 참조, 작업 현황표와 인수인계 기록이다.
- `git diff --cached --check`와 문서 경로 및 변경 파일 목록을 확인했다. 별도 npm 캐시를 사용한 `npm ci`, `npm run typecheck`, `npm run smoke`, `npm run build`가 통과했다. 빌드에서 Vite의 500 kB 청크 크기 경고가 표시됐다.
- 다음 작업은 `docs/TASKS.md`에 담당과 범위를 기록한 뒤 각 AI의 작업 브랜치에서 시작한다.
