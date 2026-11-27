import { migrate, statePower, type GameState } from './game';
import { CLOUD, initSession, loadCloud, pushRank, saveCloud, session } from '../net/cloud';

/**
 * 저장: 아티팩트 db(계정별 비공개 문서)가 있으면 거기에, 항상 localStorage에도.
 * db 경로: data/users/<id>/saves/main
 */
const LS_KEY = 'text-rpg-save-v1';
let db: any = null;
let docRef: any = null;
let writing = false;
let pending: GameState | null = null;

export async function initRemote(): Promise<void> {
  if (CLOUD) { try { await initSession(); } catch { /* 오프라인 */ } return; }
  try {
    const c = (window as any).claude;
    if (!c?.use) return;
    const [d, u] = await Promise.all([c.use('db'), c.use('user')]);
    if (!d || !u) return;
    const id = await u.id();
    if (!id) return;
    db = d;
    docRef = db.collection(`data/users/${id}/saves`).doc('main');
  } catch {
    db = null;
  }
}

export const remoteReady = () => (CLOUD ? !!session : !!docRef);

export async function loadGame(): Promise<GameState | null> {
  if (CLOUD) {
    if (!session) return null;
    let cloud: GameState | null = null;
    try { const c = await loadCloud(); if (c) cloud = migrate(JSON.parse(c.json)); } catch { /* 무시 */ }
    let local: GameState | null = null;
    try { const raw = localStorage.getItem(`${LS_KEY}-${session.user.id}`) ?? (cloud ? null : localStorage.getItem(LS_KEY)); if (raw) local = migrate(JSON.parse(raw)); } catch { /* 무시 */ }
    const pick = cloud && local ? (local.day > cloud.day ? local : cloud) : cloud ?? local;
    if (pick && pick !== cloud) saveGame(pick); // 첫 로그인: 기존 기기 세이브를 서버로 옮김
    return pick;
  }
  let remote: GameState | null = null;
  if (docRef) {
    try {
      const snap = await Promise.race([docRef.get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]);
      const data = (snap as any)?.data?.() ?? (snap as any)?.data ?? null;
      if (data?.json) remote = migrate(JSON.parse(data.json));
    } catch { /* 로컬로 진행 */ }
  }
  let local: GameState | null = null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) local = migrate(JSON.parse(raw));
  } catch { /* 저장소 없음 */ }
  if (remote && local) return (local.day > remote.day ? local : remote);
  return remote ?? local;
}

let cloudTimer = 0;
let cloudWrite = Promise.resolve(true);
function queueCloudSave(s: GameState, json: string, owner: string, rank = false) {
  const power = statePower(s);
  const day = s.day;
  const scores = { power, tower_best: s.tower?.best ?? 0, raid_best: s.raid?.best ?? 0, raid_week: s.raid?.week ?? 0, max_floor: s.maxFloor };
  cloudWrite = cloudWrite.then(async () => {
    if (session?.user.id !== owner) return false;
    const saved = await saveCloud(JSON.parse(json), day, power);
    if (saved && rank && session?.user.id === owner) void pushRank(scores).catch(() => {});
    return saved;
  }).catch(() => false);
  return cloudWrite;
}
export let cloudStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
export function saveGame(s: GameState) {
  const json = JSON.stringify(s);
  if (CLOUD) {
    if (!session) return;
    const owner = session.user.id;
    try { localStorage.setItem(`${LS_KEY}-${owner}`, json); } catch { /* 무시 */ }
    clearTimeout(cloudTimer);
    cloudTimer = window.setTimeout(async () => {
      cloudStatus = 'saving';
      cloudStatus = (await queueCloudSave(s, json, owner, true)) ? 'saved' : 'error';
    }, 1200);
    return;
  }
  try { localStorage.setItem(LS_KEY, json); } catch { /* 무시 */ }
  if (!docRef) return;
  pending = s;
  flush();
}

async function flush() {
  if (writing || !pending) return;
  writing = true;
  const s = pending;
  pending = null;
  try {
    await docRef.set({ json: JSON.stringify(s), day: s.day, savedAt: Date.now() });
  } catch { /* 다음 저장에서 재시도 */ }
  writing = false;
  if (pending) setTimeout(flush, 500);
}

export function exportSave(s: GameState) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
}
export function importSave(code: string): GameState | null {
  try { return migrate(JSON.parse(decodeURIComponent(escape(atob(code.trim()))))); } catch { return null; }
}

export async function wipeSave() {
  try { localStorage.removeItem(CLOUD && session ? `${LS_KEY}-${session.user.id}` : LS_KEY); } catch { /* 무시 */ }
  if (docRef) { try { await docRef.delete(); } catch { /* 무시 */ } }
}

/** 바로 서버에 저장 (서버가 세이브를 읽어야 할 때) */
export async function saveGameNow(s: GameState): Promise<boolean> {
  if (!CLOUD || !session) return false;
  clearTimeout(cloudTimer);
  const owner = session.user.id;
  const json = JSON.stringify(s);
  try { localStorage.setItem(`${LS_KEY}-${owner}`, json); } catch { /* 무시 */ }
  return queueCloudSave(s, json, owner);
}
