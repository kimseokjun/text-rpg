# 전투 그림 스펙 · 요청 목록

2D 전투 무대에 들어갈 캐릭터(직업)와 몬스터 그림의 규격과 요청 목록이다. 그림을 만들어 올리는 쪽(Codex)은 이 문서대로 파일을 올리고, 게임에 적용하는 쪽(Claude Code)은 아래 요청 목록과 대조해 적용한다. 적용한 행은 상태를 `적용됨`으로 바꾼다.

## 1. 스타일

- 레퍼런스: [직업 예시 (성기사)](art/ref_job.png), [몬스터 예시 (해골 기사)](art/ref_monster.png). 두 장과 같은 화풍으로 맞춘다.
- 치비(SD) 픽셀 아트, 2.5~3등신. 굵은 검정 외곽선과 선명한 색을 쓴다. 판타지 RPG 느낌으로 그린다.
- 직업은 사람 캐릭터다. 같은 계열(전사·마법사·궁수·성직자)은 차수가 올라갈수록 장비가 화려해진다. 1차가 가장 수수하고, 5차가 금장식·빛 효과로 가장 화려하다.
- 몬스터는 등신을 자유롭게 정해도 된다(해골 예시처럼). 보스는 졸개보다 위압감 있게 그린다.
- 노출이 심한 의상이나 선정적인 포즈는 쓰지 않는다. 피·잔혹한 표현도 넣지 않는다.

## 2. 파일 규격

| 항목 | 규격 |
| --- | --- |
| 형식 | PNG, **투명 배경** (흰 배경·체크무늬 배경 안 됨) |
| 크기 | 정사각형 1024×1024 권장 (최소 512×512) |
| 구도 | 전신, 서 있는 자세, 무기 포함. 발끝이 그림 아래쪽 가장자리 가까이 오게 |
| 방향 | **모두 왼쪽을 본다** (적은 게임에서 좌우를 뒤집어 쓴다) |
| 여백 | 자유. 잘라내기와 크기 맞춤은 적용할 때 자동으로 한다 |
| 그림자·바닥 | 넣지 않는다 (게임에서 그린다) |

## 3. 포즈

- `idle`: 서 있는 기본 자세. 모든 항목에 필요하다.
- `atk`: 공격하는 순간의 자세. 무기를 휘두르거나, 활을 쏘거나, 마법을 내뻗는 동작이다. 같은 캐릭터를 같은 옷·색·크기로 그리고 자세만 바꾼다. 요청 목록에서 포즈가 `idle, atk`인 항목만 그린다.
- 공격할 때 `atk` 그림으로 잠깐 바뀐다. 돌진·흔들림·베기 궤적 같은 움직임은 게임 코드가 붙인다. 그 외 항목은 `idle` 한 장에 코드 모션만 쓴다.

## 4. 파일 이름과 위치

- 공격 자세는 기본 자세와 **같은 배율**로 그린다(2단계부터). 스크립트가 원본의 위치 차이를 그대로 옮겨 겹친다.
- 게임은 원본 PNG를 직접 쓰지 않는다. `python3 scripts/sprites.py`가 원본 옆에 `<ID>.webp`(높이 256px로 자름)와 `src/data/spriteManifest.ts`를 만들고, 게임은 이 둘을 쓴다. 원본 PNG는 그대로 둔다.

- 위치: `public/sprites/<종류>/<ID>.png`, 공격 자세는 `<ID>_atk.png`.
  - 예: `public/sprites/job/warrior.png`, `public/sprites/job/warrior_atk.png`, `public/sprites/mon/skeleton.png`
- `<종류>/<ID>`는 아래 요청 목록의 ID를 그대로 쓴다(영문, 대소문자 구분). 한글 파일 이름은 쓰지 않는다.
- 올릴 때: `codex/art-<단계>` 브랜치(예: `codex/art-1`)에서 그림 파일만 추가해 PR을 연다. 코드와 이 문서의 상태 칸은 고치지 않는다. 적용은 Claude Code가 한다.
- 한 단계를 한 번에 다 올리지 않아도 된다. 다 된 것부터 올린다.

## 5. 생성 프롬프트 예시

이미지 생성 도구에 쓸 영어 프롬프트 틀이다. `{...}`만 바꾼다.

```text
chibi pixel art sprite of {subject}, full body, standing, facing left, {pose},
2.5-head-tall SD proportions, bold black outline, vibrant colors, fantasy RPG game character,
transparent background, no shadow, no ground, centered, same style as the reference image
```

