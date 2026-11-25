import type { BattleEvent } from '../core/types';

const bar = (cur: number, max: number, w = 10) => {
  const n = Math.max(0, Math.round((cur / max) * w));
  return '█'.repeat(n) + '░'.repeat(w - n);
};

export function formatEvent(e: BattleEvent): string | null {
  switch (e.t) {
    case 'wave':
      return `\n${e.boss ? '☠ 보스' : `[${e.floor}층 ${e.wave}웨이브]`}${e.elite ? ' ★엘리트' : ''} ${e.enemies.map((x) => x.name).join(', ')} 출현!`;
    case 'round': return null;
    case 'skill': return `▶ ${e.actor}의 [${e.skill}]!`;
    case 'attack': return null;
    case 'damage':
      return `   ${e.from} → ${e.to} ${e.amount}${e.crit ? ' (치명타!)' : ''}  ${bar(e.hpLeft, e.maxHp)} ${e.hpLeft}/${e.maxHp}`;
    case 'evade': return `   ${e.to}이(가) ${e.from}의 공격을 회피!`;
    case 'heal': return `   ✚ ${e.to} +${e.amount}  ${bar(e.hpLeft, e.maxHp)} ${e.hpLeft}/${e.maxHp}`;
    case 'status': return `   · ${e.to}: ${e.label}`;
    case 'dot': return `   · ${e.to} ${e.status === 'poison' ? '독' : '화상'} 피해 ${e.amount}`;
    case 'stunned': return `   · ${e.who}은(는) 기절해서 움직이지 못한다`;
    case 'death': return `   ✖ ${e.who} 쓰러짐`;
    case 'special': return `   ✦ ${e.who}: ${e.text}`;
    case 'summon': return `   ✦ ${e.who}이(가) ${e.summoned.map((x) => x.name).join(', ')}을(를) 불러낸다`;
    case 'result': return e.win ? `── 승리 (${e.rounds}라운드)` : `── 패배 (${e.rounds}라운드)`;
  }
}

export function printLog(log: BattleEvent[]) {
  for (const e of log) {
    const s = formatEvent(e);
    if (s) console.log(s);
  }
}
