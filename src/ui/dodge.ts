/** 4인 레이드 회피 타임 (빙결 군주 「절대영도」): 8초 동안 직접 캐릭터를 움직여 얼음을 피함
 *  패턴은 방장이 정한 시드로 모두 같게, 판정은 각자 화면에서 → 맞은 횟수만 방장에게 보냄 */

export interface DodgePlayer { owner: string; name: string; icon: string }
export interface DodgeOpts {
  host: HTMLElement; seed: number; level: number; me: string; players: DodgePlayer[];
  onPos: (p: { x: number; y: number; d: boolean; h: number }) => void;
  onEnd: (hits: number) => void;
}
export interface DodgeRun { ghost: (owner: string, p: { x: number; y: number; d: boolean; h: number }) => void; stop: () => void }

export const DODGE_SEC = 8;
const COUNT_SEC = 3;
const W = 100, GROUND = 82; // 가로 0~100, 바닥 높이(%)
const PX = 0.5625; // 세로 1% = 가로 0.5625 (16:9)
type Ob = { t: number; kind: 'low' | 'high' | 'fall'; x: number; speed: number; id: number };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** 시드·단계로 얼음 패턴 생성 (모두 같은 결과) */
export function dodgePattern(seed: number, level: number): Ob[] {
  const r = rng(seed);
  const out: Ob[] = [];
  let t = 0.4, id = 0;
  const lv = Math.max(1, Math.min(4, level));
  while (t < DODGE_SEC - 0.6) {
    const late = t / DODGE_SEC;
    const roll = r();
    const kind: Ob['kind'] = roll < 0.4 ? 'low' : roll < 0.75 ? 'high' : 'fall';
    const speed = (62 + lv * 8) * (1 + late * 0.35); // 초당 가로 이동
    out.push({ t, kind, x: kind === 'fall' ? 8 + r() * 34 : W + 4, speed, id: id++ });
    // 마지막 구간엔 높은 것·낮은 것이 짧은 간격으로 섞여 옴
    t += Math.max(0.36, (0.95 - lv * 0.09) * (1 - late * 0.4) + r() * 0.25);
  }
  return out;
}

