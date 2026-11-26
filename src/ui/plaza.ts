/** 마을 광장: 용병단장 아바타로 걸어 다니며 다른 사람과 만남 (키보드 · 조이스틱 · 탭 이동) */
import type { AvatarState } from '../data/cosmetics';

export interface PlazaMe { id: string; name: string; av: AvatarState; title?: string | null }
export interface PlazaHelpers {
  figure: (av: AvatarState | undefined, name: string, title?: string | null) => string;
  esc: (s: string) => string;
}
export interface PlazaOpts {
  host: HTMLElement; me: PlazaMe; h: PlazaHelpers;
  send: (ev: string, p: unknown) => void;
  onDoor: (to: string) => void;
  onPick: (id: string, name: string) => void;
  onLog: (line: string) => void;
}
interface P { id: string; name: string; av?: AvatarState; title?: string | null; x: number; y: number; tx: number; ty: number; f: 1 | -1; moving: boolean; el: HTMLElement; seen: number }

export const PW = 100, PH = 62.5;
export const DOORS = [
  { x: 14, to: 'guild', name: '길드' }, { x: 34, to: 'smith', name: '대장간' }, { x: 66, to: 'raid4', name: '4인 레이드' }, { x: 86, to: 'shop', name: '잡화점' },
];
const FOUNTAIN = { x: 50, y: 36, r: 7.5 };
const TREES = [{ x: 6, y: 30 }, { x: 94, y: 30 }, { x: 8, y: 54 }, { x: 92, y: 54 }, { x: 26, y: 50 }, { x: 74, y: 50 }];
const WALL_Y = 17; // 건물 앞 (이보다 위로 못 감)
export const EMOTES = ['👋', '🎉', '❤️', '😂', '💃', '😢', '🔥', '👍'];

function blocked(x: number, y: number) {
  if (x < 2 || x > PW - 2 || y < WALL_Y || y > PH - 1) return true;
  if (Math.hypot(x - FOUNTAIN.x, (y - FOUNTAIN.y) * 1.6) < FOUNTAIN.r) return true;
  return TREES.some((t) => Math.hypot(x - t.x, (y - t.y) * 1.6) < 2.2);
}

let BG = '';
function background() {
  if (BG) return BG;
  const r = (s: number) => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };
  const stones = Array.from({ length: 140 }, (_, i) => `<rect x="${(r(i) * 200).toFixed(1)}" y="${(36 + r(i + 500) * 89).toFixed(1)}" width="${(2 + r(i + 900) * 4).toFixed(1)}" height="${(1 + r(i + 1300) * 1.5).toFixed(1)}" rx=".5" fill="#6a5a6a" opacity=".45"/>`).join('');
  const bld = (x: number, w: number, roof: string, wall: string, sign: string, door: string) => `
    <rect x="${x}" y="6" width="${w}" height="30" fill="${wall}"/><polygon points="${x - 3},8 ${x + w / 2},-4 ${x + w + 3},8" fill="${roof}"/>
    <rect x="${x + w / 2 - 5}" y="20" width="10" height="16" rx="5" fill="${door}"/><rect x="${x + 4}" y="12" width="7" height="6" fill="#ffd95e" opacity=".75"/><rect x="${x + w - 11}" y="12" width="7" height="6" fill="#ffd95e" opacity=".75"/>
    <rect x="${x + w / 2 - 11}" y="8.5" width="22" height="6" rx="1.5" fill="#3a2414"/><text x="${x + w / 2}" y="13.2" font-size="4.2" fill="#ffe9a8" text-anchor="middle" font-family="sans-serif" font-weight="700">${sign}</text>`;
  const tree = (x: number, y: number) => `<ellipse cx="${x * 2}" cy="${y * 2 + 3}" rx="5" ry="2" fill="#0004"/><rect x="${x * 2 - 1}" y="${y * 2 - 4}" width="2" height="6" fill="#4a2e1a"/><circle cx="${x * 2}" cy="${y * 2 - 8}" r="6" fill="#2f5a3a"/><circle cx="${x * 2 - 2}" cy="${y * 2 - 10}" r="3" fill="#3f7a4a"/>`;
  BG = `<svg class="pzbg" viewBox="0 0 200 125" preserveAspectRatio="none" aria-hidden="true">
    <rect width="200" height="125" fill="#4a3e4c"/>${stones}
    <rect y="0" width="200" height="36" fill="#2a2030"/>
    ${bld(12, 32, '#6a2a2a', '#8a6a4a', '길드', '#3a2414')}${bld(52, 32, '#3a3a4a', '#6a6a72', '대장간', '#2a2420')}${bld(116, 32, '#3a1a5a', '#4a3a5a', '레이드', '#120818')}${bld(156, 32, '#2a5a3a', '#8a7a5a', '잡화점', '#3a2414')}
    <ellipse cx="100" cy="76" rx="16" ry="9" fill="#5a6a8a"/><ellipse cx="100" cy="74" rx="13" ry="7" fill="#6ab0e0"/><rect x="97" y="58" width="6" height="16" fill="#8a8a9a"/><circle cx="100" cy="57" r="4" fill="#bfe8ff" opacity=".8"/>
    ${TREES.map((t) => tree(t.x, t.y)).join('')}
    <rect x="0" y="36" width="200" height="1.2" fill="#00000055"/>
  </svg>`;
  return BG;
}

