/**
 * 모든 전투 공용 2D 무대 (횡스크롤): 왼쪽 적 · 오른쪽 파티, 위 보스 HP, 아래 파티 상태창, 기술 이름 배너, 피해 숫자·돌진·피격 연출.
 * 유닛 DOM 구조(.bar i · small · id)는 기존 setHp/setDead가 그대로 쓰도록 맞춤.
 */
export type StageTheme = 'forest' | 'castle' | 'chamber' | 'gold' | 'crystal' | 'tower' | 'raid' | 'arena';

const BGS: Partial<Record<StageTheme, string>> = {};
const rnd = (s: number) => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };
export function stageBg(theme: StageTheme): string {
  if (BGS[theme]) return BGS[theme]!;
  const P: Record<StageTheme, { sky: [string, string, string]; far: string; mid: string; ground: string; line: string; deco: 'tree' | 'pillar' | 'crystal' | 'torch' | 'none' }> = {
    forest: { sky: ['#5a8ac8', '#9ac8e8', '#d8ecf0'], far: '#6a9a7a', mid: '#3a6a4a', ground: '#5a7a3a', line: '#7a9a4a', deco: 'tree' },
    castle: { sky: ['#2a1a2a', '#5a2a3a', '#8a4a4a'], far: '#3a2a3a', mid: '#2a1e2a', ground: '#4a3a3a', line: '#6a5050', deco: 'torch' },
    chamber: { sky: ['#0e0618', '#2a0e3a', '#4a1a5a'], far: '#1e0e2a', mid: '#160a20', ground: '#2a1a3a', line: '#5a3a7a', deco: 'pillar' },
    gold: { sky: ['#3a2a10', '#7a5a20', '#c89a40'], far: '#5a4a20', mid: '#3a2e14', ground: '#6a5a2a', line: '#a88a3a', deco: 'pillar' },
    crystal: { sky: ['#0e1a3a', '#1a3a6a', '#3a6aa0'], far: '#1a2a4a', mid: '#12203a', ground: '#2a3a5a', line: '#4a7ac0', deco: 'crystal' },
    tower: { sky: ['#1a1a2a', '#3a3a5a', '#6a6a8a'], far: '#2a2a3a', mid: '#1e1e2e', ground: '#3a3a4a', line: '#5a5a7a', deco: 'pillar' },
    raid: { sky: ['#2a0a0a', '#6a1a1a', '#c84a2a'], far: '#3a1010', mid: '#240a0a', ground: '#4a2020', line: '#8a3a2a', deco: 'torch' },
    arena: { sky: ['#4a6aa0', '#8aa8d0', '#d8e0e8'], far: '#8a7a6a', mid: '#6a5a4a', ground: '#a8906a', line: '#c8b08a', deco: 'none' },
  };
  const p = P[theme];
  const hills = (n: number, base: number, h: number, c: string, seed: number) => {
    let d = `M0 ${base}`;
    for (let i = 0; i <= n; i++) { const x = (i / n) * 320; d += ` L${x.toFixed(0)} ${(base - h * (0.4 + rnd(i + seed) * 0.6)).toFixed(0)}`; }
    return `<path d="${d} L320 ${base} Z" fill="${c}"/>`;
  };
  const deco = Array.from({ length: 7 }, (_, i) => {
    const x = 10 + i * 48 + rnd(i + 50) * 14, y = 112 + rnd(i + 70) * 6;
    if (p.deco === 'tree') return `<rect x="${x - 1.5}" y="${y - 10}" width="3" height="12" fill="#4a2e1a"/><circle cx="${x}" cy="${y - 16}" r="9" fill="#2f5a3a"/><circle cx="${x - 3}" cy="${y - 19}" r="5" fill="#3f7a4a"/>`;
    if (p.deco === 'pillar') return `<rect x="${x - 5}" y="${y - 40}" width="10" height="42" fill="${p.mid}"/><rect x="${x - 7}" y="${y - 42}" width="14" height="4" fill="${p.line}"/><rect x="${x - 7}" y="${y}" width="14" height="3" fill="${p.line}"/>`;
    if (p.deco === 'torch') return `<rect x="${x - 1}" y="${y - 22}" width="2" height="22" fill="#2a1a14"/><circle cx="${x}" cy="${y - 25}" r="3" fill="#ffb02a"/><circle cx="${x}" cy="${y - 25}" r="7" fill="#ffb02a" opacity=".2"/>`;
    if (p.deco === 'crystal') return `<polygon points="${x},${y - 26} ${x + 6},${y} ${x - 6},${y}" fill="#6ac8ff" opacity=".7"/><polygon points="${x + 8},${y - 14} ${x + 12},${y} ${x + 4},${y}" fill="#bfe8ff" opacity=".6"/>`;
    return '';
  }).join('');
  const tiles = Array.from({ length: 40 }, (_, i) => `<rect x="${Math.floor(rnd(i + 300) * 320)}" y="${124 + Math.floor(rnd(i + 400) * 54)}" width="${3 + Math.floor(rnd(i + 500) * 6)}" height="1.5" fill="${p.line}" opacity=".5"/>`).join('');
  BGS[theme] = `<svg class="s2bg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true">
    <defs><linearGradient id="s2sky-${theme}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".6" stop-color="${p.sky[1]}"/><stop offset="1" stop-color="${p.sky[2]}"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#s2sky-${theme})"/>
    ${hills(10, 100, 40, p.far, 1)}${hills(14, 118, 30, p.mid, 2)}${deco}
    <rect y="120" width="320" height="60" fill="${p.ground}"/><rect y="120" width="320" height="2" fill="${p.line}"/>${tiles}
  </svg>`;
  return BGS[theme]!;
}

