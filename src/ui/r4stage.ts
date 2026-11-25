/** 4인 레이드 전투 무대: 눈 내리는 밤 숲 배경, 좌측 파티 · 우측 보스, 스킬 이펙트 */
import type { BattleEvent } from '../core/types';
import type { R4State, R4Unit } from '../core/raid4battle';
import { AREA, SELF, fxFor, type FxSpec } from './skillfx';

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
const ADD_POS = [{ x: 56, y: 74 }, { x: 59, y: 93 }, { x: 51, y: 84 }];

let host: HTMLElement | null = null;
let H: StageHelpers | null = null;
const elOf = new Map<string, HTMLElement>(); // 이름 → 유닛
const idEl = new Map<string, HTMLElement>(); // id → 유닛

export function mountStage(el: HTMLElement, st: R4State, h: StageHelpers) {
  host = el; H = h; elOf.clear(); idEl.clear();
  const party = st.units.filter((u) => !u.boss && u.owner), boss = st.units.find((u) => u.boss)!;
  el.innerHTML = `${background()}${snow()}
    <div class="r4top"><div class="r4order2" id="r4order"></div><div class="r4banner" id="r4banner"></div></div>
    <div class="r4round" id="r4round"></div>
    <div class="r4cast" id="r4cast"></div>
    ${party.map((u, i) => unitHtml(u, PARTY_POS[i % 4], false)).join('')}
    ${unitHtml(boss, BOSS_POS, true)}
    ${st.units.filter((u) => !u.boss && !u.owner).map((u, i) => unitHtml(u, ADD_POS[i % 3], false, true)).join('')}
    <div class="r4fx" id="r4fx"></div>
    <div class="r4panel" id="r4panel"></div>`;
  for (const u of st.units) {
    const e = el.querySelector<HTMLElement>(`[data-uid="${CSS.escape(u.id)}"]`)!;
    elOf.set(u.name, e); idEl.set(u.id, e);
  }
  updateStage(st);
}
function unitHtml(u: R4Unit, p: { x: number; y: number }, boss: boolean, add = false) {
  const h = H!;
  return `<div class="r4unit ${boss ? 'boss' : ''} ${add ? 'add' : ''} ${u.owner === h.me ? 'me' : ''}" data-uid="${h.esc(u.id)}" data-owner="${h.esc(u.owner ?? '')}" style="left:${p.x}%;top:${p.y}%">
    <div class="r4arrow">▼</div>
    <div class="r4hp"><i></i></div>${boss ? '' : '<div class="r4mp"><i></i></div>'}
    <div class="r4spr">${h.icon(u, boss ? 160 : add ? 52 : 64)}</div>
    <div class="r4name">${h.esc(u.name)}${!boss && u.ownerName ? ` <span>${h.esc(u.ownerName)}</span>` : ''}</div>
  </div>`;
}
export const stageMounted = () => !!host && document.body.contains(host);

