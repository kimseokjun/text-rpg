/**
 * 신비 카드: 균열(멀티)에서 나오는 카드 팩으로 모으는 수집 요소.
 * · 덱 6칸 장착 → 카드 능력치 + 세트 효과(2·4·5장) + 세트 각성 합계 효과
 * · 같은 카드 중복 → 각성(최대 5)
 * · 도감: 모은 카드 수만큼 영구 보너스 (장착 안 해도 적용)
 * 모든 효과는 출전 파티 전원에게 적용. 던전 난이도 대신 카드로 체감 성장.
 */
import type { Grade, Modifier, ModKey } from '../core/types';
import type { Rng } from '../core/rng';

const P = (key: ModKey, value: number, kind: 'pct' | 'flat' = 'pct'): Modifier => ({ key, kind, value, scope: 'party' });

export interface CardSet {
  id: string; name: string; desc: string; color: string;
  bonus: { n: number; text: string; mods: Modifier[] }[];
  awaken: { sum: number; text: string; mods: Modifier[] }[];
}
export const CARD_SETS: CardSet[] = [
  { id: 'dawn', name: '여명의 성녀단', desc: '빛과 회복', color: '#ffd970',
    bonus: [{ n: 2, text: '회복량 +25%', mods: [P('healPower', 25)] }, { n: 4, text: 'HP +15%', mods: [P('hp', 15)] }, { n: 5, text: '받는 피해 -15%', mods: [P('dmgTaken', -15, 'flat')] }],
    awaken: [{ sum: 10, text: 'HP·방어 +6%', mods: [P('hp', 6), P('def', 6)] }, { sum: 18, text: '받는 피해 -8%', mods: [P('dmgTaken', -8, 'flat')] }, { sum: 25, text: '회복량 +30% · 마저 +12%', mods: [P('healPower', 30), P('res', 12)] }] },
  { id: 'star', name: '별의 마도회', desc: '마법 화력', color: '#9ab8ff',
    bonus: [{ n: 2, text: '마력 +12%', mods: [P('mag', 12)] }, { n: 4, text: '스킬 피해 +18%', mods: [P('skillDmg', 18)] }, { n: 5, text: '마저 무시 +25%', mods: [P('resPierce', 25, 'flat')] }],
    awaken: [{ sum: 10, text: '마력 +6%', mods: [P('mag', 6)] }, { sum: 18, text: '스킬 피해 +10%', mods: [P('skillDmg', 10)] }, { sum: 25, text: '마력 +12% · MP +20%', mods: [P('mag', 12), P('mp', 20)] }] },
  { id: 'moon', name: '은월 사냥단', desc: '치명과 속도', color: '#8be0c0',
    bonus: [{ n: 2, text: '치명 +8%p', mods: [P('crit', 8, 'flat')] }, { n: 4, text: '민첩 +20%', mods: [P('agi', 20)] }, { n: 5, text: '치명타 피해 +40%p', mods: [P('critDmg', 0.4, 'flat')] }],
    awaken: [{ sum: 10, text: '공격 +6%', mods: [P('atk', 6)] }, { sum: 18, text: '치명 +6%p', mods: [P('crit', 6, 'flat')] }, { sum: 25, text: '공격 +10% · 치명타 피해 +20%p', mods: [P('atk', 10), P('critDmg', 0.2, 'flat')] }] },
  { id: 'steel', name: '강철 기사단', desc: '단단함', color: '#c9d1d9',
    bonus: [{ n: 2, text: '방어 +15%', mods: [P('def', 15)] }, { n: 4, text: 'HP +15%', mods: [P('hp', 15)] }, { n: 5, text: '공격 +18%', mods: [P('atk', 18)] }],
    awaken: [{ sum: 10, text: '방어·마저 +8%', mods: [P('def', 8), P('res', 8)] }, { sum: 18, text: 'HP +8%', mods: [P('hp', 8)] }, { sum: 25, text: '공격 +10% · 받는 피해 -6%', mods: [P('atk', 10), P('dmgTaken', -6, 'flat')] }] },
  { id: 'night', name: '마왕성의 귀부인', desc: '어둠과 관통', color: '#e0607a',
    bonus: [{ n: 2, text: '공격·마력 +8%', mods: [P('atk', 8), P('mag', 8)] }, { n: 4, text: '보스 피해 +18%', mods: [P('bossDmg', 18, 'flat')] }, { n: 5, text: '방어 무시 +25%', mods: [P('defPierce', 25, 'flat')] }],
    awaken: [{ sum: 10, text: '치명 +5%p', mods: [P('crit', 5, 'flat')] }, { sum: 18, text: '보스 피해 +10%', mods: [P('bossDmg', 10, 'flat')] }, { sum: 25, text: '공격·마력 +10%', mods: [P('atk', 10), P('mag', 10)] }] },
  { id: 'abyss', name: '심연의 여왕', desc: '보스·레이드', color: '#b48cff',
    bonus: [{ n: 2, text: '보스 피해 +12%', mods: [P('bossDmg', 12, 'flat')] }, { n: 4, text: '레이드 보스 피해 +25%', mods: [P('raidDmg', 25, 'flat')] }, { n: 5, text: '공격·마력 +15%', mods: [P('atk', 15), P('mag', 15)] }],
    awaken: [{ sum: 10, text: '받는 마법 피해 -8%', mods: [P('magTaken', -8, 'flat')] }, { sum: 18, text: '보스 피해 +10%', mods: [P('bossDmg', 10, 'flat')] }, { sum: 25, text: '공격·마력 +10% · HP +8%', mods: [P('atk', 10), P('mag', 10), P('hp', 8)] }] },
];
export const SET_BY_ID: Record<string, CardSet> = Object.fromEntries(CARD_SETS.map((x) => [x.id, x]));

