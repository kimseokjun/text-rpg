# 개발 인수인계

작업 완료 시 최신 항목을 위에 추가한다. 날짜, 담당, 기준 커밋, 브랜치 또는 PR, 변경 사항, 검증 명령과 결과, 다음 작업을 남긴다. 실패하거나 실행하지 못한 검증에는 이유를 적는다.

## 2026-11-26 · 절대영도 대쉬와 직업 그림 비율 수정

- 담당은 Codex, 작업 브랜치는 `codex/dodge-dash`, 기준 커밋은 `eaa6240`이다.
- Shift와 모바일 대쉬 버튼으로 지상·공중에서 마지막 좌우 입력 방향으로 대쉬한다. 기본 방향은 오른쪽이고, 무적은 0.25초, 재사용 대기시간은 1.5초다. 대쉬 중 반투명 효과와 쿨타임 중 버튼 비활성화를 추가했다.
- 기존 `onPos` 위치 전송에 대쉬 상태와 방향을 추가해 유령 캐릭터에도 표시한다. 얼음 생성 간격 계산의 기본값을 0.95초에서 0.90초로 조정했다.
- 절대영도에 한해 스프라이트 원본 비율을 적용하고 공격 자세 그림을 숨겼다. 공지 migration은 `20261126000027_notice_dodge_dash.sql`이다.
- `npm run typecheck`, `npm run smoke`, `npm run build`, `git diff --check` 통과. 빌드에 Vite 청크 크기 경고가 표시됐다.
- 임시 절대영도 페이지에서 Chromium PC·모바일로 방향·지상 및 공중 입력·쿨타임·유령 표시·그림 비율·결과 표시를 확인했다. 같은 얼음 충돌에서 대쉬로 피격이 방지되는 것도 확인했다. 임시 페이지는 커밋에서 제외했다.
- 위치 수신은 임시 페이지에서 검증했다. Supabase 실시간 4인 레이드와 전체 난이도 변화는 확인하지 못했다.

## 2026-11-26 · AGENTS.md 배포 규칙 (Codex 인수인계)

