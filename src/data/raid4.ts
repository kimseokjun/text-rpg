/** 4인 레이드: 주간 로테이션 보스. 인당 단원 1명, 차례마다 스킬을 직접 고름 (방장 화면이 전투 진행) */
import { DAY_SHIFT_MS, kstDate } from './daily';

/** 노말·하드·헬 + 헬 위의 「심연」 1~10단계 */
export const ABYSS_MAX = 10;
export type AbyssDiff = `abyss${number}`;
export type R4Diff = 'normal' | 'hard' | 'hell' | AbyssDiff;
export const R4_DIFFS: R4Diff[] = ['normal', 'hard', 'hell'];
export const ABYSS_DIFFS: AbyssDiff[] = Array.from({ length: ABYSS_MAX }, (_, i) => `abyss${i + 1}` as AbyssDiff);
export const abyssLevel = (d: string) => (/^abyss(\d+)$/.test(d) ? Number(d.slice(5)) : 0);
export const isAbyss = (d: string) => abyssLevel(d) > 0;
export interface R4Def { name: string; power: number; ess: number; mythChance: number }
/** power = 권장 1인 전투력 (난이도마다 2배, 심연은 1단계 80만에서 단계마다 +30%). 보스 능력치도 같은 배율로 커짐 */
export const R4: Record<string, R4Def> = {
  normal: { name: '노말', power: 125000, ess: 20, mythChance: 0 },
  hard: { name: '하드', power: 250000, ess: 45, mythChance: 6 },
  hell: { name: '헬', power: 500000, ess: 100, mythChance: 15 },
  ...Object.fromEntries(ABYSS_DIFFS.map((d, i) => [d, { name: `심연 ${i + 1}단계`, power: Math.round(800000 * Math.pow(1.3, i) / 10000) * 10000, ess: 130 + 20 * i, mythChance: Math.min(45, 18 + 3 * i) }])),
};
export const R4_ROUNDS = 20;
export const R4_TURN_SEC = 15;
export const R4_MAX = 4;
/** 보상은 난이도마다 하루 1번 (한국 시간 오전 4시 초기화) */
export const r4Today = () => kstDate();
/** 실패해도 준 피해 비율만큼 정수 일부 */
export const R4_BONUS: Record<string, { cores: number; runes: number; gold: number }> = {
  normal: { cores: 60, runes: 10, gold: 300000 }, hard: { cores: 120, runes: 20, gold: 600000 }, hell: { cores: 250, runes: 40, gold: 1200000 },
  ...Object.fromEntries(ABYSS_DIFFS.map((d, i) => [d, { cores: 300 + 60 * i, runes: 50 + 10 * i, gold: 1500000 + 300000 * i }])),
};
/** 하루 보상 칸: 심연은 단계와 상관없이 하루 1번 */
export const r4Slot = (d: string) => (isAbyss(d) ? 'abyss' : d);
export const r4Reward = (d: R4Diff, frac: number, win: boolean) => {
  const f = win ? 1 : 0.4 * Math.min(1, frac);
  return { ess: Math.floor(R4[d].ess * f), cores: Math.floor(R4_BONUS[d].cores * f), runes: Math.floor(R4_BONUS[d].runes * f), gold: Math.floor(R4_BONUS[d].gold * f) };
};