/** 카드 1장 능력치: 등급별 기본 % × (1 + 각성×25%) */
export const CARD_BASE: Record<Grade, number> = { 1: 2, 2: 3, 3: 4.5, 4: 6.5, 5: 9 };
export const MAX_AWAKEN = 5;
/** 각성 1~5단계에 필요한 같은 카드 수 */
export const AWAKEN_COST = [1, 2, 3, 4, 5];

export interface CardDef { id: string; no: number; name: string; title: string; set: string; grade: Grade; stat: ModKey; look: { hair: string; outfit: string; eye: string; bg: string; acc: 'crown' | 'hat' | 'horns' | 'tiara' | 'helm' | 'none' } }
type Row = [string, string, Grade, ModKey, string, string, string, string, CardDef['look']['acc']];
const ROWS: [string, Row[]][] = [
  ['dawn', [
    ['세라피나', '여명의 대주교', 5, 'hp', '#f3e6b8', '#f4f1fb', '#6aa7e8', '#3b2f63', 'crown'],
    ['마리엔', '성녀의 가호', 4, 'res', '#8a5a3a', '#4e78c8', '#3d7a4f', '#203560', 'none'],
    ['아우렐리아', '태양의 성기사', 3, 'def', '#ffd970', '#e8c25a', '#3b8de0', '#5a3a20', 'tiara'],
    ['리디아', '들꽃 치유사', 2, 'hp', '#b0532c', '#5aa25a', '#5b8a2b', '#2f5a2f', 'none'],
    ['셀린', '신전 수련생', 1, 'res', '#1d1d24', '#f4f1fb', '#4a6ad0', '#3a3550', 'none'],
  ]],
  ['star', [
    ['루미엘', '별의 대마도사', 5, 'mag', '#d8dbe8', '#1f2a66', '#b48cff', '#120c30', 'tiara'],
    ['카스티아', '홍염의 마녀', 4, 'mag', '#d8402c', '#b0202c', '#ffb347', '#401010', 'none'],
    ['네리스', '빙결의 마녀', 3, 'mag', '#bfe6ff', '#eaf6ff', '#4fb3ff', '#10304a', 'tiara'],
    ['미라', '견습 마녀', 2, 'mp', '#5a2d82', '#6b3fa0', '#d07cff', '#1e1236', 'hat'],
    ['엘바', '연금술사', 1, 'mag', '#d8b46a', '#6b5a48', '#4f8a3a', '#3a2f24', 'none'],
  ]],
  ['moon', [
    ['아르테미아', '은월의 엘프 여왕', 5, 'crit', '#3fae7a', '#cfd8e0', '#58d68d', '#0c2a2a', 'tiara'],
    ['이졸데', '국경의 저격수', 4, 'atk', '#2a2230', '#5a4636', '#7a9ad0', '#2a3040', 'none'],
    ['실바', '숲의 순찰자', 3, 'agi', '#7acc5a', '#3f7a3a', '#c0ff70', '#163018', 'none'],
    ['핀', '보물 사냥꾼', 2, 'crit', '#e0702c', '#7a4a2a', '#5aa0e0', '#3a2a10', 'none'],
    ['노아', '마을 사냥꾼', 1, 'agi', '#6a4a2a', '#8a6a3a', '#6a8a3a', '#3a2a18', 'none'],
  ]],
  ['steel', [
    ['발키리아', '전장의 발키리', 5, 'atk', '#f4f4f8', '#9ab8e0', '#4a9ad8', '#1a2a40', 'helm'],
    ['브리짓', '붉은 도끼', 4, 'hp', '#c8302c', '#6a4a3a', '#5a8a3a', '#3a1f1a', 'none'],
    ['엘레노어', '왕실 근위 기사', 3, 'def', '#f0d070', '#2a2a2a', '#3a6ad0', '#3a2a10', 'none'],
    ['카이라', '사막의 검투사', 2, 'atk', '#141414', '#b07a3a', '#c08a2a', '#5a3a14', 'none'],
    ['테사', '신참 용병', 1, 'def', '#7a5a3a', '#6a6a7a', '#5a7a5a', '#2a2a30', 'none'],
  ]],
  ['night', [
    ['카르밀라', '피의 백작부인', 5, 'atk', '#141018', '#8a1020', '#ff3040', '#2a0610', 'tiara'],
    ['릴리스', '서큐버스 여왕', 4, 'mag', '#9a50d0', '#1a1020', '#ff70c0', '#1a0828', 'horns'],
    ['모르가나', '저주의 마녀', 3, 'mag', '#d8d8e0', '#20141e', '#a050ff', '#14081e', 'hat'],
    ['베일라', '그림자 암살자', 2, 'crit', '#141418', '#20202a', '#d04050', '#0c0c14', 'none'],
    ['노르마', '마왕성 메이드', 1, 'hp', '#3a2a24', '#1a1a1a', '#7a5a3a', '#241a20', 'none'],
  ]],
  ['abyss', [
    ['아자엘라', '심연의 여제', 5, 'atk', '#c8202c', '#1a1014', '#ffb020', '#300808', 'horns'],
    ['벨리안', '타락한 천사', 4, 'mag', '#f0f0f4', '#e8e0d0', '#c0a0ff', '#201830', 'none'],
    ['세이렌', '심해의 세이렌', 3, 'res', '#3ac0c0', '#2a70a0', '#70f0e0', '#062030', 'tiara'],
    ['그라니타', '바위의 공주', 2, 'def', '#8a8a90', '#6a6a70', '#70c0ff', '#2a2a30', 'crown'],
    ['에코', '혼돈의 메아리', 1, 'mag', '#a080e0', '#6a50a0', '#e0c0ff', '#140c24', 'none'],
  ]],
];
export const CARDS: CardDef[] = ROWS.flatMap(([set, rows], si) => rows.map(([name, title, grade, stat, hair, outfit, eye, bg, acc], i) => ({
  id: `c${String(si * 5 + i + 1).padStart(2, '0')}`, no: si * 5 + i + 1, name, title, set, grade, stat, look: { hair, outfit, eye, bg, acc },
})));
export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const STAT_KO: Record<string, string> = { hp: 'HP', mp: 'MP', atk: '공격', mag: '마력', def: '방어', res: '마저', agi: '민첩', crit: '치명' };

