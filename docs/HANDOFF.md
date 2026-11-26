# 개발 인수인계

작업 완료 시 최신 항목을 위에 추가한다. 날짜, 담당, 기준 커밋, 브랜치 또는 PR, 변경 사항, 검증 명령과 결과, 다음 작업을 남긴다. 실패하거나 실행하지 못한 검증에는 이유를 적는다.

## 2026-11-26 · 전투 그림 1단계 게임 적용

- 담당 및 브랜치는 Claude Code, `claude/art-apply-1` (`codex/art-1` PR #6을 병합해 포함)
- 기준 커밋 `ad8eccc` (PR #5 병합 후 `origin/main`).
- 변경 사항
  - `scripts/sprites.py` 추가: `public/sprites/*/*.png` 원본(1024)을 그림 영역만 잘라 높이 256 webp로 만들고 `src/data/spriteManifest.ts`를 생성한다. 원본 PNG는 그대로 둔다.
  - 공격 자세 원본은 무기 때문에 작게 맞춰져 있다. 그래서 공격 자세 높이를 기본의 0.92배(`ATK_RATIO`)로 다시 맞춘다. 화면에서는 기본 그림 오른쪽 아래(뒤꿈치)에 맞춰 겹쳐 둔다.
  - `src/ui/stage2d.ts`: `spriteImg(key, h)`, `monSpriteH()`, `JOB_SPRITE_H`(116px)를 추가했다. 공격(`fxLunge`) 순간 `.atking` 클래스로 공격 자세를 보인다.
  - 적이 돌진·피격될 때 좌우 뒤집힘이 풀리던 기존 버그를 고쳤다(애니메이션 transform에 `scaleX(-1)` 포함).
  - `src/ui/main.ts`: 파티와 결투 상대는 직업 그림을 쓴다(없으면 같은 계열 1차 → 도트 아바타). 몬스터는 `mon/<id>` 그림이 있으면 쓰고, 없으면 도트를 쓴다.
  - 크기: 직업 116px, 몬스터 108px(정예 ×1.12, 보스 210px). `MON_SIZE`로 쥐 0.55, 박쥐 0.62, 해골 기사 1.08을 맞췄다. 모바일은 `.s2 --k: .5`로 줄인다.
  - `docs/ART_SPEC.md`: 1단계 10항목을 `적용됨`으로 표시하고, webp 변환 설명을 추가했다.
- 검증
  - `npm run typecheck`, `npm run smoke`, `npm run build`, `git diff --check`가 통과했다.
  - Playwright로 지하묘지 2층(일반)과 5층(묘지기 모르텐)을 PC·모바일에서 확인했다. 공격 순간 자세 전환과 모르텐 공격 자세도 확인했다.
  - 전사 공격 자세에 들어 있는 베기 효과는 게임 쪽에 따로 베기 효과가 없어 겹치지 않는다.
- 남은 점
  - 4인 레이드 무대(`src/ui/r4stage.ts`)는 아직 도트 그대로다(꾸미기 표시와 함께 다음에 적용).
  - 2~5차 직업은 그림이 올 때까지 같은 계열 1차 그림을 쓴다. 그래서 같은 직업 단원끼리 똑같이 보인다.
  - 전투 무대에서는 단원 꾸미기(망토·오라)가 보이지 않는다.

## 2026-11-26 · 전투 그림 스펙·요청 목록

- 담당 및 브랜치는 Claude Code, `claude/art-spec`
- 기준 커밋 `abe7e6f` (PR #4 병합 후 `origin/main`).
- `docs/ART_SPEC.md`를 추가했다. 스타일, 파일 규격(투명 PNG·왼쪽 보기·전신), 포즈(`idle`, 일부 `atk`), 파일 위치(`public/sprites/<job|mon>/<ID>.png`, `<ID>_atk.png`), 생성 프롬프트 예시, 4단계 계획, 요청 목록(직업 36 + 몬스터 118 = 154항목, atk 63장)이 들어 있다.
- 레퍼런스 그림 2장을 `docs/art/ref_job.png`, `docs/art/ref_monster.png`로 넣었다(투명 처리, 왼쪽 보기).
- `docs/CLAUDE_RESUME.md`에 이미지 요청 내역 위치 한 줄을 추가했다.
- 공격 모션: 모든 유닛에 코드 모션(돌진·흔들림·베기 궤적)을 붙이고, 직업과 보스만 `atk` 그림으로 바꾼다.
- Codex 참고: 그림 파일만 `codex/art-<단계>` 브랜치로 올리면 된다. 코드와 요청 목록 상태 칸은 Claude Code가 적용할 때 갱신한다.
- 문서만 바꿨다. 링크 경로와 `git diff --check`를 확인했다. 코드 변경이 없어 typecheck, smoke, build는 실행하지 않았다.

## 2026-11-26 · 2D 전투 무대 전열·후열 배치

- 담당 및 브랜치는 Claude Code, `claude/stage-rows`
- 기준 커밋 `f5468e4`. 시작 시 Codex의 새 커밋, 열린 PR, 새 이미지가 없음을 확인했다.
- 변경 사항
  - `src/ui/stage2d.ts`: 고정 자리표(`PARTY_POS`/`ENEMY_POS`/`BOSS_ADD_POS`)를 없애고 `formation()`·`enemyFormation()`으로 바꿨다. 전열은 가운데 쪽 줄(파티 x 60, 적 x 40), 후열은 그 뒤 20% 줄(파티 x 80, 적 x 20)에 세운다. 한 줄 인원에 따라 세로 간격을 나눈다. `unitBox`는 `slot` 대신 `pos`를 받는다.
  - 몬스터는 앞줄 최대 3, 나머지 뒷줄. 보스가 있으면 보스는 뒤 가운데(18, 88), 졸개는 앞줄. 싸움 중 소환은 `SUMMON_POS` 빈자리로 간다.
  - 결투 상대: `UnitSnap`에 `row`를 추가했다(`src/core/types.ts`, `src/core/combat.ts`의 `snap`). 상대도 전열·후열대로 선다.
  - 4인 레이드(`src/ui/r4stage.ts`): `R4Unit`에 `row`를 추가했다(`src/core/raid4battle.ts`). 파티는 왼쪽에서 전열 x 34, 후열 x 14로 선다. 예전 클라이언트가 보낸 상태에는 `row`가 없어 전열로 처리한다.
- 검증
  - `npm run typecheck`, `npm run smoke`, `npm run build`, `git diff --check`가 통과했다.
  - Playwright로 던전 3층(일반)과 10층(보스)을 PC·모바일에서 확인했다. 전열(전사 2)이 앞, 후열(성직자·궁수)이 뒤에 선다.
  - 결투와 4인 레이드는 실시간 서버가 필요해 화면 검증을 하지 못했다.
- 알려진 문제: 모바일에서 같은 줄 유닛의 이름표가 조금 겹친다(기존과 같음).

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