// ───────── 주간 로테이션 보스 ─────────
export type R4BossId = 'abaddon' | 'frost' | 'blood';
export interface R4BossDef {
  id: R4BossId; name: string; short: string; sprite: string; tags: string[]; attackScale: 'atk' | 'mag';
  /** 전멸기: 끊기(무력화 게이지) · 회피(실시간 미니게임) · 보호막(딜 체크) */
  wipe: { kind: 'interrupt' | 'dodge' | 'shield'; name: string };
  greet: string; enrage: string; tips: string[];
}
export const R4_BOSSES: Record<R4BossId, R4BossDef> = {
  abaddon: {
    id: 'abaddon', name: '심연의 왕 아바돈', short: '아바돈', sprite: 'abyssKing', tags: ['demon'], attackScale: 'mag',
    wipe: { kind: 'interrupt', name: '심연의 붕괴' },
    greet: '"심연의 문턱까지 온 걸 칭찬해주마."', enrage: '"버러지들이 감히…!"',
    tips: [
      '<b>심연의 붕괴 (전멸기)</b>: 2턴 시전. <b>기절·침묵 스킬</b>로 무력화 게이지를 0으로 만들면 끊기고 그로기(받는 피해 +50%). 못 끊으면 파티 전원 최대 HP 150% 피해',
      '<b>심연의 표식</b>: 한 명에게 표식 → 다음 보스 차례에 최대 HP 60% 폭발. 회복·보호막으로 대비',
      '<b>사도 소환</b>: 사도가 있는 동안 보스 피해 -70%, 단일 공격은 사도부터 노려요',
      '<b>부식의 저주</b>: 3라운드 지속 피해',
    ],
  },
  frost: {
    id: 'frost', name: '빙결 군주 니플헤임', short: '니플헤임', sprite: 'frostLord', tags: [], attackScale: 'atk',
    wipe: { kind: 'dodge', name: '절대영도' },
    greet: '"따뜻한 피가 얼어붙는 소리를 들려다오."', enrage: '"모든 것이 멈춰라…!"',
    tips: [
      '<b>절대영도 (전멸기)</b>: 2턴 예고 뒤 <b>8초 회피 타임</b>! 직접 캐릭터를 움직여 낮은 얼음은 <b>↑ 점프</b>, 높은 고드름은 <b>↓ 숙이기</b>, 떨어지는 얼음 기둥은 <b>←→</b>로 피해요. 한 번 맞을 때마다 최대 HP 30%',
      '<b>얼음 감옥</b>: 한 명이 얼어 행동 불가. 감옥을 부수거나(단일 공격은 감옥부터) 성직자 <b>정화</b>로 풀어요 · 2라운드 뒤엔 저절로 녹아요 · 같은 사람이 연달아 갇히진 않아요',
      '<b>눈보라</b>: 파티 전체 피해 + 낮은 확률로 기절',
      '<b>서리 강타</b>: 탱커에게 큰 한 방',
    ],
  },
  blood: {
    id: 'blood', name: '혈월의 여제 세레네', short: '세레네', sprite: 'bloodEmpress', tags: ['undead'], attackScale: 'atk',
    wipe: { kind: 'shield', name: '피의 계약' },
    greet: '"오늘 밤의 만찬은 너희로구나."', enrage: '"피가… 더 필요해!"',
    tips: [
      '<b>피의 계약 (전멸기)</b>: 2턴 동안 <b>피의 보호막</b>을 두르고 시전. 보호막을 다 깨면 끊기고 그로기, 못 깨면 파티 전원 최대 HP 150% 피해 — 딜을 몰아주세요',
      '<b>흡혈 일격</b>: 준 피해의 절반만큼 보스가 회복',
      '<b>박쥐 떼</b>: 박쥐가 있는 동안 보스 피해 -70%, 단일 공격은 박쥐부터 노려요',
      '<b>출혈</b>: 3라운드 지속 피해',
    ],
  },
};
export const R4_ROTATION: R4BossId[] = ['abaddon', 'frost', 'blood'];
/** 한국 시간 월요일 오전 4시 기준 주차 */
export const r4Week = (now = Date.now()) => Math.floor((now + DAY_SHIFT_MS - Date.UTC(1970, 0, 5)) / (7 * 86400 * 1000));
export const r4BossOfWeek = (now = Date.now()): R4BossId => R4_ROTATION[((r4Week(now) % 3) + 3) % 3];
export const r4NextBoss = (now = Date.now()): R4BossId => r4BossOfWeek(now + 7 * 86400 * 1000);