export interface OwnedCard { count: number; awaken: number }
export const cardValue = (c: CardDef, awaken: number) => Math.round(CARD_BASE[c.grade] * (1 + 0.25 * awaken) * 10) / 10;
export const cardMod = (c: CardDef, awaken: number): Modifier => c.stat === 'crit' ? P('crit', Math.round(cardValue(c, awaken) * 0.6 * 10) / 10, 'flat') : P(c.stat, cardValue(c, awaken));
export const cardEffectText = (c: CardDef, awaken: number) => { const m = cardMod(c, awaken); return `${STAT_KO[c.stat] ?? c.stat} +${m.value}${m.kind === 'flat' ? '%p' : '%'}`; };

/** 팩 등급 확률 */
export const PACK_ODDS: Record<Grade, number> = { 1: 38, 2: 30, 3: 19, 4: 9, 5: 4 };
export function openPack(rng: Rng): CardDef {
  const g = rng.weighted([1, 2, 3, 4, 5] as Grade[], (x) => PACK_ODDS[x]);
  return rng.pick(CARDS.filter((c) => c.grade === g));
}

/** 덱·도감 효과 전부 → 파티 효과 목록 */
export const DECK_SIZE = 6;
export function cardMods(owned: Record<string, OwnedCard>, deck: string[]) {
  const mods: Modifier[] = [];
  const lines: { text: string; on: boolean; kind: 'card' | 'set' | 'awaken' | 'codex' }[] = [];
  const equipped = deck.map((id) => CARD_BY_ID[id]).filter((c) => c && owned[c.id]);
  for (const c of equipped) mods.push(cardMod(c, owned[c.id].awaken));
  for (const set of CARD_SETS) {
    const inSet = equipped.filter((c) => c.set === set.id);
    if (!inSet.length) continue;
    const sum = inSet.reduce((a, c) => a + owned[c.id].awaken, 0);
    for (const b of set.bonus) { const on = inSet.length >= b.n; if (on) mods.push(...b.mods); lines.push({ text: `${set.name} ${b.n}세트: ${b.text}`, on, kind: 'set' }); }
    for (const a of set.awaken) { const on = sum >= a.sum; if (on) mods.push(...a.mods); lines.push({ text: `${set.name} 각성 합계 ${a.sum} (${sum}): ${a.text}`, on, kind: 'awaken' }); }
  }
  // 도감: 모은 카드 1장마다 HP·공격·마력 +0.4%, 전설 카드는 +1%
  const n = Object.keys(owned).filter((id) => CARD_BY_ID[id]).length;
  const legend = Object.keys(owned).filter((id) => CARD_BY_ID[id]?.grade === 5).length;
  const codex = Math.round((n * 0.4 + legend * 0.6) * 10) / 10;
  if (codex > 0) { mods.push(P('hp', codex), P('atk', codex), P('mag', codex)); lines.push({ text: `도감 ${n}/${CARDS.length}: HP·공격·마력 +${codex}%`, on: true, kind: 'codex' }); }
  return { mods, lines };
}
