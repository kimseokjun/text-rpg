# text-rpg 공동 개발 규칙

이 규칙은 Codex와 Claude Code 모두에 적용한다. 작업 배정과 상태는 [docs/TASKS.md](docs/TASKS.md), 변경 내역과 검증 결과는 [docs/HANDOFF.md](docs/HANDOFF.md)에 기록한다.

## 작업 시작

1. `git status --short --branch`로 현재 브랜치와 로컬 변경을 확인한다. 다른 작업의 변경은 보존한다. 동시에 작업할 때는 AI별로 별도의 체크아웃 또는 Git worktree를 사용한다.
2. `git fetch origin`으로 갱신하고 `git log -1 origin/main`으로 기준 커밋을 확인한다. fetch가 실패하면 GitHub에서 `main`의 SHA를 확인하고 로컬 기준과 대조한다. 기준이 다르면 최신 코드를 확보한 후 작업한다.
3. 최신 `docs/TASKS.md`, `docs/HANDOFF.md`, 관련 이슈와 열린 PR을 읽는다. 작업, 담당, 브랜치, 수정 범위를 확인하고 상태를 `진행 중`으로 표시한다. 다른 작업과 파일 또는 기능 범위가 겹치면 변경 전에 담당과 순서를 조율한다.
4. 새 작업은 최신 `origin/main`에서 작업별 브랜치를 만든다. Codex는 `codex/<작업명>`, Claude Code는 `claude/<작업명>`을 사용한다. 이어받는 경우 해당 작업의 원격 브랜치와 최신 `main`을 모두 확인한다. 다른 AI의 브랜치에 커밋하거나 직접 `main`에 푸시하지 않는다.

## 작업 및 검증

- 요청과 배정 범위 안에서 변경하고 기존 게임 동작을 보존한다. 변경 범위에 맞게 `npm run typecheck`, `npm run smoke`, `npm run build`와 필요한 게임 시나리오를 검증한다. 의존성은 필요할 때 `npm ci`로 설치한다. 문서 작업은 링크, 참조 경로 및 diff를 확인한다.
- 완료 전에 `git diff --check`와 기준 브랜치 대비 변경을 검토한다. 실행한 명령과 결과, 실패하거나 미실행한 항목의 이유를 `docs/HANDOFF.md`에 기록한다. 변경 파일과 영향 범위, 인수인계할 사항도 함께 남긴다.
- `docs/TASKS.md`에 상태와 브랜치 또는 PR을 갱신한다. PR을 열면 `검토 대기`, 병합 후에는 `완료`로 표시한다. 막힌 작업에는 이유와 다음 조치를 적는다.
- 자기 작업 브랜치에서 `main`으로 PR을 열고 변경 요약과 검증 결과를 작성한다. 같은 문서의 다른 작업 항목을 편집하거나 충돌을 해결할 때 기존 기록을 보존한다.
