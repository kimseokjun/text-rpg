// 배경음악: 브라우저에서 바로 합성 (음원 파일 없음)
// town: 마왕성 아래 마을 — 무섭고 잔잔하게 (드론 · 오르간 패드 · 오르골 · 바람)
// battle: 던전·결투·레이드 — 무섭고 웅장하게 (팀파니 · 현 오스티나토 · 합창 · 금관)

export type Scene = 'off' | 'town' | 'battle' | 'raid';
const KEY = 'rpg-bgm';
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

let ctx: AudioContext | null = null;
let master: GainNode, verb: ConvolverNode, verbIn: GainNode, noiseBuf: AudioBuffer;
let cur: Track | null = null;
let want: Scene = 'off';
let timer: number | null = null;
const pref = (() => { try { return { on: false, vol: 0.6, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } as { on: boolean; vol: number }; } catch { return { on: false, vol: 0.6 }; } })();
const savePref = () => { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch { /* 저장 안 돼도 무시 */ } };

function init() {
  if (ctx) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 4;
  master = ctx.createGain(); master.gain.value = pref.vol * 0.55;
  master.connect(comp).connect(ctx.destination);
  // 잔향: 지수 감쇠 노이즈로 만든 성당 같은 울림
  verb = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 4.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  verb.buffer = ir;
  verbIn = ctx.createGain(); verbIn.gain.value = 0.9;
  verbIn.connect(verb).connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) void ctx.suspend(); else if (pref.on) void ctx.resume(); });
}

