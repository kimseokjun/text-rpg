# 공동 개발 작업 현황

작업 시작 시 담당, 브랜치, 수정 범위를 적고 `진행 중`으로 갱신한다. PR을 열면 `검토 대기`, 병합 후에는 `완료`로 표시한다. 진행할 수 없으면 `차단`으로 표시하고 이유와 다음 조치를 적는다. 아직 맡지 않은 작업은 `대기`로 등록한다.

| 작업 | 담당 | 범위 | 상태 | 브랜치 또는 PR |
| --- | --- | --- | --- | --- |
| 공동 개발 문서 설정 | Codex | `AGENTS.md`, `CLAUDE.md`, `docs/HANDOFF.md`, `docs/TASKS.md` | 완료 | `codex/ai-collaboration` (#1) |
| 대기 브랜치 일괄 배포 (2D 전투 무대, 4인 레이드 심연, 프리셋 장비, 스킬 이펙트) | Claude Code | `src/ui/stage2d.ts`, `src/ui/skillfx.ts`, `src/ui/r4stage.ts`, `src/ui/main.ts`, `src/state/game.ts`, `src/data/raid4.ts`, `src/data/cosmetics.ts`, `src/data/achievements.ts`, `src/ui/style.css`, 공지 migration | 완료 | `claude/deploy-pending` (#2) |
| Claude 작업 시작·재개 규칙 문서 (Codex 이미지 확인) | Claude Code | `docs/CLAUDE_RESUME.md`, `CLAUDE.md` | 완료 | `claude/resume-rules` (#3) |
| 2D 전투 무대 전열·후열 배치 (일반 전투·결투·4인 레이드) | Claude Code | `src/ui/stage2d.ts`, `src/ui/r4stage.ts`, `src/ui/main.ts`, `src/core/combat.ts`, `src/core/types.ts`, `src/core/raid4battle.ts` | 완료 | `claude/stage-rows` (#4) |
| 랜덤 디펜스 디자인 재작업 (11/26 배포 후 롤백) | Claude Code | `src/core/defense.ts`, `src/ui/defense.ts` | 대기 | `feat/defense` |
| 전투 캐릭터·몬스터 그림 교체 (GPT SD 도트, 공격 모션 방식 결정 필요) | Claude Code | `src/ui/stage2d.ts`, `public/` | 대기 | - |

Claude Code의 작업은 배정 시 행을 추가하고 `claude/<작업명>` 브랜치를 기록한다. 두 AI가 동시에 작업할 때는 각자의 행을 갱신한다.
