/** 4인 레이드 전투 무대: 눈 내리는 밤 숲 배경, 좌측 파티 · 우측 보스, 스킬 이펙트 */
import type { BattleEvent } from '../core/types';
import type { R4State, R4Unit } from '../core/raid4battle';

export interface StageHelpers {
  icon: (u: R4Unit, size: number) => string;
  esc: (s: string) => string;
  fmt: (n: number) => string;
  me: string;
}

// ── 배경 (픽셀 느낌 SVG, 한 번만 만들어 둠) ──
let BG = '';
function background() {
  if (BG) return BG;
  const r = (s: number) => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };
  const stars = Array.from({ length: 40 }, (_, i) => `<rect x="${Math.floor(r(i) * 320)}" y="${Math.floor(r(i + 99) * 70)}" width="1" height="1" fill="#fff" opacity="${0.4 + r(i + 7) * 0.6}"/>`).join('');
  const pine = (x: number, base: number, h: number, c: string, snow: string) => {
    const w = h * 0.55; let out = `<rect x="${x - 1}" y="${base - 6}" width="3" height="6" fill="#1a1020"/>`;
    for (let i = 0; i < 4; i++) {
      const top = base - h + i * (h / 5), bw = w * (0.45 + i * 0.2);
      out += `<polygon points="${x},${top} ${x - bw / 2},${top + h / 3.2} ${x + bw / 2},${top + h / 3.2}" fill="${c}"/><polygon points="${x},${top} ${x - bw / 5},${top + h / 10} ${x + bw / 5},${top + h / 10}" fill="${snow}"/>`;
    }
    return out;
  };
  const layer = (n: number, base: number, h: number, c: string, snow: string, seed: number) =>
    Array.from({ length: n }, (_, i) => pine(Math.floor((i + r(i + seed) * 0.6) * (340 / n)) - 10, base + Math.floor(r(i + seed * 3) * 6), h * (0.8 + r(i + seed * 5) * 0.4), c, snow)).join('');
  BG = `<svg class="r4bg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true">
    <defs><linearGradient id="r4sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a6a"/><stop offset=".55" stop-color="#a05a8a"/><stop offset="1" stop-color="#e8a0a0"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#r4sky)"/>${stars}
    <circle cx="250" cy="34" r="12" fill="#fff4d8" opacity=".9"/><circle cx="255" cy="31" r="10" fill="#f0d8c8" opacity=".35"/>
    ${layer(14, 120, 70, '#2a2858', '#5a5a9a', 1)}
    ${layer(11, 135, 85, '#1e2350', '#7a86c8', 2)}
    ${layer(8, 150, 100, '#18204a', '#a8b8e8', 3)}
    <rect y="138" width="320" height="42" fill="#3a4a8a"/><rect y="138" width="320" height="3" fill="#8a9ad8"/>
    <rect y="150" width="320" height="30" fill="#2e3c78"/>
    ${Array.from({ length: 30 }, (_, i) => `<rect x="${Math.floor(r(i + 300) * 320)}" y="${142 + Math.floor(r(i + 400) * 36)}" width="${2 + Math.floor(r(i + 500) * 4)}" height="1" fill="#6a7ac0" opacity=".6"/>`).join('')}
  </svg>`;
  return BG;
}
const snow = () => `<div class="r4snow" aria-hidden="true">${Array.from({ length: 36 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${-(i * 0.73) % 9}s;animation-duration:${6 + (i % 5)}s;width:${i % 3 ? 2 : 3}px;height:${i % 3 ? 2 : 3}px"></i>`).join('')}</div>`;

// ── 위치 ──
const PARTY_POS = [{ x: 35, y: 85 }, { x: 27, y: 94 }, { x: 19, y: 83 }, { x: 11, y: 92 }];
const BOSS_POS = { x: 72, y: 90 };

let host: HTMLElement | null = null;
let H: StageHelpers | null = null;
const elOf = new Map<string, HTMLElement>(); // 이름 → 유닛
const idEl = new Map<string, HTMLElement>(); // id → 유닛

export function mountStage(el: HTMLElement, st: R4State, h: StageHelpers) {
  host = el; H = h; elOf.clear(); idEl.clear();
  const party = st.units.filter((u) => !u.boss), boss = st.units.find((u) => u.boss)!;
  el.innerHTML = `${background()}${snow()}
    <div class="r4top"><div class="r4order2" id="r4order"></div><div class="r4banner" id="r4banner"></div></div>
    <div class="r4round" id="r4round"></div>
    ${party.map((u, i) => unitHtml(u, PARTY_POS[i % 4], false)).join('')}
    ${unitHtml(boss, BOSS_POS, true)}
    <div class="r4fx" id="r4fx"></div>
    <div class="r4panel" id="r4panel"></div>`;
  for (const u of st.units) {
    const e = el.querySelector<HTMLElement>(`[data-uid="${CSS.escape(u.id)}"]`)!;
    elOf.set(u.name, e); idEl.set(u.id, e);
  }
  updateStage(st);
}
function unitHtml(u: R4Unit, p: { x: number; y: number }, boss: boolean) {
  const h = H!;
  return `<div class="r4unit ${boss ? 'boss' : ''} ${u.owner === h.me ? 'me' : ''}" data-uid="${h.esc(u.id)}" style="left:${p.x}%;top:${p.y}%">
    <div class="r4arrow">▼</div>
    <div class="r4hp"><i></i></div>${boss ? '' : '<div class="r4mp"><i></i></div>'}
    <div class="r4spr">${h.icon(u, boss ? 160 : 64)}</div>
    <div class="r4name">${h.esc(u.name)}${!boss && u.ownerName ? ` <span>${h.esc(u.ownerName)}</span>` : ''}</div>
  </div>`;
}
export const stageMounted = () => !!host && document.body.contains(host);

export function updateStage(st: R4State) {
  if (!host || !H) return;
  const by = Object.fromEntries(st.units.map((u) => [u.id, u]));
  for (const u of st.units) {
    const e = idEl.get(u.id);
    if (!e) continue;
    setBar(e, u.hp, u.maxHp, u.mp, u.maxMp);
    e.classList.toggle('dead', !u.alive);
    e.classList.toggle('turn', st.turn === u.id);
  }
  const ord = host.querySelector('#r4order')!;
  ord.innerHTML = st.order.slice(0, 8).map((id, i) => { const u = by[id]; return u ? `<div class="r4o2 ${i === 0 ? 'now' : ''} ${u.boss ? 'boss' : u.owner === H!.me ? 'me' : ''}">${H!.icon(u, 30)}</div>` : ''; }).join('');
  host.querySelector('#r4round')!.textContent = `ROUND ${st.round}`;
  const boss = st.units.find((u) => u.boss);
  if (boss) host.querySelector('.r4unit.boss .r4hp')?.setAttribute('data-pct', `${(boss.hp / boss.maxHp * 100).toFixed(1)}%`);
}
function setBar(e: HTMLElement, hp: number, max: number, mp?: number, maxMp?: number) {
  const i = e.querySelector<HTMLElement>('.r4hp i');
  if (i) i.style.width = `${Math.max(0, Math.min(100, (hp / Math.max(1, max)) * 100))}%`;
  const m = e.querySelector<HTMLElement>('.r4mp i');
  if (m && mp !== undefined && maxMp) m.style.width = `${Math.max(0, Math.min(100, (mp / maxMp) * 100))}%`;
}

export function setBanner(html: string, mine: boolean) {
  const b = host?.querySelector<HTMLElement>('#r4banner');
  if (!b) return;
  b.innerHTML = html; b.classList.toggle('mine', mine);
}
/** 내 차례 스킬 패널 (사진처럼 무대 위 떠 있는 창) */
export function setPanel(html: string) {
  const p = host?.querySelector<HTMLElement>('#r4panel');
  if (!p) return;
  p.innerHTML = html; p.classList.toggle('on', !!html);
}

// ── 이펙트 ──
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function center(e: HTMLElement) {
  const s = e.querySelector<HTMLElement>('.r4spr') ?? e;
  const a = s.getBoundingClientRect(), b = host!.getBoundingClientRect();
  return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
}
function fxEl(cls: string, x: number, y: number, html = '') {
  const fx = host!.querySelector('#r4fx')!;
  const d = document.createElement('div');
  d.className = `fx ${cls}`; d.style.left = `${x}px`; d.style.top = `${y}px`; d.innerHTML = html;
  fx.appendChild(d);
  return d;
}
function floatText(target: HTMLElement, text: string, cls: string) {
  const c = center(target);
  const d = fxEl(`num ${cls}`, c.x + (Math.random() * 30 - 15), c.y - 20, text);
  d.animate([{ transform: 'translate(-50%,0) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-18px) scale(1.15)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-46px) scale(1)', opacity: 0 }], { duration: 1100, easing: 'ease-out' }).onfinish = () => d.remove();
}
type Kind = 'slash' | 'arrow' | 'fire' | 'ice' | 'bolt' | 'arcane' | 'holy' | 'dark' | 'buff';
function kindOf(skill: string, actor: HTMLElement): Kind {
  if (actor.classList.contains('boss')) return 'dark';
  if (/화살|사격|궁|샷|저격|관통|신살/.test(skill)) return 'arrow';
  if (/파이어|메테오|화염|불|폭발|지옥/.test(skill)) return 'fire';
  if (/블리자드|얼음|서리|빙/.test(skill)) return 'ice';
  if (/썬더|번개|뇌|체인/.test(skill)) return 'bolt';
  if (/별|아케인|마나|노바|성좌|운석/.test(skill)) return 'arcane';
  if (/힐|치유|회복|축복|기도|은총|성|빛|라이트|가호|맹세|부활/.test(skill)) return 'holy';
  if (/도발|방벽|성벽|아이기스|철벽|분노|함성|오라|실드/.test(skill)) return 'buff';
  return 'slash';
}
const COLORS: Record<Kind, [string, string]> = {
  slash: ['#ffffff', '#b8d8ff'], arrow: ['#fff2b0', '#ffd95e'], fire: ['#ffb040', '#ff4020'], ice: ['#c8f4ff', '#4ab0ff'],
  bolt: ['#fffbb0', '#ffe040'], arcane: ['#e8c0ff', '#a050ff'], holy: ['#fff8d0', '#ffe28a'], dark: ['#c080ff', '#5a1aa0'], buff: ['#d0f0ff', '#7fb3ff'],
};
async function lunge(actor: HTMLElement, toward: HTMLElement | null) {
  const a = center(actor), b = toward ? center(toward) : a;
  const dx = Math.max(-60, Math.min(60, (b.x - a.x) * 0.25));
  actor.querySelector('.r4spr')?.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,-6px)` }, { transform: 'translate(0,0)' }], { duration: 320, easing: 'ease-out' });
  await sleep(160);
}
async function projectile(kind: Kind, from: HTMLElement, to: HTMLElement) {
  const a = center(from), b = center(to);
  const [c1, c2] = COLORS[kind];
  const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  const d = fxEl(`proj ${kind}`, a.x, a.y);
  d.style.setProperty('--c1', c1); d.style.setProperty('--c2', c2); d.style.setProperty('--ang', `${ang}deg`);
  await d.animate([{ left: `${a.x}px`, top: `${a.y}px` }, { left: `${b.x}px`, top: `${b.y}px` }], { duration: 260, easing: 'ease-in' }).finished.catch(() => {});
  d.remove();
}
function burst(kind: Kind, to: HTMLElement, big = false) {
  const c = center(to);
  const [c1, c2] = COLORS[kind];
  const d = fxEl(`burst ${kind} ${big ? 'big' : ''}`, c.x, c.y);
  d.style.setProperty('--c1', c1); d.style.setProperty('--c2', c2);
  d.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 0 }], { duration: kind === 'holy' ? 700 : 420, easing: 'ease-out' }).onfinish = () => d.remove();
  if (kind === 'slash' || kind === 'dark') {
    const s = fxEl(`slashline ${kind}`, c.x, c.y);
    s.style.setProperty('--c1', c1);
    s.animate([{ transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(1)', opacity: 1, offset: 0.5 }, { transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(1)', opacity: 0 }], { duration: 320 }).onfinish = () => s.remove();
  }
  if (kind === 'holy') {
    const p = fxEl('pillar', c.x, c.y);
    p.animate([{ opacity: 0, transform: 'translate(-50%,-100%) scaleY(.2)' }, { opacity: 0.9, transform: 'translate(-50%,-100%) scaleY(1)', offset: 0.3 }, { opacity: 0, transform: 'translate(-50%,-100%) scaleY(1)' }], { duration: 750 }).onfinish = () => p.remove();
  }
}
function shake(e: HTMLElement, crit: boolean) {
  e.querySelector('.r4spr')?.animate([{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: `translateX(${crit ? 8 : 5}px)`, filter: 'brightness(2.2) saturate(0)' }, { transform: `translateX(-${crit ? 6 : 4}px)` }, { transform: 'translateX(0)', filter: 'brightness(1)' }], { duration: 280 });
  if (crit) host?.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(3px,-2px)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(0,0)' }], { duration: 220 });
}
function bossFlash() {
  const f = fxEl('screenflash', 0, 0);
  f.animate([{ opacity: 0 }, { opacity: 0.55 }, { opacity: 0 }], { duration: 500 }).onfinish = () => f.remove();
}
function cast(actor: HTMLElement, kind: Kind) {
  const c = center(actor);
  const [c1, c2] = COLORS[kind];
  const d = fxEl('castring', c.x, c.y + 26);
  d.style.setProperty('--c1', c1); d.style.setProperty('--c2', c2);
  d.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0.9 }, { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 0 }], { duration: 500 }).onfinish = () => d.remove();
}

