import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
const N = 60;
for (const F of [10, 20, 32, 45, 55, 65]) {
  const p = standardParty(F);
  let full = 0, sum = 0; const stop: Record<string, number> = {};
  for (let r = 0; r < N; r++) {
    const ex = new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: 1, targetFloor: 10, rift: { level: F }, insured: true }, new Rng(r * 17 + F)).runAuto();
    sum += ex.floorsCleared; if (ex.floorsCleared === 10) full++;
    if (ex.floorsCleared < 10) { const k = `${ex.floor}${ex.stopReason === 'timeout' ? 't' : ''}`; stop[k] = (stop[k] ?? 0) + 1; }
  }
  console.log(F, 'full', Math.round(full / N * 100) + '%', 'avg', (sum / N).toFixed(1), JSON.stringify(stop));
}