// ───────── 소리 재료 ─────────
interface Out { dry: AudioNode; wet: AudioNode }
interface ToneOpt { type?: OscillatorType; gain: number; a?: number; r?: number; cut?: number; cutEnd?: number; q?: number; detune?: number; wet?: number; bend?: number }
function tone(o: Out, t: number, freq: number, dur: number, p: ToneOpt) {
  const c = ctx!;
  const osc = c.createOscillator(); osc.type = p.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (p.bend) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * p.bend), t + Math.min(dur, 0.5));
  if (p.detune) osc.detune.value = p.detune;
  const g = c.createGain(), a = p.a ?? 0.01, r = p.r ?? 0.2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(p.gain, t + a);
  g.gain.setValueAtTime(p.gain, t + Math.max(a, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, dur) + r);
  let node: AudioNode = osc;
  if (p.cut) {
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(p.cut, t); f.Q.value = p.q ?? 0.7;
    if (p.cutEnd) f.frequency.exponentialRampToValueAtTime(p.cutEnd, t + Math.max(a, dur) + r);
    osc.connect(f); node = f;
  }
  node.connect(g); g.connect(o.dry);
  if (p.wet) { const s = c.createGain(); s.gain.value = p.wet; g.connect(s).connect(o.wet); }
  osc.start(t); osc.stop(t + Math.max(a, dur) + r + 0.05);
}
function noise(o: Out, t: number, dur: number, p: { gain: number; type: BiquadFilterType; f: number; fEnd?: number; q?: number; a?: number; wet?: number }) {
  const c = ctx!;
  const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = c.createBiquadFilter(); f.type = p.type; f.frequency.setValueAtTime(p.f, t); f.Q.value = p.q ?? 1;
  if (p.fEnd) f.frequency.exponentialRampToValueAtTime(p.fEnd, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(p.gain, t + (p.a ?? 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(o.dry);
  if (p.wet) { const s = c.createGain(); s.gain.value = p.wet; g.connect(s).connect(o.wet); }
  src.start(t, Math.random()); src.stop(t + dur + 0.05);
}
/** 합창 '아—': 톱니파 여러 개를 모음 포먼트 대역으로 거름 */
function choir(o: Out, t: number, notes: number[], dur: number, gain: number) {
  const c = ctx!;
  const bus = c.createGain(); bus.gain.setValueAtTime(0.0001, t); bus.gain.linearRampToValueAtTime(gain, t + 0.9); bus.gain.setValueAtTime(gain, t + dur); bus.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.4);
  const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 650; f1.Q.value = 4;
  const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1100; f2.Q.value = 5;
  const mix = c.createGain(); mix.gain.value = 1;
  bus.connect(f1).connect(mix); bus.connect(f2).connect(mix);
  mix.connect(o.dry); const s = c.createGain(); s.gain.value = 1.1; mix.connect(s).connect(o.wet);
  for (const m of notes) for (const d of [-9, 0, 8]) {
    const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = hz(m); osc.detune.value = d;
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 4.6 + Math.random(); vg.gain.value = 5; vib.connect(vg).connect(osc.detune);
    osc.connect(bus); osc.start(t); vib.start(t); osc.stop(t + dur + 1.5); vib.stop(t + dur + 1.5);
  }
}

// ───────── 곡 ─────────
interface Track { bpm: number; bars: number; out: Out; gain: ReturnType<typeof makeOut>['gain']; step(i: number, t: number): void; held: AudioScheduledSourceNode[]; next: number; idx: number }

function makeOut(): { gain: { gain: { value: number; setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void; cancelScheduledValues(t: number): void }; disconnect(): void }; out: Out } {
  const c = ctx!;
  // 곡 페이드: 원음·잔향 보내기 둘 다에 같은 음량 곡선
  const fd = c.createGain(), fw = c.createGain();
  fd.gain.value = fw.gain.value = 0.0001;
  fd.connect(master); fw.connect(verbIn);
  const dry = c.createGain(), wet = c.createGain();
  dry.connect(fd); wet.connect(fw);
  const both = [fd.gain, fw.gain];
  const gain = {
    gain: {
      get value() { return fd.gain.value; },
      setValueAtTime: (v: number, t: number) => both.forEach((g) => g.setValueAtTime(v, t)),
      exponentialRampToValueAtTime: (v: number, t: number) => both.forEach((g) => g.exponentialRampToValueAtTime(v, t)),
      cancelScheduledValues: (t: number) => both.forEach((g) => g.cancelScheduledValues(t)),
    },
    disconnect: () => { fd.disconnect(); fw.disconnect(); },
  };
  return { gain, out: { dry, wet } };
}

/** 마을: D 단조, 느리고 텅 빈 울림 + 가끔 어긋나는 반음 */
function townTrack(): Track {
  const c = ctx!;
  const { gain, out } = makeOut();
  const held: AudioScheduledSourceNode[] = [];
  // 저음 드론 (D1·A1) + 천천히 흔들리는 필터
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 2;
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.05; lg.gain.value = 120; lfo.connect(lg).connect(lp.frequency);
  const dg = c.createGain(); dg.gain.value = 0.11; lp.connect(dg).connect(out.dry);
  for (const [m, type, d] of [[26, 'sawtooth', -6], [26, 'sawtooth', 7], [33, 'triangle', 0], [14, 'sine', 0]] as const) {
    const o = c.createOscillator(); o.type = type; o.frequency.value = hz(m); o.detune.value = d; o.connect(lp); o.start(); held.push(o);
  }
  lfo.start(); held.push(lfo);
  // 바람: 대역 노이즈가 천천히 오르내림
  const wind = c.createBufferSource(); wind.buffer = noiseBuf; wind.loop = true;
  const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 6;
  const wl = c.createOscillator(), wlg = c.createGain(); wl.frequency.value = 0.07; wlg.gain.value = 300; wl.connect(wlg).connect(wf.frequency);
  const wgn = c.createGain(); wgn.gain.value = 0.035;
  wind.connect(wf).connect(wgn).connect(out.dry); const ws = c.createGain(); ws.gain.value = 0.5; wgn.connect(ws).connect(out.wet);
  wind.start(); wl.start(); held.push(wind, wl);
  // 2마디씩: Dm · B♭ · Gm · A(♭9 섞은 불길한 딸림)
  const chords = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 55, 58]];
  const scale = [62, 64, 65, 67, 69, 70, 73, 74, 77, 81];
  const tense = [63, 70, 73]; // E♭(프리지안) · B♭ · C#
  return {
    bpm: 58, bars: 8, out, gain, held, next: 0, idx: 0,
    step(i, t) {
      const bar = Math.floor(i / 16), s = i % 16, beat = 60 / this.bpm;
      const ch = chords[Math.floor(bar / 2) % 4];
      // 오르간 패드 (2마디 길이, 천천히 차오름)
      if (s === 0 && bar % 2 === 0) for (const m of ch) {
        tone(out, t, hz(m), beat * 8, { type: 'triangle', gain: 0.035, a: 2.2, r: 2.5, cut: 900, wet: 0.8 });
        tone(out, t, hz(m + 12), beat * 8, { type: 'sine', gain: 0.018, a: 2.8, r: 2.5, detune: 6, wet: 1 });
      }
      // 오르골: 성긴 고음, 가끔 반음 어긋남
      if ((s === 0 || s === 6 || s === 10) && Math.random() < (s === 0 ? 0.85 : 0.4)) {
        const m = Math.random() < 0.14 ? tense[Math.floor(Math.random() * tense.length)] + 12 : scale[Math.floor(Math.random() * scale.length)] + 12;
        tone(out, t, hz(m), 0.05, { type: 'sine', gain: 0.05, a: 0.004, r: 2.2, wet: 1.4 });
        tone(out, t, hz(m) * 3.01, 0.02, { type: 'sine', gain: 0.008, a: 0.002, r: 0.6, wet: 1.4 });
      }
      // 아주 먼 심장 박동
      if (bar % 4 === 3 && (s === 0 || s === 3)) tone(out, t, 55, 0.08, { type: 'sine', gain: s === 0 ? 0.12 : 0.08, a: 0.005, r: 0.35, bend: 0.6, wet: 0.3 });
      // 멀리서 울리는 종 (8마디마다)
      if (i === 0) { tone(out, t, hz(38), 0.1, { type: 'sine', gain: 0.07, a: 0.003, r: 6, wet: 1.6 }); tone(out, t, hz(38) * 2.76, 0.05, { type: 'sine', gain: 0.025, a: 0.003, r: 4, wet: 1.6 }); }
    },
  };
}