/** 소환된 졸개 유닛을 무대에 추가 (이름 기준, id는 나중에 채움) */
function addUnit(u: R4Unit) {
  if (!host || elOf.get(u.name)?.isConnected) return elOf.get(u.name)!;
  const n = host.querySelectorAll('.r4unit.add:not([data-gone])').length;
  const wrap = document.createElement('div');
  wrap.innerHTML = unitHtml(u, ADD_POS[n % 3], false, true);
  const e = wrap.firstElementChild as HTMLElement;
  host.querySelector('#r4fx')!.before(e);
  e.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 400 });
  elOf.set(u.name, e); if (u.id) idEl.set(u.id, e);
  return e;
}
export function updateStage(st: R4State) {
  if (!host || !H) return;
  const by = Object.fromEntries(st.units.map((u) => [u.id, u]));
  for (const u of st.units) {
    let e = idEl.get(u.id);
    if (!e && !u.boss && !u.owner && u.alive) { e = elOf.get(u.name)?.isConnected ? elOf.get(u.name)! : addUnit(u); e.dataset.uid = u.id; idEl.set(u.id, e); }
    if (!e) continue;
    e.classList.toggle('marked', st.boss?.mark === u.id);
    e.classList.toggle('frozen', !!u.frozen);
    // 쓰러진 졸개는 잠시 뒤 무대에서 치움 (다음 소환 자리 비우기)
    if (!u.alive && e.classList.contains('add') && !e.dataset.gone) { e.dataset.gone = '1'; setTimeout(() => e.remove(), 900); }
    if (u.boss) { e.classList.toggle('casting', !!st.boss?.cast); e.classList.toggle('groggy', !!st.boss?.groggy); e.classList.toggle('enraged', !!st.boss?.enraged); }
    setBar(e, u.hp, u.maxHp, u.mp, u.maxMp);
    e.classList.toggle('dead', !u.alive);
    e.classList.toggle('turn', st.turn === u.id);
  }
  const ord = host.querySelector('#r4order')!;
  ord.innerHTML = st.order.slice(0, 8).map((id, i) => { const u = by[id]; return u ? `<div class="r4o2 ${i === 0 ? 'now' : ''} ${u.boss ? 'boss' : u.owner === H!.me ? 'me' : ''}">${H!.icon(u, 30)}</div>` : ''; }).join('');
  host.querySelector('#r4round')!.textContent = `ROUND ${st.round}`;
  const boss = st.units.find((u) => u.boss);
  if (boss) host.querySelector('.r4unit.boss .r4hp')?.setAttribute('data-pct', `${(boss.hp / boss.maxHp * 100).toFixed(1)}%`);
  // 시전바 + 무력화 게이지
  const cb = host.querySelector<HTMLElement>('#r4cast')!;
  const bs = st.boss;
  if (bs?.cast) {
    const k = bs.cast.kind;
    cb.className = `r4cast on ${k}`;
    cb.innerHTML = `<div class="r4ct"><b>${k === 'dodge' ? '❄' : k === 'shield' ? '🩸' : '☠'} ${H.esc(bs.cast.name)}</b><span>${bs.cast.left}턴 뒤 ${k === 'dodge' ? '회피 타임!' : '발동'}</span></div>
      ${k === 'dodge' ? '' : `<div class="r4gauge" role="progressbar" aria-label="${k === 'shield' ? '피의 보호막' : '무력화 게이지'}" aria-valuenow="${bs.cast.gauge}" aria-valuemax="${bs.cast.max}"><i style="width:${(bs.cast.gauge / Math.max(1, bs.cast.max)) * 100}%"></i><span>${k === 'shield' ? '피의 보호막' : '무력화'} ${H.fmt(bs.cast.gauge)}/${H.fmt(bs.cast.max)}</span></div>`}
      <div class="r4chint">${k === 'dodge' ? '곧 직접 움직여요: ↑ 점프 · ↓ 숙이기 · ←→ 이동 (모바일은 화면 버튼)' : k === 'shield' ? '보호막을 깨면 그로기! 딜을 몰아주세요' : '기절·침묵 스킬로 게이지를 0으로!'}</div>`;
  } else if (bs?.groggy) { cb.className = 'r4cast on groggy'; cb.innerHTML = '<div class="r4ct"><b>💫 그로기!</b><span>받는 피해 +50% · 지금 몰아치세요</span></div>'; }
  else { cb.className = 'r4cast'; cb.innerHTML = ''; }
  host.querySelector('#r4round')!.innerHTML = `ROUND ${st.round}${bs ? ` <span class="r4phase">${'◆'.repeat(bs.phase)}${'◇'.repeat(4 - bs.phase)}${bs.enraged ? ' 광폭' : ''}</span>` : ''}`;
}
/** 빠른 채팅 말풍선 (주인 캐릭터 머리 위) */
export function speech(owner: string, text: string) {
  if (!host) return;
  const e = [...idEl.values()].find((x) => x.dataset.owner === owner);
  if (!e) return;
  e.querySelector('.r4say')?.remove();
  const d = document.createElement('div'); d.className = 'r4say'; d.textContent = text;
  e.appendChild(d);
  d.animate([{ opacity: 0, transform: 'translate(-50%,6px)' }, { opacity: 1, transform: 'translate(-50%,0)', offset: 0.08 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 3200 }).onfinish = () => d.remove();
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

// ── 스킬별 이펙트 재료 ──
function colored(d: HTMLElement, s: FxSpec) { d.style.setProperty('--c1', s.c1); d.style.setProperty('--c2', s.c2); return d; }
const anim = (d: HTMLElement, kf: Keyframe[], ms: number, easing = 'ease-out') => d.animate(kf, { duration: ms, easing }).finished.then(() => d.remove()).catch(() => d.remove());
function ring(s: FxSpec, to: HTMLElement, size = 1) {
  const c = center(to), d = colored(fxEl('sk-ring', c.x, c.y), s);
  void anim(d, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: `translate(-50%,-50%) scale(${1.6 * size})`, opacity: 0 }], 600);
}
function sparkles(s: FxSpec, to: HTMLElement, n = 8) {
  const c = center(to);
  for (let i = 0; i < n; i++) {
    const d = colored(fxEl('sk-spark', c.x + (Math.random() * 50 - 25), c.y + 20 - Math.random() * 20), s);
    void anim(d, [{ transform: 'translate(-50%,0) scale(1)', opacity: 1 }, { transform: `translate(-50%,-${50 + Math.random() * 40}px) scale(.3)`, opacity: 0 }], 700 + Math.random() * 400);
  }
}
function iconPop(to: HTMLElement, icon: string) {
  const c = center(to), d = fxEl('sk-icon', c.x, c.y - 30, icon);
  void anim(d, [{ transform: 'translate(-50%,0) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-14px) scale(1.3)', opacity: 1, offset: 0.3 }, { transform: 'translate(-50%,-26px) scale(1)', opacity: 0 }], 900);
}
async function streak(s: FxSpec, from: HTMLElement, to: HTMLElement, thick = 4, ms = 160) {
  const a = center(from), b = center(to);
  const len = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  const d = colored(fxEl('sk-streak', a.x, a.y), s);
  d.style.width = `${len}px`; d.style.height = `${thick}px`; d.style.transform = `rotate(${ang}deg)`;
  await d.animate([{ transform: `rotate(${ang}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 1, offset: 0.6 }, { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 0 }], { duration: ms * 2 }).finished.catch(() => {});
  d.remove();
}
async function orb(s: FxSpec, from: HTMLElement, to: HTMLElement, cls = 'sk-orb', ms = 300) {
  const a = center(from), b = center(to);
  const d = colored(fxEl(`${cls} ${s.big ? 'big' : ''}`, a.x, a.y), s);
  d.style.setProperty('--ang', `${Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI}deg`);
  await d.animate([{ left: `${a.x}px`, top: `${a.y - 10}px` }, { left: `${(a.x + b.x) / 2}px`, top: `${Math.min(a.y, b.y) - 40}px`, offset: 0.5 }, { left: `${b.x}px`, top: `${b.y}px` }], { duration: ms, easing: 'ease-in' }).finished.catch(() => {});
  d.remove();
}
async function fall(s: FxSpec, to: HTMLElement, cls: string, ms = 320) {
  const c = center(to);
  const d = colored(fxEl(`${cls} ${s.big ? 'big' : ''}`, c.x + 60, c.y - 220), s);
  await d.animate([{ left: `${c.x + 60}px`, top: `${c.y - 220}px`, opacity: 0.6 }, { left: `${c.x}px`, top: `${c.y}px`, opacity: 1 }], { duration: ms, easing: 'ease-in' }).finished.catch(() => {});
  d.remove();
}
function boom(s: FxSpec, to: HTMLElement, scale = 1) {
  const c = center(to), d = colored(fxEl('sk-boom', c.x, c.y), s);
  void anim(d, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: `translate(-50%,-50%) scale(${1.4 * scale})`, opacity: 0.9, offset: 0.4 }, { transform: `translate(-50%,-50%) scale(${1.8 * scale})`, opacity: 0 }], 550);
}
function shards(s: FxSpec, to: HTMLElement, n = 7) {
  const c = center(to);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2, r = 40 + Math.random() * 25;
    const d = colored(fxEl('sk-shard', c.x, c.y), s);
    d.style.rotate = `${(ang * 180) / Math.PI}deg`;
    void anim(d, [{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * r}px), calc(-50% + ${Math.sin(ang) * r}px))`, opacity: 0 }], 500);
  }
}
function cloud(s: FxSpec, to: HTMLElement) {
  const c = center(to), d = colored(fxEl('sk-cloud', c.x, c.y + 6), s);
  void anim(d, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 0.85, offset: 0.35 }, { transform: 'translate(-50%,-60%) scale(1.4)', opacity: 0 }], 1000);
}
function dome(s: FxSpec, to: HTMLElement) {
  const c = center(to), d = colored(fxEl('sk-dome', c.x, c.y + 10), s);
  void anim(d, [{ transform: 'translate(-50%,-60%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-60%) scale(1.05)', opacity: 0.9, offset: 0.3 }, { transform: 'translate(-50%,-60%) scale(1)', opacity: 0.6, offset: 0.8 }, { transform: 'translate(-50%,-60%) scale(1.1)', opacity: 0 }], 1100);
}
function auraCol(s: FxSpec, to: HTMLElement) {
  const c = center(to), d = colored(fxEl('sk-aura', c.x, c.y + 30), s);
  void anim(d, [{ transform: 'translate(-50%,-100%) scaleY(.1)', opacity: 0 }, { transform: 'translate(-50%,-100%) scaleY(1)', opacity: 0.9, offset: 0.35 }, { transform: 'translate(-50%,-110%) scaleY(1.1)', opacity: 0 }], 900);
  sparkles(s, to, 5);
}
async function crack(s: FxSpec, from: HTMLElement, tos: HTMLElement[]) {
  const a = center(from);
  const far = tos.map(center).reduce((m, p) => (Math.abs(p.x - a.x) > Math.abs(m.x - a.x) ? p : m), a);
  const y = Math.max(a.y, far.y) + 34, len = Math.abs(far.x - a.x) + 40, left = Math.min(a.x, far.x) - 20;
  const d = colored(fxEl('sk-crack', far.x < a.x ? left + len : left, y), s);
  d.style.width = `${len}px`; d.style.transformOrigin = far.x < a.x ? 'right center' : 'left center'; if (far.x < a.x) d.style.left = `${left}px`;
  await d.animate([{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.7 }, { transform: 'scaleX(1)', opacity: 0 }], { duration: 520, easing: 'ease-out' }).finished.catch(() => {});
  d.remove();
}
async function chainLine(s: FxSpec, from: HTMLElement, tos: HTMLElement[]) {
  const pts = [from, ...tos].map(center);
  const zig = (a: { x: number; y: number }, b: { x: number; y: number }) => { let p = `${a.x},${a.y}`; for (let i = 1; i < 6; i++) { const f = i / 6; p += ` ${a.x + (b.x - a.x) * f + (Math.random() * 16 - 8)},${a.y + (b.y - a.y) * f + (Math.random() * 16 - 8)}`; } return `${p} ${b.x},${b.y}`; };
  const r = host!.getBoundingClientRect();
  const d = fxEl('sk-chain', 0, 0, `<svg width="${r.width}" height="${r.height}"><polyline points="${pts.slice(1).map((b, i) => zig(pts[i], b)).join(' ')}" fill="none" stroke="${s.c2}" stroke-width="4"/><polyline points="${pts.slice(1).map((b, i) => zig(pts[i], b)).join(' ')}" fill="none" stroke="${s.c1}" stroke-width="2"/></svg>`);
  await d.animate([{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }, { opacity: 0 }], { duration: 450 }).finished.catch(() => {});
  d.remove();
}
function cone(s: FxSpec, from: HTMLElement, toLeft: boolean) {
  const a = center(from);
  const d = colored(fxEl(`sk-cone ${toLeft ? 'left' : ''}`, a.x, a.y), s);
  return anim(d, [{ transform: `translate(${toLeft ? '-100%' : '0'},-50%) scaleX(.1)`, opacity: 0.95 }, { transform: `translate(${toLeft ? '-100%' : '0'},-50%) scaleX(1)`, opacity: 0.85, offset: 0.55 }, { transform: `translate(${toLeft ? '-100%' : '0'},-50%) scaleX(1.05)`, opacity: 0 }], 750);
}
function spinArc(s: FxSpec, actor: HTMLElement) {
  const c = center(actor), d = colored(fxEl('sk-spin', c.x, c.y), s);
  return anim(d, [{ transform: 'translate(-50%,-50%) rotate(0) scale(.6)', opacity: 1 }, { transform: 'translate(-50%,-50%) rotate(540deg) scale(1.3)', opacity: 0 }], 520, 'ease-in-out');
}
function snowfall(s: FxSpec) {
  const r = host!.getBoundingClientRect();
  for (let i = 0; i < 26; i++) {
    const d = colored(fxEl('sk-snow', r.width * (0.05 + Math.random() * 0.5), -10), s);
    void anim(d, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(-${60 + Math.random() * 80}px,${r.height * (0.6 + Math.random() * 0.3)}px)`, opacity: 0 }], 700 + Math.random() * 500, 'linear');
  }
}
function trapSnap(s: FxSpec, to: HTMLElement) {
  const c = center(to), d = colored(fxEl('sk-trap', c.x, c.y + 30, '<i></i><i></i>'), s);
  void anim(d, [{ transform: 'translate(-50%,-50%) scale(1.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.4 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], 800);
}
function runeCircle(s: FxSpec, to: HTMLElement) {
  const c = center(to), d = colored(fxEl('sk-rune', c.x, c.y), s);
  void anim(d, [{ transform: 'translate(-50%,-50%) rotate(0) scale(.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(120deg) scale(1)', opacity: 1, offset: 0.4 }, { transform: 'translate(-50%,-50%) rotate(240deg) scale(.9)', opacity: 0 }], 900);
}
const sideOf = (el: HTMLElement) => [...host!.querySelectorAll<HTMLElement>(el.classList.contains('boss') || el.classList.contains('add') ? '.r4unit.boss:not(.dead),.r4unit.add:not(.dead)' : '.r4unit:not(.boss):not(.add):not(.dead)')];
/** 시전 직후: 자기·아군 대상 스킬 (버프·보호막·소환·도발) */
async function selfFx(s: FxSpec, actor: HTMLElement, fast: boolean) {
  const allies = sideOf(actor);
  switch (s.style) {
    case 'aura': for (const a of (s.big ? allies : allies)) auraCol(s, a); if (s.icon) iconPop(actor, s.icon); break;
    case 'barrier': for (const a of allies) dome(s, a); if (s.icon) iconPop(actor, s.icon); break;
    case 'summon': ring(s, actor, 1.4); sparkles(s, actor, 10); if (s.icon) { iconPop(actor, s.icon); setTimeout(() => iconPop(actor, s.icon!), 180); } break;
    case 'taunt': ring(s, actor, 1.6); iconPop(actor, s.icon ?? '❗'); actor.querySelector('.r4spr')?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 300 }); break;
  }
  if (!fast) await sleep(320);
}
/** 범위 스킬: 대상 전체에 한 번에 연출 */
async function areaFx(s: FxSpec, actor: HTMLElement, tos: HTMLElement[], fast: boolean) {
  switch (s.style) {
    case 'spin': await spinArc(s, actor); break;
    case 'quake': await crack(s, actor, tos); break;
    case 'bolt': await Promise.all(tos.map((t, i) => sleep(i * 60).then(() => fall(s, t, 'sk-bolt', 140)))); break;
    case 'chain': await chainLine(s, actor, tos); break;
    case 'meteor': await Promise.all(tos.map((t, i) => sleep(i * 90).then(() => fall(s, t, 'sk-meteor', 380)))); host!.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(6px,-4px)' }, { transform: 'translate(-6px,4px)' }, { transform: 'translate(0,0)' }], { duration: 300 }); break;
    case 'starfall': { const all: Promise<void>[] = []; for (const t of tos) for (let k = 0; k < 3; k++) all.push(sleep(k * 110 + Math.random() * 80).then(() => fall(s, t, 'sk-star', 260))); await Promise.all(all); break; }
    case 'nova': { const a = center(tos[0] ?? actor); const d = colored(fxEl('sk-nova', a.x, a.y), s); await d.animate([{ transform: 'translate(-50%,-50%) scale(.1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(3.2)', opacity: 0 }], { duration: 550 }).finished.catch(() => {}); d.remove(); break; }
    case 'breath': { const toLeft = center(tos[0] ?? actor).x < center(actor).x; await cone(s, actor, toLeft); break; }
    case 'blizzard': snowfall(s); await sleep(fast ? 0 : 450); break;
  }
}
/** 단일 대상 스킬: 시전자 → 대상 이동 */
async function travelFx(s: FxSpec, actor: HTMLElement, to: HTMLElement) {
  switch (s.style) {
    case 'slash': case 'dark': case 'drain': await lunge(actor, to); break;
    case 'orb': await orb(s, actor, to); break;
    case 'shard': await orb(s, actor, to, 'sk-lance', 240); break;
    case 'arrow': await streak(s, actor, to, s.big ? 6 : 3, s.big ? 200 : 130); break;
    case 'volley': await Promise.all([0, 1, 2, 3].map((i) => sleep(i * 70).then(() => streak(s, actor, to, 2, 110)))); break;
    case 'skyArrow': await fall(s, to, 'sk-skyarrow', 220); break;
    case 'poison': await orb(s, actor, to, 'sk-orb small', 260); break;
    case 'hammer': await fall(s, to, 'sk-hammer', 300); break;
    case 'seal': case 'trap': break;
    default: if (actor !== to) await orb(s, actor, to);
  }
}
/** 맞은 자리 */
function impactFx(s: FxSpec, to: HTMLElement, crit: boolean) {
  switch (s.style) {
    case 'slash': case 'dark': case 'spin': { const c = center(to), d = colored(fxEl(`sk-slash ${s.big ? 'big' : ''}`, c.x, c.y), s); void anim(d, [{ transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(1)', opacity: 1, offset: 0.5 }, { transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(1)', opacity: 0 }], 320); if (s.big || crit) { const e2 = colored(fxEl(`sk-slash ${s.big ? 'big' : ''}`, c.x, c.y), s); void anim(e2, [{ transform: 'translate(-50%,-50%) rotate(35deg) scaleX(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) rotate(35deg) scaleX(1)', opacity: 1, offset: 0.5 }, { transform: 'translate(-50%,-50%) rotate(35deg) scaleX(1)', opacity: 0 }], 380); } break; }
    case 'orb': case 'meteor': case 'hammer': case 'nova': boom(s, to, s.big ? 1.3 : 1); break;
    case 'shard': case 'blizzard': shards(s, to, s.big ? 10 : 7); boom(s, to, 0.7); break;
    case 'bolt': case 'chain': boom(s, to, 0.8); break;
    case 'arrow': case 'volley': case 'skyArrow': boom(s, to, 0.6); if (s.icon) iconPop(to, s.icon); break;
    case 'starfall': boom(s, to, 0.6); sparkles(s, to, 4); break;
    case 'quake': boom(s, to, 0.9); to.querySelector('.r4spr')?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], { duration: 320 }); break;
    case 'poison': cloud(s, to); break;
    case 'breath': boom(s, to, 0.9); break;
    case 'drain': boom(s, to, 0.8); break;
    case 'seal': runeCircle(s, to); if (s.icon) iconPop(to, s.icon); break;
    case 'trap': trapSnap(s, to); break;
    default: boom(s, to);
  }
  if (s.icon && (s.style === 'slash')) iconPop(to, s.icon);
}
/** 흡혈: 대상 → 시전자로 붉은 흐름 */
function drainBack(s: FxSpec, from: HTMLElement, to: HTMLElement) { void orb(s, from, to, 'sk-orb small', 380); }

let queue: Promise<void> = Promise.resolve();
/** 기록을 순서대로 연출 (차례마다 받은 이벤트) */
export function playEvents(events: BattleEvent[], fast = false): Promise<void> {
  queue = queue.then(() => run(events, fast)).catch(() => {});
  return queue;
}
async function run(events: BattleEvent[], fast: boolean) {
  if (!host || !stageMounted()) return;
  let actor: HTMLElement | null = null, kind: Kind = 'slash', hitOnce = false, aoe = 0, spec: FxSpec | null = null, areaDone = false, targets: HTMLElement[] = [];
  const gap = fast ? 60 : 1;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!stageMounted()) return;
    switch (e.t) {
      case 'skill': case 'attack': {
        actor = elOf.get(e.actor) ?? null;
        const boss = !!actor?.classList.contains('boss');
        kind = e.t === 'skill' ? kindOf(e.skill, actor ?? host) : boss ? 'dark' : 'slash';
        spec = e.t === 'skill' ? fxFor(e.skill, boss) : null;
        hitOnce = false; areaDone = false;
        const until = events.findIndex((x, j) => j > i && (x.t === 'skill' || x.t === 'attack'));
        const seg = events.slice(i + 1, until < 0 ? undefined : until);
        aoe = seg.filter((x) => x.t === 'damage').length;
        targets = [...new Set(seg.filter((x) => x.t === 'damage').map((x) => elOf.get((x as { to: string }).to)).filter(Boolean) as HTMLElement[])];
        if (actor) {
          if (e.t === 'skill') { if (spec) { const c = center(actor); const r = colored(fxEl('castring', c.x, c.y + 26), spec); r.style.setProperty('--c2', spec.c2); void anim(r, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0.9 }, { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 0 }], 500); } else cast(actor, kind); showSkillName(actor, e.skill, kind, spec?.c2); }
          if (boss && aoe >= 3) bossFlash();
          if (spec && SELF[spec.style]) await selfFx(spec, actor, fast);
          else if (!fast) await sleep(e.t === 'skill' ? 260 : 80);
        }
        break;
      }
      case 'damage': case 'heal': {
        const t = elOf.get(e.to);
        if (!t) break;
        const healing = e.t === 'heal';
        if (spec && actor && !healing) {
          if (AREA[spec.style]) { if (!areaDone) { areaDone = true; await areaFx(spec, actor, targets.length ? targets : [t], fast); } }
          else if (!hitOnce) await travelFx(spec, actor, t);
          impactFx(spec, t, e.t === 'damage' && e.crit);
          if (spec.style === 'drain' && !hitOnce) drainBack(spec, t, actor);
        } else if (healing && spec && (spec.style === 'heal' || spec.style === 'drain' || SELF[spec.style])) {
          if (spec.style === 'heal') { ring(spec, t, spec.big ? 1.2 : 0.8); sparkles(spec, t, spec.big ? 10 : 6); if (spec.icon && !hitOnce) iconPop(actor ?? t, spec.icon); }
          else sparkles({ ...spec, c2: '#4ae07a' }, t, 5);
        } else {
          const k: Kind = healing ? 'holy' : kind;
          if (actor && !healing && !hitOnce) {
            if (k === 'slash' || k === 'dark') await lunge(actor, t);
            else if (actor !== t) await projectile(k, actor, t);
          }
          burst(k, t, e.t === 'damage' && e.crit);
        }
        hitOnce = true;
        if (e.t === 'damage') { shake(t, e.crit); floatText(t, `${e.crit ? '💥' : ''}${H!.fmt(e.amount)}`, e.crit ? 'crit' : t.classList.contains('boss') ? 'dmg' : 'hurt'); }
        else floatText(t, `+${H!.fmt(e.amount)}`, 'heal');
        setBar(t, e.hpLeft, e.maxHp);
        if (!fast) await sleep(aoe >= 3 ? 70 : 180 * gap);
        break;
      }
      case 'evade': { const t = elOf.get(e.to); if (t) floatText(t, 'MISS', 'miss'); if (!fast) await sleep(150); break; }
      case 'dot': { const t = elOf.get(e.to); if (t) { floatText(t, H!.fmt(e.amount), e.status === 'poison' ? 'poison' : 'burn'); setBar(t, e.hpLeft, e.maxHp); } if (!fast) await sleep(120); break; }
      case 'status': {
        if (spec && actor && (spec.style === 'seal' || spec.style === 'trap' || spec.style === 'poison') && e.status !== 'buff' && !hitOnce) {
          const foes = /전체/.test(e.to) ? [...host!.querySelectorAll<HTMLElement>('.r4unit:not(.dead)')].filter((x) => sideOf(x)[0] && !sideOf(actor!).includes(x)) : [elOf.get(e.to)].filter(Boolean) as HTMLElement[];
          if (foes.length) { if (spec.style === 'poison' && foes.length === 1) await travelFx(spec, actor, foes[0]); for (const f of foes) impactFx(spec, f, false); hitOnce = true; if (!fast) await sleep(250); }
        }
        const t = elOf.get(e.to); if (t && e.label) floatText(t, e.label, 'stat'); else if (/전체/.test(e.to)) for (const [, el] of elOf) if (!el.classList.contains('boss') === /아군/.test(e.to)) burst('buff', el); break; }
      case 'death': { const t = elOf.get(e.who); if (t) { t.classList.add('dead'); t.querySelector('.r4spr')?.animate([{ transform: 'rotate(0)', opacity: 1 }, { transform: 'rotate(-80deg) translateY(10px)', opacity: 0.4 }], { duration: 500, fill: 'forwards' }); } if (!fast) await sleep(300); break; }
      case 'special': { const t = elOf.get(e.who); if (t) { floatText(t, '✦', 'stat'); burst(t.classList.contains('boss') ? 'dark' : 'holy', t, true); if (t.classList.contains('boss')) bossFlash(); } if (/다시 일어선다/.test(e.text)) for (const [n, el] of elOf) if (e.text.includes(n)) { el.classList.remove('dead'); el.querySelector('.r4spr')?.getAnimations().forEach((a) => a.cancel()); } if (!fast) await sleep(220); break; }
      case 'stunned': { const t = elOf.get(e.who); if (t) floatText(t, '기절', 'stat'); break; }
      case 'summon': { for (const s of e.summoned) addUnit({ id: '', name: s.name, mid: s.id, hp: s.hp, maxHp: s.maxHp, mp: 0, maxMp: 0, alive: true }); if (!fast) await sleep(350); break; }
      case 'raid': await raidFx(e, fast); break;
    }
  }
}
function bigText(text: string, cls: string, ms = 1600) {
  host!.querySelectorAll('.fx.bigtxt').forEach((x) => x.remove());
  const r = host!.getBoundingClientRect();
  const d = fxEl(`bigtxt ${cls}`, r.width / 2, r.height * 0.42, H!.esc(text));
  d.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(1.6)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: 0.12 }, { opacity: 1, offset: 0.8 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(.95)' }], { duration: ms, easing: 'ease-out' }).onfinish = () => d.remove();
}
function screenTint(color: string, ms: number, peak = 0.6) {
  const f = fxEl('screenflash', 0, 0);
  f.style.background = color;
  f.animate([{ opacity: 0 }, { opacity: peak, offset: 0.25 }, { opacity: 0 }], { duration: ms }).onfinish = () => f.remove();
}
const bossEl = () => host!.querySelector<HTMLElement>('.r4unit.boss');
const partyEls = () => [...host!.querySelectorAll<HTMLElement>('.r4unit:not(.boss):not(.add):not(.dead)')];
async function raidFx(e: Extract<BattleEvent, { t: 'raid' }>, fast: boolean) {
  const b = bossEl();
  const wait = (ms: number) => (fast ? Promise.resolve() : sleep(ms));
  switch (e.kind) {
    case 'cast': {
      const nm = e.text.match(/「(.+?)」/)?.[1] ?? '전멸기';
      const ice = /절대영도/.test(nm), blood = /피의 계약/.test(nm);
      bigText(`${ice ? '❄' : blood ? '🩸' : '☠'} ${nm} 시전!`, ice ? 'ice' : 'danger', 1800); screenTint(ice ? '#3a90ff80' : '#a0102080', 900, 0.7);
      if (b) { b.classList.add('casting'); burst('dark', b, true); }
      host!.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(4px,-3px)' }, { transform: 'translate(-4px,3px)' }, { transform: 'translate(0,0)' }], { duration: 300, iterations: 2 });
      await wait(900); break;
    }
    case 'castTick': { if (b) { floatText(b, '시전 중…', 'stat'); burst('dark', b); } screenTint('#80102060', 600, 0.4); await wait(350); break; }
    case 'interrupt': {
      const who = e.target ? elOf.get(e.target) : null;
      if (/완벽 회피/.test(e.text)) { if (who) floatText(who, '완벽 회피! ✨', 'heal'); await wait(150); break; }
      if (/피의 보호막/.test(e.text)) { if (b) floatText(b, `🩸 ${H!.fmt(e.value ?? 0)}`, 'gauge'); break; }
      if (b) { if (who) await projectile('ice', who, b); burst('ice', b, true); floatText(b, `무력화 ${e.value ?? ''}`, 'gauge'); shake(b, false); }
      await wait(300); break;
    }
    case 'break': {
      bigText('무력화 성공!', 'good', 1800); screenTint('#ffffffaa', 500, 0.8);
      if (b) { b.classList.remove('casting'); b.classList.add('groggy'); shake(b, true); b.querySelector('.r4spr')?.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(8deg) translateY(10px)', offset: 0.3 }, { transform: 'rotate(4deg) translateY(6px)', offset: 0.8 }, { transform: 'rotate(0)' }], { duration: 1200 }); }
      await wait(900); break;
    }
    case 'wipe': {
      const nm = e.text.match(/「(.+?)」/)?.[1] ?? '전멸기';
      bigText(`☠ ${nm}`, /절대영도/.test(nm) ? 'ice' : 'danger', 1600);
      const r = host!.getBoundingClientRect();
      const d = fxEl('wipeboom', r.width * 0.7, r.height * 0.6);
      d.animate([{ transform: 'translate(-50%,-50%) scale(.1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(9)', opacity: 0.95, offset: 0.6 }, { transform: 'translate(-50%,-50%) scale(12)', opacity: 0 }], { duration: 1300, easing: 'ease-in' }).onfinish = () => d.remove();
      screenTint('#200030', 1400, 0.9);
      if (b) b.classList.remove('casting');
      host!.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(8px,-5px)' }, { transform: 'translate(-8px,5px)' }, { transform: 'translate(0,0)' }], { duration: 260, iterations: 4 });
      await wait(1100); break;
    }
    case 'mark': { const t = e.target ? elOf.get(e.target) : null; if (t) { t.classList.add('marked'); burst('dark', t); floatText(t, '☠ 표식', 'danger'); } await wait(500); break; }
    case 'markHit': { const t = e.target ? elOf.get(e.target) : null; if (t) { t.classList.remove('marked'); burst('dark', t, true); burst('fire', t, true); shake(t, true); } screenTint('#40004080', 500, 0.5); await wait(400); break; }
    case 'phase': { if (b) { burst('dark', b, true); bossFlash(); } if (e.text.length < 30) floatText(b ?? host!, '페이즈 전환', 'danger'); await wait(500); break; }
    case 'enrage': { bigText('광폭화!', 'danger', 1600); screenTint('#ff000070', 900, 0.6); if (b) { b.classList.add('enraged'); burst('fire', b, true); } await wait(700); break; }
    case 'groggy': { if (b) floatText(b, '💫 그로기', 'gauge'); await wait(400); break; }
    case 'curse': { for (const p of partyEls()) { burst('dark', p); floatText(p, '저주', 'poison'); } await wait(400); break; }
    case 'breath': {
      const r = host!.getBoundingClientRect();
      const d = fxEl('breathwave', r.width * 0.62, r.height * 0.62);
      d.animate([{ transform: 'translate(-50%,-50%) scaleX(.1)', opacity: 0.9 }, { transform: 'translate(-100%,-50%) scaleX(1)', opacity: 0.8, offset: 0.6 }, { transform: 'translate(-110%,-50%) scaleX(1.05)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => d.remove();
      await wait(300); break;
    }
    case 'smash': { const t = e.target ? elOf.get(e.target) : null; if (t) { const c = center(t); const d = fxEl('warnzone', c.x, c.y + 24); d.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.6)' }, { opacity: 0.9, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0 }], { duration: 600 }).onfinish = () => d.remove(); } await wait(250); break; }
    case 'summon': { const t = e.target ? elOf.get(e.target) : null; if (t) { t.classList.remove('frozen'); burst('ice', t, true); floatText(t, '탈출!', 'heal'); } await wait(200); break; }
    case 'dodge': { bigText('❄ 절대영도!', 'ice', 1400); screenTint('#bfe8ffcc', 700, 0.8); await wait(900); break; }
  }
}
function showSkillName(actor: HTMLElement, name: string, kind: Kind, color?: string) {
  const c = center(actor);
  const d = fxEl('skname', c.x, c.y - 58, H!.esc(name));
  d.style.setProperty('--c2', color ?? COLORS[kind][1]);
  d.animate([{ opacity: 0, transform: 'translate(-50%,6px)' }, { opacity: 1, transform: 'translate(-50%,0)', offset: 0.15 }, { opacity: 1, offset: 0.75 }, { opacity: 0, transform: 'translate(-50%,-6px)' }], { duration: 1100 }).onfinish = () => d.remove();
}
