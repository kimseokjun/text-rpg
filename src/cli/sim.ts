/**
 * 밸런스 시뮬레이터
 *   npx tsx src/cli/sim.ts            → 시나리오별 100회 통계
 *   npx tsx src/cli/sim.ts log 3      → 3번 시나리오 1회 전투 로그 출력
 */
import { EQUIP_BASES } from '../data/items';
import { MERCENARIES } from '../data/mercenaries';
import { createHero, createMerc, syncSkillSlots } from '../core/character';
import { Expedition, type ExpeditionSettings, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import type { BaseJob, Character, Grade, JobId, Rarity } from '../core/types';
import { printLog } from './format';

interface Member { job: JobId; grade?: Grade; merc?: string }
interface Scenario {
  name: string;
  level: number;
  members: Member[];          // 첫 번째는 주인공(전사 계열)
  gear: { tier: number; rarity: Rarity; enhance: number } | null;
  settings: Partial<ExpeditionSettings>;
}

const baseOf = (j: JobId): BaseJob =>
  (({ knight: 'warrior', berserker: 'warrior', elementalist: 'mage', warlock: 'mage', ranger: 'archer', hunter: 'archer', paladin: 'priest', archpriest: 'priest' } as Record<string, BaseJob>)[j] ?? j) as BaseJob;

function build(s: Scenario): Character[] {
  return s.members.map((m, i) => {
    let c: Character;
    if (i === 0) c = createHero('킹');
    else {
      const def = m.merc
        ? MERCENARIES.find((x) => x.name === m.merc)!
        : MERCENARIES.find((x) => x.job === baseOf(m.job) && x.grade === (m.grade ?? 1) && x.traits.length === 0) ??
          MERCENARIES.find((x) => x.job === baseOf(m.job) && x.grade === (m.grade ?? 1))!;
      c = createMerc(def, s.level);
    }
    c.level = s.level;
    c.jobId = m.job;
    if (s.gear) {
      const g = s.gear;
      for (const slot of ['weapon', 'armor', 'accessory'] as const) {
        const b = EQUIP_BASES.find((x) => x.slot === slot && x.tier === g.tier && (!x.jobs || x.jobs.includes(baseOf(c.jobId))));
        if (b) c.equipment[slot] = { uid: `${c.uid}_${slot}`, baseId: b.id, rarity: g.rarity, enhance: g.enhance, failStack: 0, options: [] };
      }
    }
    c.skillSlots = [];
    syncSkillSlots(c);
    return c;
  });
}

const P4 = (w: JobId, m: JobId, a: JobId, p: JobId, grade: Grade = 1): Member[] =>
  [{ job: w }, { job: m, grade }, { job: a, grade }, { job: p, grade }];

const SCENARIOS: Scenario[] = [
  { name: 'Lv1 주인공 혼자, 장비 없음', level: 1, members: [{ job: 'warrior' }], gear: null, settings: { retreatHpPct: 0 } },
  { name: 'Lv3 전사+성직자(일반), T1 일반', level: 3, members: [{ job: 'warrior' }, { job: 'priest' }], gear: { tier: 1, rarity: 1, enhance: 0 }, settings: { retreatHpPct: 0 } },
  { name: 'Lv6 4인(일반), T1 일반 +2', level: 6, members: P4('warrior', 'mage', 'archer', 'priest'), gear: { tier: 1, rarity: 1, enhance: 2 }, settings: { retreatHpPct: 0 } },
  { name: 'Lv10 4인(숙련), T1 고급 +4 → 1구역 보스', level: 10, members: P4('warrior', 'mage', 'archer', 'priest', 2), gear: { tier: 1, rarity: 2, enhance: 4 }, settings: { retreatHpPct: 0 } },
  { name: 'Lv14 4인(숙련), T2 고급 +4 → 1구역 보스', level: 14, members: P4('warrior', 'mage', 'archer', 'priest', 2), gear: { tier: 2, rarity: 2, enhance: 4 }, settings: { retreatHpPct: 0 } },
  { name: 'Lv20 전직 4인(정예), T2 희귀 +6, 6층부터', level: 20, members: P4('knight', 'elementalist', 'ranger', 'archpriest', 3), gear: { tier: 2, rarity: 3, enhance: 6 }, settings: { startFloor: 6, retreatHpPct: 0 } },
  { name: 'Lv25 전직 4인(정예), T3 희귀 +8, 6층부터', level: 25, members: P4('knight', 'elementalist', 'ranger', 'archpriest', 3), gear: { tier: 3, rarity: 3, enhance: 8 }, settings: { startFloor: 6, retreatHpPct: 0 } },
  { name: 'Lv30 전직 4인(정예), T3 영웅 +10, 6층부터', level: 30, members: P4('knight', 'elementalist', 'ranger', 'archpriest', 3), gear: { tier: 3, rarity: 4, enhance: 10 }, settings: { startFloor: 6, retreatHpPct: 0 } },
  { name: 'Lv25 전설 파티(에드윈 대신 주인공+전설3), T3 희귀 +8', level: 25,
    members: [{ job: 'berserker' }, { job: 'elementalist', merc: '루미엘' }, { job: 'ranger', merc: '아르테온' }, { job: 'archpriest', merc: '세라피나' }],
    gear: { tier: 3, rarity: 3, enhance: 8 }, settings: { startFloor: 6, retreatHpPct: 0 } },
];

function runStats(s: Scenario, n = 100) {
  const reach: number[] = [];
  let bossKills = 0, gold = 0, exp = 0, rounds = 0, battles = 0;
  for (let i = 0; i < n; i++) {
    const exp1 = new Expedition(build(s), { ...DEFAULT_SETTINGS, ...s.settings }, new Rng(1000 + i));
    exp1.runAuto(() => true, (r) => {
      for (const e of r.log) if (e.t === 'result') { rounds += e.rounds; battles++; }
    });
    reach.push(exp1.stopReason === 'wipe' ? exp1.floor - 1 : exp1.floor);
    bossKills += exp1.bossesKilled.length ? 1 : 0;
    gold += exp1.loot.gold; exp += exp1.loot.exp;
  }
  const start = s.settings.startFloor ?? 1;
  const end = start === 1 ? 5 : 10;
  const dist: string[] = [];
  for (let f = start; f <= end; f++) dist.push(`${f}층 ${Math.round((reach.filter((r) => r >= f).length / n) * 100)}%`);
  console.log(`\n■ ${s.name}`);
  console.log(`  클리어율: ${dist.join(' | ')}`);
  console.log(`  보스 처치 ${Math.round((bossKills / n) * 100)}% · 평균 골드 ${Math.round(gold / n)} · 평균 경험치 ${Math.round(exp / n)} · 전투당 ${(rounds / battles).toFixed(1)}라운드`);
}

const [mode, idx] = process.argv.slice(2);
if (mode === 'log') {
  const s = SCENARIOS[Number(idx ?? 0)];
  console.log(`■ ${s.name}`);
  const ex = new Expedition(build(s), { ...DEFAULT_SETTINGS, ...s.settings }, new Rng(Number(process.argv[4] ?? 7)));
  ex.runAuto(() => true, (r) => { printLog(r.log); if (r.story) console.log(`\n📜 ${r.story}`); if (r.win) console.log(`\n✔ ${r.floor}층 클리어 (파티 평균 HP ${Math.round(ex.avgHpPct)}%)`); });
  console.log(`\n탐험 종료: ${ex.stopReason} · 골드 ${ex.loot.gold} · 경험치 ${ex.loot.exp} · 강화석 ${ex.loot.stones} · 장비 ${ex.loot.equips.length}개`);
} else {
  SCENARIOS.forEach((s) => runStats(s));
}