/** 자리: 적은 왼쪽(최대 6), 파티는 오른쪽(최대 4). 퍼센트 좌표 (발 위치) */
export const ENEMY_POS = [{ x: 30, y: 74 }, { x: 18, y: 66 }, { x: 18, y: 86 }, { x: 34, y: 92 }, { x: 8, y: 76 }, { x: 40, y: 60 }];
export const BOSS_POS = { x: 20, y: 84 };
/** 보스가 있을 때 졸개 자리 (보스와 안 겹치게 앞쪽·위아래) */
export const BOSS_ADD_POS = [{ x: 40, y: 70 }, { x: 42, y: 92 }, { x: 34, y: 58 }, { x: 8, y: 60 }, { x: 48, y: 80 }];
export const PARTY_POS = [{ x: 66, y: 70 }, { x: 74, y: 86 }, { x: 82, y: 68 }, { x: 90, y: 84 }];

export function stageShell(theme: StageTheme) {
  return `<div class="s2" id="s2">${stageBg(theme)}
    <div class="s2boss" id="s2boss" hidden><b id="s2bossName"></b><div class="s2bossbar"><i></i></div><small></small></div>
    <div class="s2cap" id="s2cap"></div>
    <div class="s2units" id="eside"></div><div class="s2units" id="pside"></div>
    <div class="s2fx" id="s2fx"></div>
  </div>
  <div class="s2status" id="s2status"></div>`;
}

/** 유닛 하나 (적/파티 공통). 기존 setHp가 찾는 .bar i 와 small 을 포함 */
export function unitBox(o: { id: string; name: string; icon: string; hp: number; max: number; dead: boolean; side: 'p' | 'e'; boss?: boolean; slot: number; owner?: string; withBoss?: boolean }) {
  const p = o.side === 'p' ? PARTY_POS[o.slot % PARTY_POS.length] : o.boss ? BOSS_POS : o.withBoss ? BOSS_ADD_POS[o.slot % BOSS_ADD_POS.length] : ENEMY_POS[o.slot % ENEMY_POS.length];
  const pct = Math.max(0, Math.min(100, (o.hp / Math.max(1, o.max)) * 100));
  return `<div class="s2u ${o.side} ${o.boss ? 'boss' : ''} ${o.dead ? 'dead' : ''}" id="${o.id}" data-name="${o.name.replace(/"/g, '&quot;')}" style="left:${p.x}%;top:${p.y}%;z-index:${Math.round(p.y)}">
    <div class="s2spr">${o.icon}</div>
    <div class="s2tag"><span class="s2n">${o.name}${o.owner ? ` <i>${o.owner}</i>` : ''}</span><div class="bar"><i style="width:${pct}%"></i></div><small>${Math.round(o.hp)}/${o.max}</small></div>
  </div>`;
}