let queue: Promise<void> = Promise.resolve();
/** 기록을 순서대로 연출 (차례마다 받은 이벤트) */
export function playEvents(events: BattleEvent[], fast = false): Promise<void> {
  queue = queue.then(() => run(events, fast)).catch(() => {});
  return queue;
}
async function run(events: BattleEvent[], fast: boolean) {
  if (!host || !stageMounted()) return;
  let actor: HTMLElement | null = null, kind: Kind = 'slash', hitOnce = false, aoe = 0;
  const gap = fast ? 60 : 1;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!stageMounted()) return;
    switch (e.t) {
      case 'skill': case 'attack': {
        actor = elOf.get(e.actor) ?? null;
        kind = e.t === 'skill' ? kindOf(e.skill, actor ?? host) : actor?.classList.contains('boss') ? 'dark' : 'slash';
        hitOnce = false;
        aoe = events.slice(i + 1).filter((x, j, arr) => x.t === 'damage' && arr.slice(0, j).every((y) => y.t !== 'skill' && y.t !== 'attack')).length;
        if (actor) {
          if (e.t === 'skill') { cast(actor, kind); showSkillName(actor, e.skill, kind); }
          if (actor.classList.contains('boss') && aoe >= 3) bossFlash();
          if (!fast) await sleep(e.t === 'skill' ? 260 : 80);
        }
        break;
      }
      case 'damage': case 'heal': {
        const t = elOf.get(e.to);
        if (!t) break;
        const healing = e.t === 'heal';
        const k: Kind = healing ? 'holy' : kind;
        if (actor && !healing && !hitOnce) {
          if (k === 'slash' || k === 'dark') await lunge(actor, t);
          else if (actor !== t) await projectile(k, actor, t);
        }
        hitOnce = true;
        burst(k, t, e.t === 'damage' && e.crit);
        if (e.t === 'damage') { shake(t, e.crit); floatText(t, `${e.crit ? '💥' : ''}${H!.fmt(e.amount)}`, e.crit ? 'crit' : t.classList.contains('boss') ? 'dmg' : 'hurt'); }
        else floatText(t, `+${H!.fmt(e.amount)}`, 'heal');
        setBar(t, e.hpLeft, e.maxHp);
        if (!fast) await sleep(aoe >= 3 ? 70 : 180 * gap);
        break;
      }
      case 'evade': { const t = elOf.get(e.to); if (t) floatText(t, 'MISS', 'miss'); if (!fast) await sleep(150); break; }
      case 'dot': { const t = elOf.get(e.to); if (t) { floatText(t, H!.fmt(e.amount), e.status === 'poison' ? 'poison' : 'burn'); setBar(t, e.hpLeft, e.maxHp); } if (!fast) await sleep(120); break; }
      case 'status': { const t = elOf.get(e.to); if (t && e.label) floatText(t, e.label, 'stat'); else if (/전체/.test(e.to)) for (const [, el] of elOf) if (!el.classList.contains('boss') === /아군/.test(e.to)) burst('buff', el); break; }
      case 'death': { const t = elOf.get(e.who); if (t) { t.classList.add('dead'); t.querySelector('.r4spr')?.animate([{ transform: 'rotate(0)', opacity: 1 }, { transform: 'rotate(-80deg) translateY(10px)', opacity: 0.4 }], { duration: 500, fill: 'forwards' }); } if (!fast) await sleep(300); break; }
      case 'special': { const t = elOf.get(e.who); if (t) { floatText(t, '✦', 'stat'); burst(t.classList.contains('boss') ? 'dark' : 'holy', t, true); if (t.classList.contains('boss')) bossFlash(); } if (/다시 일어선다/.test(e.text)) for (const [n, el] of elOf) if (e.text.includes(n)) { el.classList.remove('dead'); el.querySelector('.r4spr')?.getAnimations().forEach((a) => a.cancel()); } if (!fast) await sleep(220); break; }
      case 'stunned': { const t = elOf.get(e.who); if (t) floatText(t, '기절', 'stat'); break; }
    }
  }
}
function showSkillName(actor: HTMLElement, name: string, kind: Kind) {
  const c = center(actor);
  const d = fxEl('skname', c.x, c.y - 58, H!.esc(name));
  d.style.setProperty('--c2', COLORS[kind][1]);
  d.animate([{ opacity: 0, transform: 'translate(-50%,6px)' }, { opacity: 1, transform: 'translate(-50%,0)', offset: 0.15 }, { opacity: 1, offset: 0.75 }, { opacity: 0, transform: 'translate(-50%,-6px)' }], { duration: 1100 }).onfinish = () => d.remove();
}