- `{subject}` 예: `a knight in silver plate armor with a blue cape and a longsword` (직업 `knight`), `a skeleton soldier with a rusty sword and a broken shield` (몬스터 `skeleton`)
- `{pose}`: `idle pose` 또는 `attack pose, swinging the weapon` (궁수: `drawing a bow`, 마법사: `casting a spell with an outstretched hand`, 성직자: `raising a staff with holy light`)
- 레퍼런스 이미지(`docs/art/ref_*.png`)를 같이 넣으면 화풍이 맞는다. `atk`는 같은 캐릭터의 `idle` 그림을 레퍼런스로 넣고 자세만 바꾸라고 하면 일관성이 좋다.

## 6. 단계

1. **1단계: 시험 적용.** 기본 직업 4종(idle+atk)과 첫 지역(버려진 지하묘지) 몬스터 6종이다. 이걸로 게임에 붙여보고 규격을 확정한다.
2. **2단계: 나머지 직업 32종** (idle+atk)
3. **3단계: 던전 지역별 몬스터** (보스는 idle+atk)
4. **4단계: 레이드·일일 던전·특수 몬스터**

## 7. 요청 목록

상태: `요청` → `업로드됨` (그림 PR 병합) → `적용됨` (게임 반영). 항목은 154개(`idle` 154장)이고, `atk` 63장을 더하면 모두 217장이다.

