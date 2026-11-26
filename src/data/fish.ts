/** 광장 낚시: 물고기 12종 (흔함~전설). spd = 게이지에서 물고기가 움직이는 빠르기 */
export interface FishDef { id: string; name: string; emoji: string; grade: 1 | 2 | 3 | 4 | 5; price: number; spd: number; desc: string }
export const FISH: FishDef[] = [
  { id: 'minnow', name: '은빛 피라미', emoji: '🐟', grade: 1, price: 300, spd: 0.6, desc: '분수 물에 사는 작은 물고기' },
  { id: 'carp', name: '광장 잉어', emoji: '🐟', grade: 1, price: 400, spd: 0.7, desc: '용병들이 던져준 빵을 먹고 자랐다' },
  { id: 'loach', name: '진흙 미꾸라지', emoji: '🐟', grade: 1, price: 450, spd: 0.9, desc: '미끌미끌해서 잘 빠져나간다' },
  { id: 'perch', name: '줄무늬 농어', emoji: '🐠', grade: 2, price: 900, spd: 0.9, desc: '등에 검은 줄무늬가 있다' },
  { id: 'eel', name: '번개 뱀장어', emoji: '🐍', grade: 2, price: 1100, spd: 1.2, desc: '잡으면 손이 찌릿하다' },
  { id: 'crab', name: '돌집게 게', emoji: '🦀', grade: 2, price: 1000, spd: 0.8, desc: '분수 돌 틈에 숨어 산다' },
  { id: 'goldfish', name: '황금 금붕어', emoji: '🐡', grade: 3, price: 3000, spd: 1.1, desc: '비늘이 진짜 금처럼 빛난다' },
  { id: 'moonsquid', name: '달빛 오징어', emoji: '🦑', grade: 3, price: 3500, spd: 1.3, desc: '밤에만 올라온다는 소문이 있다' },
  { id: 'knightfish', name: '갑옷 기사어', emoji: '🐟', grade: 4, price: 9000, spd: 1.5, desc: '은빛 비늘이 판금 갑옷 같다' },
  { id: 'abyssangler', name: '심연 아귀', emoji: '🐡', grade: 4, price: 11000, spd: 1.6, desc: '이마의 등불로 용병을 꾀어낸다' },
  { id: 'dragonkoi', name: '용왕 잉어', emoji: '🐉', grade: 5, price: 40000, spd: 1.9, desc: '폭포를 거슬러 오르면 용이 된다고 한다' },
  { id: 'kraken', name: '아기 크라켄', emoji: '🐙', grade: 5, price: 50000, spd: 2.1, desc: '광장 연못 깊은 곳의 주인' },
];
export const FISH_BY_ID: Record<string, FishDef> = Object.fromEntries(FISH.map((f) => [f.id, f]));
/** 등급 확률 % */
export const FISH_GRADE_W = [0, 60, 25, 10, 4, 1];
export const FISH_GRADE_NAME = ['', '흔함', '보통', '희귀', '영웅', '전설'];
/** 숙련도 Lv.20에서의 등급 확률 % (Lv.1 → 20 사이는 고르게 늘어남) */
export const FISH_GRADE_W20 = [0, 30, 30, 22, 13, 5];
export const fishWeights = (lv = 1) => { const t = Math.max(0, Math.min(1, (lv - 1) / 19)); return FISH_GRADE_W.map((w, i) => w + (FISH_GRADE_W20[i] - w) * t); };
export function rollFish(rand = Math.random, lv = 1): FishDef {
  const W = fishWeights(lv);
  let x = rand() * 100, g = 1;
  for (let i = 1; i <= 5; i++) { if (x < W[i]) { g = i; break; } x -= W[i]; }
  const pool = FISH.filter((f) => f.grade === g);
  return pool[Math.floor(rand() * pool.length)];
}

// ───────── 숙련도 (지금은 낚시만) ─────────
export const MASTERY_MAX = 20;
/** 다음 레벨까지 필요한 숙련 경험치 (점점 어려워짐) */
export const masteryNeed = (lv: number) => Math.round(20 * Math.pow(lv, 1.6));
/** 물고기 등급별 숙련 경험치, 놓치면 2 */
export const FISH_XP = [0, 10, 20, 40, 80, 160];
export const FISH_MISS_XP = 2;
/** 낚을 때 꾸미기가 나올 확률 % */
export const fishCosChance = (lv: number) => 0.5 + 0.1 * lv;