export function mountPlaza(o: PlazaOpts) {
  const { host, h } = o;
  host.innerHTML = `<div class="plaza" tabindex="0" aria-label="마을 광장 (방향키·WASD로 이동, 바닥을 누르면 그쪽으로 걸어가요)">
    ${background()}<div class="pzdoors">${DOORS.map((d) => `<button class="pzdoor" data-to="${d.to}" style="left:${d.x}%;top:${(WALL_Y + 1) / PH * 100}%">${h.esc(d.name)} 들어가기 <kbd>E</kbd></button>`).join('')}</div>
    <div class="pzlayer" id="pzlayer"></div>
    <div class="pzjoy" id="pzjoy" aria-hidden="true"><i></i></div>
  </div>`;
  const root = host.querySelector<HTMLElement>('.plaza')!;
  const layer = root.querySelector<HTMLElement>('#pzlayer')!;
  const players = new Map<string, P>();
  const mk = (id: string, name: string, av: AvatarState | undefined, title: string | null | undefined, x: number, y: number): P => {
    const el = document.createElement('div');
    el.className = `pzp ${id === o.me.id ? 'me' : ''}`;
    el.dataset.id = id;
    el.innerHTML = `<div class="pzfig">${h.figure(av, name, title)}</div>`;
    layer.appendChild(el);
    const p: P = { id, name, av, title, x, y, tx: x, ty: y, f: 1, moving: false, el, seen: performance.now() };
    players.set(id, p);
    return p;
  };
  // 내 시작 위치: 분수 아래쪽 아무 데나
  let sx = 30 + Math.random() * 40, sy = 50 + Math.random() * 8;
  while (blocked(sx, sy)) { sx = 30 + Math.random() * 40; sy = 48 + Math.random() * 10; }
  const me = mk(o.me.id, o.me.name, o.me.av, o.me.title, sx, sy);
  // 입력
  const keys = { L: false, R: false, U: false, D: false };
  const map: Record<string, keyof typeof keys> = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R', ArrowUp: 'U', w: 'U', W: 'U', ArrowDown: 'D', s: 'D', S: 'D' };
  const typing = () => { const a = document.activeElement as HTMLElement | null; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); };
  let near: (typeof DOORS)[number] | null = null;
  const kd = (e: KeyboardEvent) => {
    if (typing()) return;
    const k = map[e.key];
    if (k) { e.preventDefault(); keys[k] = true; tap = null; }
    if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && near) { e.preventDefault(); o.onDoor(near.to); }
  };
  const ku = (e: KeyboardEvent) => { const k = map[e.key]; if (k) keys[k] = false; };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  // 탭 이동 · 다른 사람 누르기 · 문
  let tap: { x: number; y: number } | null = null;
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const door = t.closest<HTMLElement>('.pzdoor');
    if (door) { o.onDoor(door.dataset.to!); return; }
    const pl = t.closest<HTMLElement>('.pzp');
    if (pl && pl.dataset.id !== o.me.id) { const p = players.get(pl.dataset.id!); if (p) o.onPick(p.id, p.name); return; }
    if (joyUsed) { joyUsed = false; return; }
    const r = root.getBoundingClientRect();
    tap = { x: ((e.clientX - r.left) / r.width) * PW, y: ((e.clientY - r.top) / r.height) * PH };
  });
  // 모바일 조이스틱 (왼쪽 아래 드래그)
  const joy = root.querySelector<HTMLElement>('#pzjoy')!, knob = joy.querySelector('i')!;
  let jv: { x: number; y: number } | null = null, joyUsed = false;
  const jmove = (e: PointerEvent) => {
    const r = joy.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy), max = r.width / 2;
    if (m > max) { dx = (dx / m) * max; dy = (dy / m) * max; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    jv = m > 6 ? { x: dx / max, y: dy / max } : null;
  };
  joy.addEventListener('pointerdown', (e) => { e.preventDefault(); joy.setPointerCapture(e.pointerId); joyUsed = true; tap = null; jmove(e); });
  joy.addEventListener('pointermove', (e) => { if (joy.hasPointerCapture(e.pointerId)) jmove(e); });
  const jend = () => { jv = null; knob.style.transform = ''; };
  joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
  // 루프
  let last = performance.now(), lastSend = 0, sentX = -1, sentY = -1, raf = 0, alive = true;
  const place = (p: P) => {
    p.el.style.left = `${(p.x / PW) * 100}%`; p.el.style.top = `${(p.y / PH) * 100}%`; p.el.style.zIndex = String(Math.round(p.y * 10));
    p.el.classList.toggle('flip', p.f < 0); p.el.classList.toggle('walk', p.moving);
  };
  function frame(now: number) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let vx = (keys.R ? 1 : 0) - (keys.L ? 1 : 0), vy = (keys.D ? 1 : 0) - (keys.U ? 1 : 0);
    if (jv) { vx = jv.x; vy = jv.y; }
    if (!vx && !vy && tap) { const dx = tap.x - me.x, dy = tap.y - me.y, d = Math.hypot(dx, dy); if (d < 0.6) tap = null; else { vx = dx / d; vy = dy / d; } }
    const m = Math.hypot(vx, vy);
    me.moving = m > 0.01;
    if (me.moving) {
      const sp = 24 / Math.max(1, m);
      const nx = me.x + vx * sp * dt, ny = me.y + vy * sp * dt * 0.8;
      if (!blocked(nx, me.y)) me.x = nx; else if (tap) tap = null;
      if (!blocked(me.x, ny)) me.y = ny; else if (tap) tap = null;
      if (Math.abs(vx) > 0.1) me.f = vx > 0 ? 1 : -1;
    }
    place(me);
    // 문 근처
    const d = DOORS.find((x) => Math.abs(me.x - x.x) < 6 && me.y < WALL_Y + 5);
    if (d !== near) { near = d ?? null; root.querySelectorAll<HTMLElement>('.pzdoor').forEach((b) => b.classList.toggle('show', b.dataset.to === near?.to)); }
    // 위치 보내기 (움직일 때 초당 10번, 멈추면 한 번)
    if (now - lastSend > 100 && (Math.abs(me.x - sentX) > 0.05 || Math.abs(me.y - sentY) > 0.05)) {
      lastSend = now; sentX = me.x; sentY = me.y;
      o.send('mv', { id: o.me.id, x: +me.x.toFixed(2), y: +me.y.toFixed(2), f: me.f, m: me.moving });
    }
    // 다른 사람 보간
    for (const p of players.values()) {
      if (p === me) continue;
      const dx = p.tx - p.x, dy = p.ty - p.y;
      p.x += dx * Math.min(1, dt * 10); p.y += dy * Math.min(1, dt * 10);
      p.moving = Math.hypot(dx, dy) > 0.15 || (now - p.seen < 200 && p.moving);
      place(p);
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  root.focus({ preventScroll: true });
  const bubble = (p: P, text: string, emo = false) => {
    p.el.querySelector(emo ? '.pzemo' : '.pzsay')?.remove();
    const b = document.createElement('div'); b.className = emo ? 'pzemo' : 'pzsay'; b.textContent = text;
    p.el.appendChild(b);
    if (emo && text === '💃') { p.el.classList.add('dance'); setTimeout(() => p.el.classList.remove('dance'), 2200); }
    setTimeout(() => b.remove(), emo ? 2200 : 4500);
  };
  return {
    me: () => ({ x: me.x, y: me.y }),
    /** 접속자 목록 갱신 (새로 온 사람에게 내 위치 다시 알림) */
    sync(list: { id: string; name: string; av: unknown; title?: string | null; x: number; y: number }[]) {
      const ids = new Set(list.map((x) => x.id));
      let fresh = false;
      for (const m of list) {
        if (m.id === o.me.id) continue;
        const p = players.get(m.id);
        if (!p) { mk(m.id, m.name, m.av as AvatarState, m.title, m.x, m.y); fresh = true; }
        else if (JSON.stringify(p.av) !== JSON.stringify(m.av) || p.title !== m.title) { p.av = m.av as AvatarState; p.title = m.title; p.el.querySelector('.pzfig')!.innerHTML = h.figure(p.av, p.name, p.title); }
      }
      for (const [id, p] of players) if (id !== o.me.id && !ids.has(id)) { p.el.remove(); players.delete(id); }
      if (fresh) o.send('mv', { id: o.me.id, x: +me.x.toFixed(2), y: +me.y.toFixed(2), f: me.f, m: false });
      return players.size;
    },
    msg(ev: string, p: any) {
      const pl = players.get(String(p?.id ?? ''));
      if (!pl) return;
      if (ev === 'mv' && Number.isFinite(p.x) && Number.isFinite(p.y)) { pl.tx = Math.max(0, Math.min(PW, p.x)); pl.ty = Math.max(0, Math.min(PH, p.y)); pl.f = p.f < 0 ? -1 : 1; pl.moving = !!p.m; pl.seen = performance.now(); }
      else if (ev === 'say' && typeof p.text === 'string') { const t = p.text.slice(0, 60); bubble(pl, t); o.onLog(`${pl.name}: ${t}`); }
      else if (ev === 'emo' && EMOTES.includes(p.e)) bubble(pl, p.e, true);
    },
    say(text: string) { bubble(me, text); },
    emote(e: string) { bubble(me, e, true); },
    updateMe(av: AvatarState, title?: string | null) { me.av = av; me.title = title; me.el.querySelector('.pzfig')!.innerHTML = h.figure(av, o.me.name, title); },
    stop() { alive = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); host.innerHTML = ''; },
  };
}
export type PlazaRun = ReturnType<typeof mountPlaza>;
