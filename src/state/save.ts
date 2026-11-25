import { migrate, type GameState } from './game';

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

export const remoteReady = () => !!docRef;

export async function loadGame(): Promise<GameState | null> {
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

export function saveGame(s: GameState) {
  const json = JSON.stringify(s);
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
  try { localStorage.removeItem(LS_KEY); } catch { /* 무시 */ }
  if (docRef) { try { await docRef.delete(); } catch { /* 무시 */ } }
}