// ───── 연출 ─────
const el = (name: string) => document.querySelector<HTMLElement>(`#s2 .s2u[data-name="${CSS.escape(name)}"]`);
const fxLayer = () => document.getElementById('s2fx');
function at(e: HTMLElement) { return { x: parseFloat(e.style.left), y: parseFloat(e.style.top) }; }
export function fxCaption(text: string, side: 'p' | 'e') {
  const c = document.getElementById('s2cap'); if (!c) return;
  c.className = `s2cap on ${side}`; c.textContent = text;
  clearTimeout(Number(c.dataset.t)); c.dataset.t = String(setTimeout(() => (c.className = 's2cap'), 1300));
}
export function fxLunge(actor: string, fast: boolean) {
  const a = el(actor); if (!a) return;
  const dir = a.classList.contains('p') ? -1 : 1;
  a.querySelector('.s2spr')?.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dir * 28}px)` }, { transform: 'translateX(0)' }], { duration: fast ? 180 : 320, easing: 'ease-out' });
}
export function fxNumber(target: string, text: string, kind: 'dmg' | 'crit' | 'heal' | 'miss') {
  const t = el(target), L = fxLayer(); if (!t || !L) return;
  const p = at(t);
  const n = document.createElement('div');
  n.className = `s2num ${kind}`; n.textContent = text;
  n.style.left = `${p.x + (Math.random() * 4 - 2)}%`; n.style.top = `${p.y - (t.classList.contains('boss') ? 34 : 20)}%`;
  L.appendChild(n); setTimeout(() => n.remove(), 900);
  if (kind === 'dmg' || kind === 'crit') {
    const s = t.querySelector('.s2spr');
    s?.animate([{ transform: 'translateX(0)', filter: 'brightness(3)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)', filter: 'none' }], { duration: 260 });
  }
}
export function fxBossBar(name: string | null, hp = 0, max = 1) {
  const b = document.getElementById('s2boss'); if (!b) return;
  if (!name) { b.hidden = true; return; }
  b.hidden = false;
  b.querySelector('#s2bossName')!.textContent = name;
  (b.querySelector('.s2bossbar i') as HTMLElement).style.width = `${Math.max(0, Math.min(100, (hp / max) * 100))}%`;
  b.querySelector('small')!.textContent = `${Math.max(0, Math.round(hp)).toLocaleString('ko-KR')} / ${max.toLocaleString('ko-KR')}`;
}
/** 아래 파티 상태창 */
export function statusPanel(rows: { name: string; hp: number; max: number; mp?: number; mpMax?: number; dead: boolean; icon: string }[]) {
  const s = document.getElementById('s2status'); if (!s) return;
  s.innerHTML = rows.map((r) => `<div class="s2row ${r.dead ? 'dead' : ''}" data-name="${r.name.replace(/"/g, '&quot;')}"><span class="s2ri">${r.icon}</span><b>${r.name}</b>
    <span class="s2lbl">HP</span><div class="s2hp"><i style="width:${Math.max(0, Math.min(100, (r.hp / Math.max(1, r.max)) * 100))}%"></i></div><small>${Math.round(r.hp)}</small>
    ${r.mpMax ? `<span class="s2lbl">MP</span><div class="s2mpb"><i style="width:${Math.max(0, Math.min(100, ((r.mp ?? 0) / r.mpMax) * 100))}%"></i></div><small>${Math.round(r.mp ?? 0)}</small>` : ''}</div>`).join('');
}
export function statusHp(name: string, hp: number, max: number, dead?: boolean) {
  const r = document.querySelector<HTMLElement>(`#s2status .s2row[data-name="${CSS.escape(name)}"]`); if (!r) return;
  (r.querySelector('.s2hp i') as HTMLElement).style.width = `${Math.max(0, Math.min(100, (hp / Math.max(1, max)) * 100))}%`;
  r.querySelector('small')!.textContent = String(Math.max(0, Math.round(hp)));
  if (dead !== undefined) r.classList.toggle('dead', dead);
}