- 담당 및 브랜치는 Claude Code, `claude/deploy-rules`
- 기준 커밋 `af010ac` (PR #18 병합 후 `origin/main`).
- `AGENTS.md`에 「배포 규칙」 절을 추가했다. 지금까지 대화로만 지켜온 규칙을 문서로 옮긴 것이다.
  - 병합이 곧 배포이고, 사용자가 요청할 때만 병합한다.
  - 공지 migration을 추가한다. 적용된 migration은 지우지 않는다.
  - Supabase CLI 다운로드 횟수 제한 실패는 재실행한다.
  - 그림 변환 스크립트를 쓴다. 시트 「패치 기록」은 Claude Code가 맡는다.
- 사용자가 주간 사용량 때문에 남은 개발을 Codex에 맡길 수 있다. Codex에 넘기기 좋은 다음 작업:
  1. 절대영도(`src/ui/dodge.ts`): 회피 수단 추가(대쉬 0.25초 무적·쿨 1.5초 또는 2단 점프 — 사용자 결정 대기). 미니게임에서 직업 그림이 세로로 늘어나는 버그도 고쳐야 한다. 원인은 `.dg-spr img{width:100%}`와 `spriteImg`의 고정 height다. 미니게임에서는 비율을 유지하고 `.s2atk`를 숨긴다.
  2. 전투 그림 4단계(`docs/ART_SPEC.md` 단계 4, 20항목): 레이드 보스 `abyssKing`·`frostLord`·`bloodEmpress`, 일일 던전·특수 몬스터.
- Claude Code가 다음에 할 일: Codex가 배포한 변경을 「패치 기록」 시트에 옮기기(98행까지 기록됨).
- 문서만 바꿨다. `git diff --check`를 확인했다.

## 2026-11-26 · 전투 그림 3단계 게임 적용 (몬스터 92종)

- 담당 및 브랜치는 Claude Code, `claude/art-apply-3`. Codex의 `codex/art-3a`(#13), `codex/art-3b`(#14), `codex/art-3c`(#17), `codex/art-3-tracking`(#15)을 병합해 포함했다.
- 기준 커밋 `379c0cd` (PR #16 병합 후 `origin/main`).
- 변경 사항
  - 3단계 92종(보스 15종은 공격 자세 포함) webp와 `src/data/spriteManifest.ts`를 생성했다. 이제 134종이고 webp 합계는 6.1MB다(전투에 나온 그림만 내려받는다).
  - `scripts/sprites.py`: 원본이 바뀌지 않은 그림은 기존 manifest 값을 쓰고 건너뛴다. 전체 변환은 약 7분, 건너뛰면 약 30초다.
  - `src/ui/stage2d.ts`의 `MON_SIZE`: 작은 짐승·벌레·정령(0.6~0.88)과 골렘·거인류(1.1~1.2) 크기를 정했다.
  - `docs/ART_SPEC.md`: 3단계 92항목을 `적용됨`으로 바꿨다. 남은 `요청`은 4단계 20항목이다.
- 검증
  - `npm run typecheck`, `npm run smoke`, `npm run build`, `git diff --check`가 통과했다.
  - Playwright로 7·15·20·25·30·35·40·45·50층을 확인했다. 지역 보스와 졸개가 모두 그림으로 나오고(도트 대체 없음), 크기가 자연스럽다.
  - 51층 이후(마왕성·마왕방)는 테스트 저장으로 입장 경로를 만들지 못해 화면 확인을 하지 못했다. 그림 파일과 manifest 항목은 확인했다.
- 다음: 4단계(레이드·일일 던전·특수 20항목).

## 2026-11-26 · 전투 중 MP 갱신 · 모바일 무대 겹침

- 담당 및 브랜치는 Claude Code, `claude/known-fixes`
- 기준 커밋 `d3a722f` (PR #12 병합 후 `origin/main`).
- 변경 사항
  - MP: `skill` 이벤트에 쓴 뒤 남은 `mp`·`maxMp`를 실었다(MP가 있는 유닛만, `src/core/types.ts`·`src/core/combat.ts`의 `useSkill`). `applyEvent`가 `statusMp()`로 상태창 MP 막대와 숫자를 바로 줄인다. 패시브 회복처럼 이벤트 없이 바뀌는 MP는 기존처럼 층이 끝날 때 맞춰진다.
  - 모바일(≤600px) 무대: `.s2`를 정사각형(`aspect-ratio: 1/1`)으로 바꿨다. 줄 배치는 `COL_Y_M`(세로 간격 넓힘)과 `COL_X_M`(앞줄끼리 더 떨어지게)을 쓰고, 엇갈림도 2배로 했다. PC 배치는 그대로다.
- 검증
  - `npm run typecheck`, `npm run smoke`, `npm run build`, `git diff --check`가 통과했다.
  - Playwright 모바일(390px)로 지하묘지 2층·5층 보스에서 이름표·그림이 겹치지 않는 것을 확인했다. 전투 도중 상태창 MP가 줄어드는 것도 확인했다(168→160 등).

## 2026-11-26 · 일반 전투 무대 스킬 이펙트

- 담당 및 브랜치는 Claude Code, `claude/stage-fx`
- 기준 커밋 `b257803`. 같은 시각에 열린 `claude/r4-art`(PR #11)와 `src/ui/r4stage.ts`·`src/ui/main.ts`를 함께 고친다. 병합 순서는 상관없지만 두 번째 병합 때 충돌을 확인한다.
- 변경 사항
  - `src/ui/r4stage.ts`: 이펙트 함수들(`center`·`fxEl`·`lunge`·`shake`·`areaFx`·`selfFx` 등)이 모듈의 `host` 대신 `fxH()`·`fxLayer()`·`SPR()`·`sideOf()`를 쓰게 바꿨다. 기본값은 레이드 무대 그대로다.
  - `stageSkillFx(stage, skill, actor, targets, opts)`를 추가했다. 그리는 동안만 무대를 바꾼다(`FX`). 레이드와 같은 `fxFor()` 표를 쓴다.
  - `src/ui/stage2d.ts`: `fxSkill(skill, actor, targets, opts)`를 추가했다. 이름으로 유닛을 찾고, 편은 `.s2u.p`/`.s2u.e`로 나눈다.
  - `src/ui/main.ts`의 `playFloor`: `skill` 이벤트에서 다음 공격 전까지의 피해(없으면 회복) 대상을 모아 이펙트를 재생하고 기다린다(최대 1.5초). 2배속은 짧게, 스킵은 재생하지 않는다. 기본 공격은 기존 돌진만 있다.
- 검증
  - `npm run typecheck`, `npm run smoke`, `npm run build`, `git diff --check`가 통과했다.
  - Playwright로 지하묘지 3층에서 메테오(낙하·폭발)와 늑대 소환 이펙트를 확인했다.
  - 레이드 무대는 가짜 상태 임시 페이지(커밋 안 함)에서 메테오 이펙트가 그대로 나오는 것을 확인했다.
## 2026-11-26 · 4인 레이드 무대 전투 그림 적용

- 담당 및 브랜치는 Claude Code, `claude/r4-art`
- 기준 커밋 `b257803` (PR #10 병합 후 `origin/main`). 시작 시 Codex의 새 그림·열린 PR이 없음을 확인했다.
- 변경 사항
  - `src/ui/main.ts`의 `unitIcon`: 파티는 직업 그림(없으면 같은 계열 1차 → 도트), 보스·졸개는 `mon/<mid>` 그림(없으면 도트)을 쓴다. 파티는 왼쪽에 서므로 `.r4face.flip`으로 좌우를 뒤집는다. 36px 이하(순서 막대)는 도트를 그대로 쓴다.
  - 크기는 예전 도트 크기 기준이다. 파티 ×1.7, 보스 ×1.45, 졸개 ×1.8. 모바일은 `.r4stage2 --k: .55`.
  - `src/ui/r4stage.ts`: 공격·스킬 순간 `.r4face`에 `atking`을 붙여 공격 자세를 보인다(보통 650ms, 빠르게 300ms).
  - `src/ui/stage2d.ts`의 `spriteImg`: `var(--k, 1)`로 무대 밖에서도 크기가 잡힌다. 공격 자세 CSS를 `.atking` 공용 규칙으로 바꿨다.
  - 전투 꾸미기(오라·이름표·등장 효과)는 기존 레이드 표시를 그대로 둔다. 망토는 그림에 표시하지 않는다(사용자 결정: 전투 꾸미기 작업 안 함).
- 검증
  - `npm run typecheck`, `npm run smoke`, `npm run build`, `git diff --check`가 통과했다.
  - 실시간 서버 없이 `mountStage`·`playEvents`를 가짜 상태로 띄우는 임시 페이지(커밋 안 함)를 만들었다. 거기서 파티 공격·보스 공격 자세와 PC·모바일 크기를 확인했다.
- 남은 점: 4인 레이드 보스 3종(`abyssKing`·`frostLord`·`bloodEmpress`)은 4단계 그림이 올 때까지 도트다.

## 2026-11-26 · 전투 그림 2단계 게임 적용

- 담당 및 브랜치는 Claude Code, `claude/art-apply-2`. Codex의 `codex/art-2`(#8, 그림 64장)와 `codex/art-2-tracking`(#9, TASKS 상태)을 병합해 포함했다.
- 기준 커밋 `db1c4e1` (PR #7 병합 후 `origin/main`).
- 변경 사항
  - `scripts/sprites.py`: 2단계부터 공격 자세 원본이 기본 자세와 같은 배율이다. 그래서 같은 비율로 줄이고, 원본에서 오른쪽·아래 끝 위치 차이를 `ar`·`ab`(webp 픽셀)로 기록한다. 1단계 5종(`LEGACY_FIT`)은 기존 보정(0.92배, 오른쪽 아래 정렬)을 그대로 쓴다.
  - `src/ui/stage2d.ts`: 공격 자세 `<img>`에 `right`·`bottom` 오프셋을 적용한다.
  - `docs/ART_SPEC.md`: 직업 32항목을 `적용됨`으로 표시하고, 같은 배율 규칙을 4절에 적었다.
  - webp는 42종 2.6MB다(전투에 나온 그림만 내려받는다).
- 검증
  - `npm run typecheck`, `npm run smoke`, `npm run build`, `git diff --check`가 통과했다.
  - Playwright로 파티 직업을 아이기스 군주·대마도사·성인·용기사로 바꿔 지하묘지 2층에서 기본 자세와 공격 자세를 확인했다. 두 자세의 크기와 위치가 맞는다.
- 남은 점: 4인 레이드 무대는 아직 도트다. 다음 그림 단계는 3단계(지역별 몬스터)다.

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
