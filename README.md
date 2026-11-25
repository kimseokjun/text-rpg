# 지하묘지의 용병단 (텍스트 RPG)

마을에서 용병 파티를 꾸리고 버프를 챙겨 던전에 보내면 전투는 자동으로 진행되는 중세 판타지 텍스트 RPG.

## 실행
```bash
npm install
npm run sim             # 시나리오별 100회 밸런스 통계
npm run sim:log -- 5    # 5번 시나리오 전투 로그 1회 (시드 지정: npm run sim:log -- 5 12)
npm run smoke           # 모집판·고용·각성·강화 테스트
npx tsx src/cli/floorsim.ts 40   # 50층 표준 파티 클리어율
npx tsx src/cli/tune.ts 11 50    # 층별 난이도 배율 자동 탐색
npx tsx src/cli/powersim.ts      # 층별 권장 전투력 산출
npm run typecheck
```

## 구조
```
src/
├─ data/          정적 정의 (수치 튜닝은 여기서)
│  ├─ jobs.ts         직업 4 + 전직 8, 스탯 성향, 스킬·패시브 해금
│  ├─ skills.ts       플레이어·몬스터 스킬
│  ├─ traits.ts       특성 (긍정·양날·영웅 고유·전설 고유)
│  ├─ mercenaries.ts  고정 용병 69명 ("텍스트 RPG 용병 목록" 시트 기준)
│  ├─ monsters.ts     몬스터, 구역, 층별 권장 레벨·난이도 배율
│  └─ items.ts        장비, 강화 확률, 버프 물약
├─ core/          게임 로직 (순수 TS, UI 의존 없음)
│  ├─ types.ts        공통 타입, 전투 로그 이벤트
│  ├─ rng.ts          시드 난수
│  ├─ stats.ts        최종 스탯 계산 (기본 + 장비 + 특성 + 각성 + 버프)
│  ├─ character.ts    주인공·용병 생성, 레벨업, 전직, 각성, 스킬 우선순위
│  ├─ combat.ts       자동 턴제 전투 엔진
│  ├─ dungeon.ts      탐험(층 진행, 웨이브, 자동 진행 조건, 보상, 드롭)
│  └─ town.ts         길드 모집판·고용·각성, 대장간 강화
└─ cli/           콘솔 시뮬레이터
```

## 핵심 설계
- 전투 로그는 문자열이 아니라 이벤트 배열(`BattleEvent`)로 남김 → 웹 UI에서 HP바·연출 자유롭게
- 모든 효과(특성, 장비 옵션, 물약, 패시브)는 `Modifier` 하나로 통일
- 같은 시드면 같은 결과 → 버그 재현·밸런스 비교 쉬움
- `Expedition.runFloor()`로 한 층씩(수동), `runAuto()`로 자동 진행

## 현재 콘텐츠
- 던전 50층 (5층마다 새 구역 + 보스, 10개 구역)
- 직업 1차 4 / 2차 8 (Lv.20) / 3차 8 (Lv.50), 레벨 상한 20·50·80
- 장비 T1~T6 36종, 강화 +15 (단계당 장비 스탯 +8% + 티어 비례 고정치)
- 골드 사용처: 훈련소, 잡화점 특가·강화석, 신전(특성 재설정), 재련(옵션 재설정), 탐험 보험

## 밸런스 튜닝 포인트
- `data/monsters.ts` → `floorLevel`(층별 권장 레벨), `DIFFICULTY`·`DIFF_TUNE`(층별 HP·공격 배율, tune.ts로 산출), 몬스터별 배율
- `core/power.ts` → `FLOOR_POWER`(층별 권장 전투력, powersim.ts로 산출)
- `core/stats.ts` → `expToNext`(레벨업 곡선), `GRADE_GROWTH`(등급 성장률)
- `data/items.ts` → 강화 확률·비용, 물약