/** 전투: D 화성 단조, 팀파니·현 오스티나토·합창·금관 */
function battleTrack(raid: boolean): Track {
  const { gain, out } = makeOut();
  // Dm · B♭ · Gm · A | Dm · E♭ · C#dim · A
  const roots = [38, 34, 31, 33, 38, 39, 37, 33];
  const chords = [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64], [62, 65, 69], [58, 63, 67], [61, 64, 67, 70], [57, 61, 64]];
  // 금관 선율 [마디, 16분 위치, 음, 길이(16분)]
  const mel: [number, number, number, number][] = [
    [0, 0, 69, 4], [0, 4, 74, 4], [0, 8, 77, 8],
    [1, 0, 74, 8], [1, 8, 70, 8],
    [2, 0, 67, 4], [2, 4, 70, 4], [2, 8, 74, 4], [2, 12, 72, 4],
    [3, 0, 73, 8], [3, 8, 69, 8],
    [4, 0, 69, 4], [4, 4, 74, 4], [4, 8, 77, 4], [4, 12, 81, 4],
    [5, 0, 79, 8], [5, 8, 75, 8],
    [6, 0, 76, 4], [6, 4, 73, 4], [6, 8, 70, 8],
    [7, 0, 69, 16],
  ];
  const ost = [0, 0, 12, 0, 1, 0, 7, 0];
  return {
    bpm: raid ? 96 : 86, bars: 8, out, gain, held: [], next: 0, idx: 0,
    step(i, t) {
      const bar = Math.floor(i / 16) % 8, s = i % 16, st = 60 / this.bpm / 4;
      const loop = Math.floor(i / 128);
      const r = roots[bar];
      // 큰 북 · 팀파니
      if (s === 0) { tone(out, t, hz(r - 12), 0.25, { type: 'sine', gain: 0.5, a: 0.004, r: 0.9, bend: 0.55, wet: 0.5 }); noise(out, t, 0.25, { gain: 0.12, type: 'lowpass', f: 400, wet: 0.4 }); }
      if (s === 8 || (raid && s === 11)) tone(out, t, hz(r - 12), 0.2, { type: 'sine', gain: 0.32, a: 0.004, r: 0.7, bend: 0.6, wet: 0.5 });
      if ((bar === 3 || bar === 7) && s >= 12) tone(out, t, hz(r - 12 + (s - 12)), 0.08, { type: 'sine', gain: 0.18 + 0.05 * (s - 12), a: 0.003, r: 0.25, bend: 0.7, wet: 0.4 });
      // 현 오스티나토 (8분음표)
      if (s % 2 === 0) {
        const m = r + 12 + ost[s / 2];
        tone(out, t, hz(m), st * 1.4, { type: 'sawtooth', gain: 0.05, a: 0.01, r: 0.12, cut: 1400, cutEnd: 500, wet: 0.35 });
        tone(out, t, hz(m), st * 1.4, { type: 'sawtooth', gain: 0.035, a: 0.01, r: 0.12, cut: 1200, cutEnd: 400, detune: 9, wet: 0.35 });
      }
      // 합창 (마디마다 화음, 레이드에선 한 옥타브 더 두껍게)
      if (s === 0) choir(out, t, raid ? [...chords[bar], chords[bar][0] - 12] : chords[bar], st * 15, raid ? 0.06 : 0.045);
      // 저음 금관 받침
      if (s === 0) tone(out, t, hz(r), st * 14, { type: 'sawtooth', gain: 0.06, a: 0.25, r: 0.6, cut: 380, q: 1.5, wet: 0.4 });
      // 금관 선율: 처음 한 바퀴는 쉬고 긴장만 쌓다가, 다음부터 등장
      if (loop % 2 === 1 || raid) for (const [b, p, m, len] of mel) if (b === bar && p === s) {
        const d = st * len * 0.92;
        tone(out, t, hz(m), d, { type: 'sawtooth', gain: 0.07, a: 0.06, r: 0.35, cut: 600, cutEnd: 2400, q: 2, wet: 0.7 });
        tone(out, t, hz(m - 12), d, { type: 'square', gain: 0.03, a: 0.08, r: 0.35, cut: 900, wet: 0.6 });
      }
      // 심벌 스웰 (8마디 끝)
      if (bar === 7 && s === 8) noise(out, t, st * 8, { gain: 0.07, type: 'highpass', f: 5000, a: st * 7, wet: 0.6 });
      if (bar === 0 && s === 0 && i > 0) noise(out, t, 2.2, { gain: 0.08, type: 'highpass', f: 6000, wet: 0.8 });
    },
  };
}

