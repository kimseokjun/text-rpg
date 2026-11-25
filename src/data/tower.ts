/** 무한 탑: 끝없는 층, 층마다 고정 기믹, 10층마다 보스. 처음 깬 층만 보상 */
import type { Combatant } from '../core/combat';
import { ZONES } from './monsters';

export const TOWER_UNLOCK = 50;          // 마왕숲 50층 클리어 후
export const TOWER_LEVEL_FLOOR = 70;     // 몬스터 레벨 기준 층
/** 난이도: tune = T0 × G^(t−1) (HP ×tune, 공격 ×tune^0.45) — src/cli/towertune.ts */
export const TOWER_T0 = 5, TOWER_G = 1.065;
export const towerTune = (t: number) => TOWER_T0 * Math.pow(TOWER_G, t - 1);

export interface Gimmick { id: string; name: string; icon: string; desc: string; tip: string; apply: (e: Combatant[]) => void }
const lead = (e: Combatant[]) => { const l = e[0]; l.tags.add('boss'); return l; };
export const GIMMICKS: Gimmick[] = [
  { id: 'plain', name: '정면 승부', icon: '⚔', desc: '특별한 기믹 없음', tip: '스펙 그대로 밀어붙이세요.', apply: () => {} },
  { id: 'bulwark', name: '결계', icon: '🛡', desc: '우두머리가 수하가 살아있는 동안 피해 −70%', tip: '딜러 일부를 잡몹 우선으로.', apply: (e) => { if (e.length > 1) lead(e).passives.add('bulwark'); } },
  { id: 'mender', name: '치유사', icon: '✚', desc: '수하 하나가 매 라운드 우두머리 HP 9% 회복', tip: '치유 수하부터 잡으세요 (잡몹 우선).', apply: (e) => { if (e.length > 1) { lead(e); e[e.length - 1].passives.add('mender'); } } },
  { id: 'rampage', name: '광폭', icon: '🔥', desc: '모든 적이 라운드마다 공격 +12%', tip: '빨리 끝내야 해요. 화력 위주로.', apply: (e) => e.forEach((x) => x.passives.add('rampage')) },
  { id: 'storm', name: '마법 폭풍', icon: '🔮', desc: '모든 적이 마법으로 공격 (마력 +15%)', tip: '마법 저항·방패 거북 펫·받는 마법 피해 감소.', apply: (e) => e.forEach((x) => { x.attackScale = 'mag'; x.base.mag = Math.max(x.base.atk, x.base.mag) * 1.15; }) },
  { id: 'iron', name: '강철 피부', icon: '🪨', desc: '적 방어·마저 ×2.5', tip: '방어 무시·마저 무시 옵션, 강한 한 방.', apply: (e) => e.forEach((x) => { x.base.def *= 2.5; x.base.res *= 2.5; }) },
  { id: 'swift', name: '질풍', icon: '💨', desc: '적 민첩 ×1.6, 회피 +10%', tip: '민첩을 올리면 덜 빗나가요.', apply: (e) => e.forEach((x) => { x.base.agi *= 1.6; x.evadeBase += 10; }) },
  { id: 'crit', name: '살기', icon: '🗡', desc: '적 치명타 +25%p', tip: '방어·HP로 버티고 보호막을 앞당기세요.', apply: (e) => e.forEach((x) => { x.base.crit += 25; }) },
];
const G_BY = Object.fromEntries(GIMMICKS.map((g) => [g.id, g]));
/** 층 기믹 (고정: 같은 층은 언제나 같은 기믹) */
export function towerGimmick(t: number): Gimmick {
  if (t <= 2) return G_BY.plain;
  if (t % 10 === 0) return [G_BY.bulwark, G_BY.rampage, G_BY.mender, G_BY.storm][(t / 10 - 1) % 4];
  const h = ((t * 2654435761) >>> 0) % 997;
  return GIMMICKS[1 + (h % (GIMMICKS.length - 1))];
}
const castle = ZONES.filter((z) => z.floors[0] > 50);
export const TOWER_POOL = castle.flatMap((z) => z.pool.map((p) => p.id));
export const TOWER_ELITES = castle.map((z) => z.elite);
export const towerBoss = (t: number) => castle[(t / 10 - 1) % castle.length].boss;
export const isTowerBoss = (t: number) => t % 10 === 0;
/** 보스 배율 (잿빛 수문장·카르밀라·모르가스·아자젤 순) — 주변 일반층보다 전투력 약 25% 더 필요하도록 맞춤 (src/cli/towerneed.ts) */
export const TOWER_BOSS_MULT = [1.2, 0.215, 0.145, 0.19];
export const TOWER_BOSS_DECAY = [0.3, 1, 0.6, 0.6];
export const towerBossMult = (t: number) => TOWER_BOSS_MULT[(t / 10 - 1) % castle.length] * Math.pow(TOWER_BOSS_DECAY[(t / 10 - 1) % castle.length], Math.floor((t / 10 - 1) / castle.length));

export interface TowerReward { gold: number; cores: number; refineStones: number; egg?: 4 | 5 }
export function towerReward(t: number): TowerReward {
  const boss = isTowerBoss(t);
  return {
    gold: Math.round(1500 * Math.pow(t, 1.1)) * (boss ? 3 : 1),
    cores: boss ? 10 + t : 2 + Math.floor(t / 5),
    refineStones: boss ? 3 + Math.floor(t / 10) * 2 : t % 5 === 0 ? 1 : 0,
    egg: t % 25 === 0 ? (t >= 50 ? 5 : 4) : undefined,
  };
}