| ID | 이름 | 종류 | 단계 | 포즈 | 메모 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| `job/warrior` | 전사 | 직업 · 전사 1차 | 1 | idle, atk | 기본형 — 같은 계열 상위 직업의 바탕 | 적용됨 |
| `job/mage` | 마법사 | 직업 · 마법사 1차 | 1 | idle, atk | 기본형 — 같은 계열 상위 직업의 바탕 | 적용됨 |
| `job/archer` | 궁수 | 직업 · 궁수 1차 | 1 | idle, atk | 기본형 — 같은 계열 상위 직업의 바탕 | 적용됨 |
| `job/priest` | 성직자 | 직업 · 성직자 1차 | 1 | idle, atk | 기본형 — 같은 계열 상위 직업의 바탕 | 적용됨 |
| `job/knight` | 나이트 | 직업 · 전사 2차 | 2 | idle, atk | 전사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/berserker` | 버서커 | 직업 · 전사 2차 | 2 | idle, atk | 전사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/elementalist` | 원소술사 | 직업 · 마법사 2차 | 2 | idle, atk | 마법사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/warlock` | 흑마법사 | 직업 · 마법사 2차 | 2 | idle, atk | 마법사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/ranger` | 레인저 | 직업 · 궁수 2차 | 2 | idle, atk | 궁수 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/hunter` | 사냥꾼 | 직업 · 궁수 2차 | 2 | idle, atk | 궁수 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/paladin` | 팔라딘 | 직업 · 성직자 2차 | 2 | idle, atk | 성직자 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/archpriest` | 대사제 | 직업 · 성직자 2차 | 2 | idle, atk | 성직자 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/guardian` | 수호 기사단장 | 직업 · 전사 3차 | 2 | idle, atk | 전사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/slaughterer` | 학살자 | 직업 · 전사 3차 | 2 | idle, atk | 전사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/archmage` | 대마도사 | 직업 · 마법사 3차 | 2 | idle, atk | 마법사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/necromancer` | 네크로맨서 | 직업 · 마법사 3차 | 2 | idle, atk | 마법사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/sharpshooter` | 신궁 | 직업 · 궁수 3차 | 2 | idle, atk | 궁수 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/beastlord` | 야수왕 | 직업 · 궁수 3차 | 2 | idle, atk | 궁수 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/crusader` | 성전사 | 직업 · 성직자 3차 | 2 | idle, atk | 성직자 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/archbishop` | 대주교 | 직업 · 성직자 3차 | 2 | idle, atk | 성직자 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/aegisLord` | 아이기스 군주 | 직업 · 전사 4차 | 2 | idle, atk | 전사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/warlord` | 전쟁군주 | 직업 · 전사 4차 | 2 | idle, atk | 전사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/sage` | 현자 | 직업 · 마법사 4차 | 2 | idle, atk | 마법사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/lich` | 리치 | 직업 · 마법사 4차 | 2 | idle, atk | 마법사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/windArcher` | 바람의 사수 | 직업 · 궁수 4차 | 2 | idle, atk | 궁수 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/wildKing` | 대지의 군주 | 직업 · 궁수 4차 | 2 | idle, atk | 궁수 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/templar` | 템플러 | 직업 · 성직자 4차 | 2 | idle, atk | 성직자 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/saint` | 성인 | 직업 · 성직자 4차 | 2 | idle, atk | 성직자 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/titan` | 불멸의 수호신 | 직업 · 전사 5차 | 2 | idle, atk | 전사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/bloodGod` | 혈신 | 직업 · 전사 5차 | 2 | idle, atk | 전사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/starSage` | 성좌의 대현자 | 직업 · 마법사 5차 | 2 | idle, atk | 마법사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/deathLord` | 죽음의 군주 | 직업 · 마법사 5차 | 2 | idle, atk | 마법사 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/godslayer` | 신살자 | 직업 · 궁수 5차 | 2 | idle, atk | 궁수 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/dragonRider` | 용기사 | 직업 · 궁수 5차 | 2 | idle, atk | 궁수 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/avatar` | 신의 화신 | 직업 · 성직자 5차 | 2 | idle, atk | 성직자 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `job/seraph` | 대천사 | 직업 · 성직자 5차 | 2 | idle, atk | 성직자 계열, 차수가 높을수록 장비 화려하게 | 적용됨 |
| `mon/rat` | 굶주린 쥐 | 몬스터 · 버려진 지하묘지 | 1 | idle |  | 적용됨 |
| `mon/skeleton` | 해골 병사 | 몬스터 · 버려진 지하묘지 | 1 | idle |  | 적용됨 |
| `mon/bat` | 묘지 박쥐 | 몬스터 · 버려진 지하묘지 | 1 | idle |  | 적용됨 |
| `mon/ghoul` | 구울 | 몬스터 · 버려진 지하묘지 | 1 | idle |  | 적용됨 |
| `mon/skeletonKnight` | 해골 기사 | 정예 · 버려진 지하묘지 | 1 | idle |  | 적용됨 |
| `mon/morten` | 묘지기 모르텐 | 보스 · 버려진 지하묘지 | 1 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/monk` | 타락한 수도승 | 몬스터 · 봉인의 신전 | 3 | idle |  | 적용됨 |
| `mon/statue` | 석상 수호자 | 몬스터 · 봉인의 신전 | 3 | idle |  | 적용됨 |
| `mon/assassin` | 그림자 암살자 | 몬스터 · 봉인의 신전 | 3 | idle |  | 적용됨 |
| `mon/spirit` | 마력 정령 | 몬스터 · 봉인의 신전 | 3 | idle |  | 적용됨 |
| `mon/templeGuard` | 신전 수호병 | 정예 · 봉인의 신전 | 3 | idle |  | 적용됨 |
| `mon/velas` | 타락한 대신관 벨라스 | 보스 · 봉인의 신전 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/kobold` | 코볼트 광부 | 몬스터 · 잊힌 광산 | 3 | idle |  | 적용됨 |
| `mon/caveGolem` | 동굴 골렘 | 몬스터 · 잊힌 광산 | 3 | idle |  | 적용됨 |
| `mon/bomberKobold` | 폭약 코볼트 | 몬스터 · 잊힌 광산 | 3 | idle |  | 적용됨 |
| `mon/crystalBat` | 수정 박쥐 | 몬스터 · 잊힌 광산 | 3 | idle |  | 적용됨 |
| `mon/ironGolem` | 철갑 골렘 | 정예 · 잊힌 광산 | 3 | idle |  | 적용됨 |
| `mon/mineKing` | 광산왕의 망령 | 보스 · 잊힌 광산 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/swampToad` | 늪 두꺼비 | 몬스터 · 독안개 늪 | 3 | idle |  | 적용됨 |
| `mon/rotVine` | 썩은 덩굴 | 몬스터 · 독안개 늪 | 3 | idle |  | 적용됨 |
| `mon/mosquito` | 독침 모기떼 | 몬스터 · 독안개 늪 | 3 | idle |  | 적용됨 |
| `mon/lizardman` | 늪지 리자드맨 | 몬스터 · 독안개 늪 | 3 | idle |  | 적용됨 |
| `mon/lizardShaman` | 리자드맨 주술사 | 정예 · 독안개 늪 | 3 | idle |  | 적용됨 |
| `mon/swampWitch` | 늪의 마녀 | 보스 · 독안개 늪 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/frostWolf` | 서리 늑대 | 몬스터 · 얼음 심연 | 3 | idle |  | 적용됨 |
| `mon/iceSpirit` | 얼음 정령 | 몬스터 · 얼음 심연 | 3 | idle |  | 적용됨 |
| `mon/yeti` | 설인 | 몬스터 · 얼음 심연 | 3 | idle |  | 적용됨 |
| `mon/iceArcher` | 빙결 궁수 | 몬스터 · 얼음 심연 | 3 | idle |  | 적용됨 |
| `mon/frostKnight` | 서리 기사 | 정예 · 얼음 심연 | 3 | idle |  | 적용됨 |
| `mon/frostGiant` | 서리 거인 | 보스 · 얼음 심연 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/salamander` | 화염 도롱뇽 | 몬스터 · 용암 대공동 | 3 | idle |  | 적용됨 |
| `mon/lavaGolem` | 용암 골렘 | 몬스터 · 용암 대공동 | 3 | idle |  | 적용됨 |
| `mon/imp` | 불꽃 임프 | 몬스터 · 용암 대공동 | 3 | idle |  | 적용됨 |
| `mon/volcBat` | 화산 박쥐 | 몬스터 · 용암 대공동 | 3 | idle |  | 적용됨 |
| `mon/ifrit` | 이프리트 | 정예 · 용암 대공동 | 3 | idle |  | 적용됨 |
| `mon/flameLord` | 화염 군주 | 보스 · 용암 대공동 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/venomSpider` | 독거미 | 몬스터 · 거미 여왕의 둥지 | 3 | idle |  | 적용됨 |
| `mon/webSpider` | 그물 거미 | 몬스터 · 거미 여왕의 둥지 | 3 | idle |  | 적용됨 |
| `mon/eggCluster` | 거미 알 무리 | 몬스터 · 거미 여왕의 둥지 | 3 | idle |  | 적용됨 |
| `mon/spiderRider` | 암흑 거미 기수 | 몬스터 · 거미 여왕의 둥지 | 3 | idle |  | 적용됨 |
| `mon/spiderPriest` | 거미 사제 | 정예 · 거미 여왕의 둥지 | 3 | idle |  | 적용됨 |
| `mon/spiderQueen` | 거미 여왕 | 보스 · 거미 여왕의 둥지 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/drownedSoldier` | 익사한 병사 | 몬스터 · 수몰된 고대 도시 | 3 | idle |  | 적용됨 |
| `mon/abyssShaman` | 심해 주술사 | 몬스터 · 수몰된 고대 도시 | 3 | idle |  | 적용됨 |
| `mon/coralGolem` | 산호 골렘 | 몬스터 · 수몰된 고대 도시 | 3 | idle |  | 적용됨 |
| `mon/siren` | 세이렌 | 몬스터 · 수몰된 고대 도시 | 3 | idle |  | 적용됨 |
| `mon/seaKnight` | 해저 기사단장 | 정예 · 수몰된 고대 도시 | 3 | idle |  | 적용됨 |
| `mon/abyssWarden` | 심해의 수호자 | 보스 · 수몰된 고대 도시 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/lesserDemon` | 하급 악마 | 몬스터 · 혼돈의 균열 | 3 | idle |  | 적용됨 |
| `mon/hellhound` | 지옥견 | 몬스터 · 혼돈의 균열 | 3 | idle |  | 적용됨 |
| `mon/voidMage` | 공허 마법사 | 몬스터 · 혼돈의 균열 | 3 | idle |  | 적용됨 |
| `mon/fallenKnight` | 타락 기사 | 몬스터 · 혼돈의 균열 | 3 | idle |  | 적용됨 |
| `mon/demonOfficer` | 마족 장교 | 정예 · 혼돈의 균열 | 3 | idle |  | 적용됨 |
| `mon/demonGeneral` | 마장군 | 보스 · 혼돈의 균열 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/sealWarden` | 봉인 파수꾼 | 몬스터 · 봉인의 핵 | 3 | idle |  | 적용됨 |
| `mon/chaosEcho` | 혼돈의 메아리 | 몬스터 · 봉인의 핵 | 3 | idle |  | 적용됨 |
| `mon/coreSpirit` | 핵 정령 | 몬스터 · 봉인의 핵 | 3 | idle |  | 적용됨 |
| `mon/shadowClone` | 그림자 분신 | 몬스터 · 봉인의 핵 | 3 | idle |  | 적용됨 |
| `mon/sealProxy` | 봉인의 대리인 | 정예 · 봉인의 핵 | 3 | idle |  | 적용됨 |
| `mon/sealedOne` | 봉인된 자 | 보스 · 봉인의 핵 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/gargoyle` | 가고일 | 몬스터 · 마왕성 · 잿빛 성벽 | 3 | idle |  | 적용됨 |
| `mon/castleArcher` | 성벽 궁수 | 몬스터 · 마왕성 · 잿빛 성벽 | 3 | idle |  | 적용됨 |
| `mon/hellKnight` | 지옥 기사 | 몬스터 · 마왕성 · 잿빛 성벽 | 3 | idle |  | 적용됨 |
| `mon/castleWarlock` | 마성 술사 | 몬스터 · 마왕성 · 잿빛 성벽 | 3 | idle |  | 적용됨 |
| `mon/siegeGolem` | 공성 골렘 | 정예 · 마왕성 · 잿빛 성벽 | 3 | idle |  | 적용됨 |
| `mon/granit` | 성문지기 그라니트 | 보스 · 마왕성 · 잿빛 성벽 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/wardStone` | 결계석 | 몬스터 · 마왕성 · 잿빛 성벽 | 3 | idle |  | 적용됨 |
| `mon/vampireBat` | 흡혈 박쥐 | 몬스터 · 마왕성 · 피의 회랑 | 3 | idle |  | 적용됨 |
| `mon/bloodKnight` | 혈기사 | 몬스터 · 마왕성 · 피의 회랑 | 3 | idle |  | 적용됨 |
| `mon/thrallGhoul` | 노예 구울 | 몬스터 · 마왕성 · 피의 회랑 | 3 | idle |  | 적용됨 |
| `mon/bloodMage` | 혈마법사 | 몬스터 · 마왕성 · 피의 회랑 | 3 | idle |  | 적용됨 |
| `mon/crimsonGuard` | 진홍 근위대 | 정예 · 마왕성 · 피의 회랑 | 3 | idle |  | 적용됨 |
| `mon/carmilla` | 피의 백작 카르밀라 | 보스 · 마왕성 · 피의 회랑 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/grimoire` | 살아있는 마도서 | 몬스터 · 마왕성 · 금서의 서고 | 3 | idle |  | 적용됨 |
| `mon/inkGolem` | 잉크 골렘 | 몬스터 · 마왕성 · 금서의 서고 | 3 | idle |  | 적용됨 |
| `mon/librarianGhost` | 사서의 망령 | 몬스터 · 마왕성 · 금서의 서고 | 3 | idle |  | 적용됨 |
| `mon/runeSentinel` | 룬 파수병 | 몬스터 · 마왕성 · 금서의 서고 | 3 | idle |  | 적용됨 |
| `mon/archLibrarian` | 대사서 | 정예 · 마왕성 · 금서의 서고 | 3 | idle |  | 적용됨 |
| `mon/morgath` | 금서의 주인 모르가스 | 보스 · 마왕성 · 금서의 서고 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/cultist` | 광신도 | 몬스터 · 마왕성 · 금서의 서고 | 3 | idle |  | 적용됨 |
| `mon/archDemon` | 상급 악마 | 몬스터 · 마왕성 · 마왕의 옥좌 | 3 | idle |  | 적용됨 |
| `mon/nightmare` | 악몽 | 몬스터 · 마왕성 · 마왕의 옥좌 | 3 | idle |  | 적용됨 |
| `mon/doomGuard` | 파멸 근위병 | 몬스터 · 마왕성 · 마왕의 옥좌 | 3 | idle |  | 적용됨 |
| `mon/succubus` | 서큐버스 | 몬스터 · 마왕성 · 마왕의 옥좌 | 3 | idle |  | 적용됨 |
| `mon/demonDuke` | 마계 공작 | 정예 · 마왕성 · 마왕의 옥좌 | 3 | idle |  | 적용됨 |
| `mon/azazel` | 마왕 아자젤 | 보스 · 마왕성 · 마왕의 옥좌 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/voidWraith` | 공허의 망령 | 몬스터 · 마왕방 · 심연의 문 | 3 | idle |  | 적용됨 |
| `mon/abyssKnight` | 심연 기사 | 몬스터 · 마왕방 · 심연의 문 | 3 | idle |  | 적용됨 |
| `mon/soulReaper` | 영혼 수확자 | 몬스터 · 마왕방 · 심연의 문 | 3 | idle |  | 적용됨 |
| `mon/chaosHound` | 혼돈의 사냥개 | 몬스터 · 마왕방 · 심연의 문 | 3 | idle |  | 적용됨 |
| `mon/voidArchon` | 공허의 집정관 | 정예 · 마왕방 · 심연의 문 | 3 | idle |  | 적용됨 |
| `mon/shadowKing` | 그림자 군주 네르갈 | 보스 · 마왕방 · 심연의 문 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/fallenSeraph` | 타락 치천사 | 몬스터 · 마왕방 · 마왕의 심장 | 3 | idle |  | 적용됨 |
| `mon/hellTitan` | 지옥 거인 | 몬스터 · 마왕방 · 마왕의 심장 | 3 | idle |  | 적용됨 |
| `mon/mindFlayer` | 정신 포식자 | 몬스터 · 마왕방 · 마왕의 심장 | 3 | idle |  | 적용됨 |
| `mon/doomBringer` | 파멸의 전령 | 몬스터 · 마왕방 · 마왕의 심장 | 3 | idle |  | 적용됨 |
| `mon/kingGuard` | 마왕 친위대장 | 정예 · 마왕방 · 마왕의 심장 | 3 | idle |  | 적용됨 |
| `mon/lucifel` | 마왕 루시펠 | 보스 · 마왕방 · 마왕의 심장 | 3 | idle, atk | 크게 그림 (화면에 2배로 표시) | 적용됨 |
| `mon/treasureGoblin` | 보물 고블린 | 특수 (레이드·일일 던전·이벤트) | 4 | idle |  | 적용됨 |
| `mon/abyssKing` | 심연의 왕 아바돈 | 특수 (레이드·일일 던전·이벤트) | 4 | idle, atk | 4인 레이드 보스 | 적용됨 |
| `mon/belialFire` | 군단장 벨리알 · 화염 | 특수 (레이드·일일 던전·이벤트) | 4 | idle, atk | 보스급 | 적용됨 |
| `mon/belialAbyss` | 군단장 벨리알 · 심연 | 특수 (레이드·일일 던전·이벤트) | 4 | idle, atk | 보스급 | 적용됨 |
| `mon/belialFallen` | 군단장 벨리알 · 타락 | 특수 (레이드·일일 던전·이벤트) | 4 | idle, atk | 보스급 | 적용됨 |
| `mon/tentacle` | 심연의 촉수 | 특수 (레이드·일일 던전·이벤트) | 4 | idle |  | 적용됨 |
| `mon/goldGolem` | 황금 골렘 | 특수 (레이드·일일 던전·이벤트) | 4 | idle |  | 적용됨 |
| `mon/mimic` | 보물 미믹 | 특수 (레이드·일일 던전·이벤트) | 4 | idle |  | 적용됨 |
| `mon/vaultKeeper` | 금고지기 | 특수 (레이드·일일 던전·이벤트) | 4 | idle, atk | 보스급 | 적용됨 |
| `mon/crystalSpirit` | 수정 정령 | 특수 (레이드·일일 던전·이벤트) | 4 | idle |  | 적용됨 |
| `mon/shardGolem` | 광맥 골렘 | 특수 (레이드·일일 던전·이벤트) | 4 | idle |  | 적용됨 |
| `mon/crystalHeart` | 수정 심장 | 특수 (레이드·일일 던전·이벤트) | 4 | idle, atk | 보스급 | 적용됨 |
| `mon/rockGiant` | 바위 거인 | 특수 (레이드·일일 던전·이벤트) | 4 | idle, atk | 보스급 | 적용됨 |
| `mon/stoneBeetle` | 돌갑충 | 특수 (레이드·일일 던전·이벤트) | 4 | idle |  | 적용됨 |
| `mon/quarryLord` | 채석장 감독관 | 특수 (레이드·일일 던전·이벤트) | 4 | idle, atk | 보스급 | 적용됨 |
| `mon/trainingDummy` | 수련 허수아비 | 특수 (레이드·일일 던전·이벤트) | 4 | idle |  | 적용됨 |
| `mon/swordInstructor` | 검술 교관 | 특수 (레이드·일일 던전·이벤트) | 4 | idle |  | 적용됨 |
| `mon/grandMaster` | 무도 사범 | 특수 (레이드·일일 던전·이벤트) | 4 | idle, atk | 보스급 | 적용됨 |
| `mon/frostLord` | 빙결 군주 니플헤임 | 특수 (레이드·일일 던전·이벤트) | 4 | idle, atk | 4인 레이드 보스 | 적용됨 |
| `mon/bloodEmpress` | 혈월의 여제 세레네 | 특수 (레이드·일일 던전·이벤트) | 4 | idle, atk | 4인 레이드 보스 | 적용됨 |