// ───────── 재생 제어 ─────────
function start(scene: Scene) {
  if (!ctx || scene === 'off') return;
  const tr = scene === 'town' ? townTrack() : battleTrack(scene === 'raid');
  const t = ctx.currentTime + 0.05;
  tr.gain.gain.setValueAtTime(0.0001, t);
  tr.gain.gain.exponentialRampToValueAtTime(1, t + 2.5);
  tr.next = t + 0.05; tr.idx = 0;
  cur = tr; curScene = scene;
}
function stop(tr: Track | null) {
  if (!tr || !ctx) return;
  const t = ctx.currentTime;
  tr.gain.gain.cancelScheduledValues(t);
  tr.gain.gain.setValueAtTime(Math.max(0.0001, tr.gain.gain.value), t);
  tr.gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  setTimeout(() => { for (const h of tr.held) { try { h.stop(); } catch { /* 이미 멈춤 */ } } tr.gain.disconnect(); }, 2200);
}
let curScene: Scene = 'off';
function tick() {
  if (!ctx || !cur) return;
  const ahead = ctx.currentTime + 0.25;
  while (cur.next < ahead) {
    cur.step(cur.idx % (cur.bars * 16), cur.next);
    cur.next += 60 / cur.bpm / 4; cur.idx++;
  }
}
function apply() {
  if (!pref.on) { stop(cur); cur = null; curScene = 'off'; return; }
  init();
  void ctx!.resume();
  if (want === curScene) return;
  stop(cur); cur = null; curScene = 'off';
  start(want);
  timer ??= window.setInterval(tick, 60);
}

/** 화면이 바뀔 때마다 호출 */
export function setScene(s: Scene) { if (s === want) return; want = s; if (pref.on) apply(); }
export const bgmOn = () => pref.on;
export const bgmVol = () => pref.vol;
export function toggleBgm() { pref.on = !pref.on; savePref(); apply(); return pref.on; }
export function setBgmVol(v: number) { pref.vol = Math.max(0, Math.min(1, v)); savePref(); if (ctx) master.gain.setTargetAtTime(pref.vol * 0.55, ctx.currentTime, 0.1); }
/** 브라우저는 사용자가 한 번 눌러야 소리가 남: 켜둔 상태로 새로고침했으면 첫 클릭에 시작 */
export function unlock() { if (pref.on && (!ctx || ctx.state !== 'running' || !cur)) apply(); }
