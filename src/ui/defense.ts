/** 랜덤 디펜스 화면: 캔버스에 판·적·이펙트를 그리고, 내 판 클릭을 칸 번호로 넘겨줌 */
import { charSprite } from './pixel';
import { D_COLS, D_ROWS, D_SLOTS, dSize, enemyXY, slotXY, type DState } from '../core/defense';
import { JOBS } from '../data/jobs';

const GRADE_COL = ['', '#9aa4b0', '#5ae07a', '#4ac0ff', '#b07aff', '#ffb02a'];
const JOB_FX: Record<string, string> = { warrior: '#ff8050', mage: '#b080ff', archer: '#80f080', priest: '#ffe680' };
const imgs = new Map<string, HTMLImageElement>();
function unitImg(name: string, jobId: string): HTMLImageElement {
  const k = `${name}|${jobId}`;
  let im = imgs.get(k);
  if (!im) {
    const j = JOBS[jobId as keyof typeof JOBS];
    const svg = charSprite(j?.base ?? 'warrior', name, j?.tier ?? 1, { size: 64 }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    imgs.set(k, im);
  }
  return im;
}

export interface DefView { stop: () => void }
export function mountDefense(host: HTMLCanvasElement, get: () => { st: DState | null; me: string; sel: number[] }, onCell: (slot: number) => void): DefView {
  const ctx = host.getContext('2d')!;
  let raf = 0, alive = true;
  const cellPx = () => { const st = get().st; if (!st) return 40; const { w } = dSize(st.players.length); return host.clientWidth / w; };
  const resize = () => {
    const st = get().st; if (!st) return;
    const { w, h } = dSize(st.players.length);
    const avail = host.parentElement?.clientWidth || 600;
    const cw = Math.min(avail, w * 72);
    host.style.width = `${cw}px`;
    host.style.height = `${(cw / w) * h}px`;
    const dpr = window.devicePixelRatio || 1;
    host.width = cw * dpr; host.height = (cw / w) * h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  };
  host.addEventListener('click', (ev) => {
    const { st, me } = get(); if (!st) return;
    const r = host.getBoundingClientRect(), c = cellPx();
    const x = (ev.clientX - r.left) / c, y = (ev.clientY - r.top) / c;
    const p = st.players.findIndex((q) => q.id === me);
    const col = Math.floor(x - 1 - p * (D_COLS + 1)), row = Math.floor(y - 1);
    if (col < 0 || col >= D_COLS || row < 0 || row >= D_ROWS) return;
    onCell(row * D_COLS + col);
  });
  window.addEventListener('resize', resize);
  let lastW = 0;
  const draw = () => {
    if (!alive) return;
    raf = requestAnimationFrame(draw);
    const { st, me, sel } = get(); if (!st) return;
    const pw = host.parentElement?.clientWidth ?? 0;
    if (pw !== lastW) { lastW = pw; resize(); }
    const c = cellPx(), { w, h } = dSize(st.players.length);
    ctx.clearRect(0, 0, w * c, h * c);
    // 길
    ctx.fillStyle = '#2a2018'; ctx.fillRect(0, 0, w * c, h * c);
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(0, 0, w * c, c); ctx.fillRect(0, (h - 1) * c, w * c, c); ctx.fillRect(0, 0, c, h * c); ctx.fillRect((w - 1) * c, 0, c, h * c);
    // 판
    st.players.forEach((p, i) => {
      const x0 = (1 + i * (D_COLS + 1)) * c, y0 = c;
      ctx.fillStyle = p.id === me ? '#26324a' : '#2a2a34';
      ctx.fillRect(x0, y0, D_COLS * c, D_ROWS * c);
      ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 1;
      for (let s = 0; s < D_SLOTS; s++) ctx.strokeRect(x0 + (s % D_COLS) * c + 0.5, y0 + Math.floor(s / D_COLS) * c + 0.5, c - 1, c - 1);
      ctx.fillStyle = '#ffffffaa'; ctx.font = `${Math.max(10, c * 0.28)}px sans-serif`; ctx.textAlign = 'left';
      ctx.fillText(p.name, x0 + 3, y0 + D_ROWS * c - 4);
    });
    // 단원
    for (const u of st.units) {
      const pl = st.players.find((p) => p.id === u.owner); const d = pl?.pool.find((x) => x.key === u.key); if (!d) continue;
      const { x, y } = slotXY(st, u.owner, u.slot);
      const px = (x - 0.5) * c, py = (y - 0.5) * c;
      ctx.fillStyle = GRADE_COL[d.grade] + '40'; ctx.fillRect(px + 2, py + 2, c - 4, c - 4);
      if (sel.includes(u.id)) { ctx.strokeStyle = '#ffd95e'; ctx.lineWidth = 3; ctx.strokeRect(px + 2, py + 2, c - 4, c - 4); }
      const im = unitImg(d.name, d.jobId);
      if (im.complete) ctx.drawImage(im, px + c * 0.1, py + c * 0.05, c * 0.8, c * 0.8);
      ctx.fillStyle = '#ffd95e'; ctx.font = `bold ${Math.max(9, c * 0.24)}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('★'.repeat(u.star), px + c / 2, py + c - 3);
    }
    // 적
    for (const e of st.enemies) {
      const { x, y } = enemyXY(st, e.d);
      const r = (e.boss ? 0.42 : 0.17) * c;
      ctx.fillStyle = e.boss ? '#c02040' : e.stun > st.t ? '#a0a0ff' : e.slow > st.t ? '#7ab0d0' : '#d05a3a';
      ctx.beginPath(); ctx.arc(x * c, y * c, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000a'; ctx.fillRect(x * c - r, y * c - r - 5, r * 2, 3);
      ctx.fillStyle = '#6f6'; ctx.fillRect(x * c - r, y * c - r - 5, r * 2 * Math.max(0, e.hp / e.max), 3);
    }
    // 이펙트
    for (const f of st.fx) {
      const a = Math.max(0, 1 - (st.t - f.t) / 0.4);
      ctx.globalAlpha = a;
      if (f.k === 'shot' && f.x2 !== undefined) { ctx.strokeStyle = JOB_FX[f.b ?? 'warrior']; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x * c, f.y * c); ctx.lineTo(f.x2 * c, f.y2! * c); ctx.stroke(); }
      if (f.k === 'aoe') { ctx.fillStyle = '#b080ff55'; ctx.beginPath(); ctx.arc(f.x * c, f.y * c, (f.x2 ?? 1) * c, 0, Math.PI * 2); ctx.fill(); }
      if (f.k === 'sum' || f.k === 'merge') { ctx.strokeStyle = f.k === 'merge' ? '#ffd95e' : '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x * c, f.y * c, c * (0.5 + (1 - a) * 0.4), 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  };
  resize(); draw();
  return { stop: () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); } };
}
