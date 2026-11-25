/** 전투력 공식 교체 시 권장 전투력 이전: FP_new = FP_old × 새공식(표준파티)/옛공식(표준파티) */
import { standardParty } from './floorsim';
import { FLOOR_POWER, partyPower } from '../core/power';
import { finalStats, partyMods } from '../core/stats';
import type { Character } from '../core/types';
const oldPower = (cs: Character[]) => { const sh = partyMods(cs); return cs.reduce((a, c) => { const { stats: s, extra: e } = finalStats(c, sh); const off = Math.max(s.atk, s.mag) * (1 + (s.crit / 100) * 0.5) * (1 + e.skillDmg / 100); const dur = s.hp * (1 + (s.def + s.res) / 120) * (1 - e.dmgTaken / 100); return a + Math.round(Math.sqrt(off * dur) * 3); }, 0); };
const out = FLOOR_POWER.map((fp, i) => { const p = standardParty(i + 1); const r = partyPower(p) / oldPower(p); const v = fp * r; const mag = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / mag) * mag; });
console.log(JSON.stringify(out));
console.error(FLOOR_POWER.map((fp, i) => (out[i] / fp).toFixed(2)).join(' '));