export function startDodge(o: DodgeOpts): DodgeRun {
  const pat = dodgePattern(o.seed, o.level);
  const meP = o.players.find((p) => p.owner === o.me);
  const root = document.createElement('div');
  root.className = 'dodge';
  root.innerHTML = `<div class="dg-sky"></div><div class="dg-ground"></div>
    <div class="dg-title">❄ 절대영도 ❄</div>
    <div class="dg-help">${meP ? '<b>↑ / Space</b> 점프 · <b>↓</b> 숙이기 · <b>← →</b> 이동' : '관전 중'}</div>
    <div class="dg-count" id="dgc"></div><div class="dg-timer"><i id="dgt"></i></div>
    <div class="dg-field" id="dgf"></div>
    ${meP ? `<div class="dg-pad"><div><button data-k="L" aria-label="왼쪽">◀</button><button data-k="R" aria-label="오른쪽">▶</button></div><div><button data-k="D" aria-label="숙이기">숙이기</button><button data-k="U" aria-label="점프">점프</button></div></div>` : ''}`;
  o.host.appendChild(root);
  const field = root.querySelector<HTMLElement>('#dgf')!;
  const mk = (cls: string, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; field.appendChild(d); return d; };
  // 캐릭터: 나는 진하게, 다른 사람은 반투명
  const others = new Map<string, { el: HTMLElement; x: number; y: number; d: boolean; tx: number; ty: number }>();
  o.players.forEach((p, i) => {
    if (p.owner === o.me) return;
    const el = mk('dg-pl ghost', `<div class="dg-spr">${p.icon}</div><span>${p.name}</span>`);
    others.set(p.owner, { el, x: 14 + i * 7, y: 0, d: false, tx: 14 + i * 7, ty: 0 });
  });
  const meEl = meP ? mk('dg-pl me', `<div class="dg-spr">${meP.icon}</div><span>${meP.name}</span>`) : null;
  const obEl = new Map<number, HTMLElement>();
  // 내 상태
  let x = 20, y = 0, vy = 0, duck = false, hits = 0, inv = 0;
  const keys = { L: false, R: false, U: false, D: false };
  const keyMap: Record<string, keyof typeof keys> = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R', ArrowUp: 'U', w: 'U', W: 'U', ' ': 'U', ArrowDown: 'D', s: 'D', S: 'D' };
  const kd = (e: KeyboardEvent) => { const k = keyMap[e.key]; if (!k || !meP) return; e.preventDefault(); keys[k] = true; };
  const ku = (e: KeyboardEvent) => { const k = keyMap[e.key]; if (!k) return; keys[k] = false; };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  root.querySelectorAll<HTMLButtonElement>('.dg-pad button').forEach((b) => {
    const k = b.dataset.k as keyof typeof keys;
    const on = (v: boolean) => (e: Event) => { e.preventDefault(); keys[k] = v; b.classList.toggle('on', v); };
    b.addEventListener('pointerdown', on(true)); b.addEventListener('pointerup', on(false)); b.addEventListener('pointerleave', on(false)); b.addEventListener('pointercancel', on(false));
  });
  const t0 = performance.now() + COUNT_SEC * 1000;
  let last = performance.now(), lastSend = 0, raf = 0, done = false;
  const countEl = root.querySelector<HTMLElement>('#dgc')!, timerEl = root.querySelector<HTMLElement>('#dgt')!;
  const place = (el: HTMLElement, px: number, py: number, d: boolean) => { el.style.left = `${px}%`; el.style.top = `${GROUND - py / PX}%`; el.classList.toggle('duck', d); };
  const ouch = () => {
    if (!meEl) return;
    meEl.classList.add('hit'); setTimeout(() => meEl.classList.remove('hit'), 300);
    const s = document.createElement('div'); s.className = 'dg-ouch'; s.textContent = ['아야!', '으악!', '차가워!'][hits % 3]; meEl.appendChild(s);
    setTimeout(() => s.remove(), 700);
    root.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(4px,-2px)' }, { transform: 'translate(0,0)' }], { duration: 160 });
  };
  function frame(now: number) {
    if (done) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    if (t < 0) { countEl.textContent = String(Math.ceil(-t)); countEl.style.display = ''; }
    else countEl.style.display = 'none';
    timerEl.style.width = `${Math.max(0, Math.min(100, (1 - t / DODGE_SEC) * 100))}%`;
    // 이동 (카운트다운 중에도 연습 가능)
    if (meP) {
      duck = keys.D && y <= 0.01;
      const sp = duck ? 22 : 40;
      if (keys.L) x -= sp * dt;
      if (keys.R) x += sp * dt;
      x = Math.max(4, Math.min(46, x));
      if (keys.U && y <= 0.01 && vy <= 0) vy = 60;
      vy -= 175 * dt; y = Math.max(0, y + vy * dt);
      if (y === 0 && vy < 0) vy = 0;
      inv = Math.max(0, inv - dt);
      place(meEl!, x, y, duck);
      meEl!.classList.toggle('inv', inv > 0);
      if (now - lastSend > 90) { lastSend = now; o.onPos({ x: +x.toFixed(1), y: +y.toFixed(1), d: duck, h: hits }); }
    }
    for (const g of others.values()) { g.x += (g.tx - g.x) * Math.min(1, dt * 12); g.y += (g.ty - g.y) * Math.min(1, dt * 12); place(g.el, g.x, g.y, g.d); }
    // 얼음
    for (const ob of pat) {
      const age = t - ob.t;
      let el = obEl.get(ob.id);
      if (age < (ob.kind === 'fall' ? -0.9 : 0) || age > 3) { if (el && age > 3) { el.remove(); obEl.delete(ob.id); } continue; }
      if (!el) { el = mk(`dg-ob ${ob.kind}`); obEl.set(ob.id, el); }
      let ox: number, oyBot: number, oyTop: number, ow: number, active: boolean;
      if (ob.kind === 'fall') {
        // 경고 0.9초 → 떨어짐 0.25초 → 바닥에 0.35초 박힘
        ox = ob.x; ow = 8; active = age >= 0.2 && age < 0.6;
        const fallY = age < 0 ? 70 : Math.max(0, 70 - (age / 0.25) * 70);
        oyBot = fallY; oyTop = fallY + 24;
        if (!el.firstChild) el.innerHTML = '<i class="mark"></i><i class="ice"></i>';
        el.classList.toggle('warn', age < 0);
        el.style.left = `${ox}%`; el.style.top = `${GROUND}%`;
        (el.lastChild as HTMLElement).style.transform = `translate(-50%, ${-(fallY / PX) * field.clientHeight / 100}px) translateY(-100%)`;
        if (age > 0.9) el.style.opacity = '0';
      } else {
        ox = ob.x - ob.speed * age; ow = ob.kind === 'low' ? 5 : 7; active = true;
        oyBot = ob.kind === 'low' ? 0 : 6.5; oyTop = ob.kind === 'low' ? 4.5 : 11;
        el.style.left = `${ox}%`; el.style.top = `${GROUND - oyTop / PX}%`;
        if (ox < -10) el.style.opacity = '0';
      }
      // 판정 (회피 시간 중에만)
      if (meP && t >= 0 && t <= DODGE_SEC && active && inv <= 0) {
        const pw = 4.4, ph = duck ? 5 : 10.5;
        const overlapX = Math.abs(ox - x) < (ow + pw) / 2;
        const overlapY = y < oyTop && y + ph > oyBot;
        if (overlapX && overlapY) { hits++; inv = 0.7; ouch(); }
      }
    }
    if (t >= DODGE_SEC + 0.3) return finish();
    raf = requestAnimationFrame(frame);
  }
  function finish() {
    if (done) return;
    done = true; cancelAnimationFrame(raf);
    const res = document.createElement('div'); res.className = `dg-result ${hits ? '' : 'perfect'}`;
    res.innerHTML = meP ? (hits ? `${hits}번 맞았어요 <span>(최대 HP ${Math.min(6, hits) * 35}%)</span>` : '완벽 회피! ✨') : '회피 타임 종료';
    root.appendChild(res);
    if (meP) o.onEnd(hits);
    setTimeout(() => stop(), 1400);
  }
  function stop() {
    done = true; cancelAnimationFrame(raf);
    window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    root.remove();
  }
  raf = requestAnimationFrame(frame);
  return {
    ghost(owner, p) { const g = others.get(owner); if (!g) return; g.tx = p.x; g.ty = p.y; g.d = p.d; if (p.h > Number(g.el.dataset.h ?? 0)) { g.el.dataset.h = String(p.h); g.el.classList.add('hit'); setTimeout(() => g.el.classList.remove('hit'), 300); } },
    stop,
  };
}
