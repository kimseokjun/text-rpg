/** 전투 리포트: 탐험 동안 단원별 피해·회복·사망 집계 + 패배 원인 진단 */
export interface MemberRep { id: string; name: string; dealt: number; taken: number; takenMag: number; healed: number; shielded: number; deaths: number }
export interface FightInfo { floor: number; boss: boolean; win: boolean; rounds: number; limit: number; bulwark: boolean; rampage: boolean; mender: boolean; dealt: number; bulwarkDmg: number; enemyHealed: number; bossName?: string }
export interface Report {
  members: MemberRep[];
  hitters: Record<string, number>;   // "몬스터 · 기술" → 파티에 준 피해
  killers: Record<string, number>;   // "몬스터 · 기술" → 쓰러뜨린 횟수
  firstDeath?: { name: string; by: string; round: number; floor: number };
  fights: FightInfo[];
  cur?: FightInfo;
}
export const newReport = (party: { id: string; name: string }[]): Report => ({
  members: party.map((p) => ({ id: p.id, name: p.name, dealt: 0, taken: 0, takenMag: 0, healed: 0, shielded: 0, deaths: 0 })),
  hitters: {}, killers: {}, fights: [],
});
const esc = (x: string) => x.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
export const memberOf = (r: Report, id: string) => r.members.find((m) => m.id === id);

export interface DiagCtx { hasHealer: boolean; healerName?: string; rows: Record<string, 'front' | 'back'>; prefs: Record<string, string>; tankIds: string[] }

/** 진단: 진 경우 원인 위주, 이긴 경우 눈에 띄는 개선점만 */
export function diagnose(r: Report, won: boolean, d: DiagCtx): string[] {
  const out: string[] = [];
  const taken = r.members.reduce((a, m) => a + m.taken, 0);
  const mag = r.members.reduce((a, m) => a + m.takenMag, 0);
  const healed = r.members.reduce((a, m) => a + m.healed + m.shielded, 0);
  const deaths = r.members.reduce((a, m) => a + m.deaths, 0);
  const last = r.fights[r.fights.length - 1];
  const pct = (x: number) => Math.round(x * 100);
  if (!taken) return out;
  const magShare = mag / taken;
  // 1) 기믹
  if (last) {
    if (last.bulwark && last.dealt > 0 && last.bulwarkDmg / last.dealt >= 0.25)
      out.push(`🛡 결계: 수하가 살아있을 때 보스에게 넣은 피해가 ${pct(last.bulwarkDmg / last.dealt)}%예요 (70% 깎임). 딜러 공격 대상을 <b>잡몹 우선</b>으로 바꿔 수하부터 정리하세요.`);
    if (last.mender && last.enemyHealed > 0 && (!won || last.enemyHealed > last.dealt * 0.15))
      out.push(`✚ 치유 수하가 보스를 ${last.enemyHealed.toLocaleString('ko-KR')} 회복시켰어요. 딜러 한두 명을 <b>잡몹 우선</b>으로 둬서 치유 수하를 먼저 잡으세요.`);
    if (last.rampage && !last.win && last.rounds >= 8)
      out.push(`🔥 광폭화: ${last.rounds}라운드까지 끌려서 보스가 공격 +${12 * last.rounds}%까지 강해졌어요. 딜러를 <b>보스 우선</b>으로, 공격·스킬 피해를 올려 빨리 끝내세요.`);
    if (!last.win && last.limit > 10 && last.rounds >= last.limit) out.push(`⏱ 시간 초과: ${last.limit}라운드 안에 못 끝냈어요. 화력이 부족해요 — 딜러 장비 강화나 보스 피해 옵션을 챙기세요.`);
  }
  // 2) 피해 성격
  if (!won || deaths) {
    if (magShare >= 0.55) out.push(`🔮 받은 피해의 ${pct(magShare)}%가 <b>마법</b>이에요. 마법 저항 장비·옵션, 방패 거북 펫, '받는 마법 피해 감소' 옵션이 효과적이에요.`);
    else if (magShare <= 0.3) out.push(`⚔ 받은 피해의 ${pct(1 - magShare)}%가 <b>물리</b>예요. 방어력 장비·옵션을 올리고 탱커를 전열에 두세요.`);
  }
  // 3) 회복
  if (!won || deaths) {
    if (!d.hasHealer) out.push('✚ 파티에 <b>힐러가 없어요</b>. 성직자 한 명이 있으면 버티는 힘이 크게 달라져요.');
    else if (healed / taken < 0.2) out.push(`✚ 회복·보호막이 받은 피해의 ${pct(healed / taken)}%밖에 안 돼요. ${esc(d.healerName ?? '힐러')}의 레벨·마력, 회복량 옵션, 빛 요정 펫을 챙기거나 실드 스킬 우선순위를 올려보세요.`);
  }
  // 4) 누가 먼저 쓰러졌나
  if (r.firstDeath) {
    const fd = r.firstDeath, m = r.members.find((x) => x.name === fd.name);
    const row = m ? d.rows[m.id] : undefined;
    const isTank = m ? d.tankIds.includes(m.id) : false;
    let s = `💀 처음 쓰러진 단원: <b>${esc(fd.name)}</b> (${fd.round}라운드, ${esc(fd.by)})`;
    if (row === 'front' && !isTank) s += ' — 전열에 있어서 공격을 많이 받았어요. 후열로 옮기는 걸 고려해보세요.';
    else if (row === 'back' && !isTank) s += ' — 후열인데도 쓰러졌어요. 광역 공격에 약하니 HP·저항을 올려주세요.';
    else if (isTank) s += ' — 탱커가 먼저 무너졌어요. 탱커 방어구·HP를 우선 강화하세요.';
    out.push(s);
  }
  const topK = Object.entries(r.killers).sort((a, b) => b[1] - a[1])[0];
  if (topK && deaths >= 2 && topK[1] / deaths >= 0.5) out.push(`☠ 주범: <b>${esc(topK[0])}</b> — 사망 ${deaths}회 중 ${topK[1]}회.`);
  return out;
}
