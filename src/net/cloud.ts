/** Supabase 연결 (GitHub Pages 버전에서만 켜짐: VITE_CLOUD=1) */
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://jchkcapuukwuurclchid.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_xHEkhPTXooT5HSNMTedm2g_mVTC8wAd'; // 공개용 키 (RLS로 보호)
export const CLOUD = import.meta.env.VITE_CLOUD === '1';

export const sb: SupabaseClient | null = CLOUD ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
export let session: Session | null = null;
export let username = '';

/** 아이디 → 내부 이메일 (한글 아이디도 되도록 UTF-8 16진수) */
const toEmail = (id: string) => `u${Array.from(new TextEncoder().encode(id.trim().toLowerCase())).map((b) => b.toString(16).padStart(2, '0')).join('')}@player.text-rpg.app`;
export const ID_RULE = /^[0-9A-Za-z가-힣_]{2,12}$/;

export async function initSession() {
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  session = data.session;
  username = (session?.user.user_metadata?.username as string) ?? '';
  sb.auth.onAuthStateChange((_e, s) => { session = s; username = (s?.user.user_metadata?.username as string) ?? username; });
}

function errText(m: string) {
  if (/already registered|already exists/i.test(m)) return '이미 있는 아이디예요';
  if (/invalid login credentials/i.test(m)) return '아이디나 비밀번호가 맞지 않아요';
  if (/password/i.test(m) && /6/.test(m)) return '비밀번호는 6자 이상이어야 해요';
  if (/rate limit/i.test(m)) return '잠시 후 다시 시도해주세요';
  if (/fetch|network/i.test(m)) return '서버에 연결할 수 없어요';
  return m;
}

export async function signUp(id: string, pw: string): Promise<string | null> {
  if (!sb) return '서버 없음';
  if (!ID_RULE.test(id.trim())) return '아이디는 2~12자 (한글·영문·숫자·_)';
  if (pw.length < 6) return '비밀번호는 6자 이상이어야 해요';
  const { data, error } = await sb.auth.signUp({ email: toEmail(id), password: pw, options: { data: { username: id.trim() } } });
  if (error) return errText(error.message);
  if (!data.session) return '가입은 됐는데 로그인이 안 됐어요. 로그인을 눌러주세요';
  session = data.session; username = id.trim();
  return null;
}

export async function signIn(id: string, pw: string): Promise<string | null> {
  if (!sb) return '서버 없음';
  const { data, error } = await sb.auth.signInWithPassword({ email: toEmail(id), password: pw });
  if (error) return errText(error.message);
  session = data.session; username = (data.user.user_metadata?.username as string) ?? id.trim();
  return null;
}

export async function signOut() {
  if (!sb) return;
  await sb.auth.signOut();
  session = null; username = '';
}

/** 클라우드 세이브 */
export async function loadCloud(): Promise<{ json: string; day: number; updated_at: string } | null> {
  if (!sb || !session) return null;
  const { data, error } = await sb.from('saves').select('data, day, updated_at').eq('user_id', session.user.id).maybeSingle();
  if (error || !data) return null;
  return { json: JSON.stringify(data.data), day: data.day, updated_at: data.updated_at };
}
export async function saveCloud(state: unknown, day: number, power: number): Promise<boolean> {
  if (!sb || !session) return false;
  const { error } = await sb.from('saves').upsert({ user_id: session.user.id, data: state, day, power, updated_at: new Date().toISOString() });
  return !error;
}

/** 랭킹 */
export interface RankRow { username: string; power: number; tower_best: number; raid_best: number; max_floor: number }
export type RankKind = 'tower_best' | 'power' | 'raid_best';
export async function pushRank(r: { power: number; tower_best: number; raid_best: number; raid_week: number; max_floor: number }) {
  if (!sb || !session) return;
  await sb.from('ranks').upsert({ user_id: session.user.id, ...r });
}
export async function fetchRanks(kind: RankKind, raidWeek: number): Promise<{ top: RankRow[]; mine: number | null } | null> {
  if (!sb) return null;
  let q = sb.from('ranks').select('username, power, tower_best, raid_best, max_floor').gt(kind, 0).order(kind, { ascending: false }).limit(50);
  if (kind === 'raid_best') q = q.eq('raid_week', raidWeek);
  const { data, error } = await q;
  if (error) return null;
  let mine: number | null = null;
  if (session) {
    const me = await sb.from('ranks').select('power, tower_best, raid_best, raid_week').eq('user_id', session.user.id).maybeSingle();
    const v = me.data ? (me.data as any)[kind] as number : 0;
    if (v > 0 && (kind !== 'raid_best' || me.data!.raid_week === raidWeek)) {
      let c = sb.from('ranks').select('user_id', { count: 'exact', head: true }).gt(kind, v);
      if (kind === 'raid_best') c = c.eq('raid_week', raidWeek);
      const r = await c;
      mine = (r.count ?? 0) + 1;
    }
  }
  return { top: (data ?? []) as RankRow[], mine };
}

// ───────── 채팅 ─────────
export interface ChatMsg { id: number; user_id: string; username: string; body: string; created_at: string }
let chatCh: ReturnType<SupabaseClient['channel']> | null = null;
export async function loadChat(): Promise<ChatMsg[]> {
  if (!sb || !session) return [];
  const { data } = await sb.from('chat_messages').select('id, user_id, username, body, created_at').eq('channel', 'global').order('id', { ascending: false }).limit(60);
  return ((data ?? []) as ChatMsg[]).reverse();
}
export function subscribeChat(onMsg: (m: ChatMsg) => void, onFriends: () => void) {
  if (!sb || !session || chatCh) return;
  chatCh = sb.channel('db-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (p) => onMsg(p.new as ChatMsg))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => onFriends())
    .subscribe();
}
export async function sendChat(body: string): Promise<string | null> {
  if (!sb || !session) return '로그인이 필요해요';
  const t = body.trim().slice(0, 200);
  if (!t) return null;
  const { error } = await sb.from('chat_messages').insert({ body: t, user_id: session.user.id });
  if (error) return /too fast/.test(error.message) ? '너무 빨라요. 잠깐 쉬었다 보내주세요' : '전송 실패';
  return null;
}

// ───────── 접속 중 (presence) ─────────
let presCh: ReturnType<SupabaseClient['channel']> | null = null;
export let online: Record<string, string> = {}; // user_id → username
export function joinPresence(onChange: () => void) {
  if (!sb || !session || presCh) return;
  presCh = sb.channel('online', { config: { presence: { key: session.user.id } } });
  presCh.on('presence', { event: 'sync' }, () => {
    const st = presCh!.presenceState() as Record<string, { username?: string }[]>;
    online = Object.fromEntries(Object.entries(st).map(([k, v]) => [k, v[0]?.username ?? '']));
    onChange();
  }).subscribe(async (status) => { if (status === 'SUBSCRIBED') await presCh!.track({ username }); });
}
export function leaveRealtime() {
  if (!sb) return;
  if (chatCh) { sb.removeChannel(chatCh); chatCh = null; }
  if (presCh) { sb.removeChannel(presCh); presCh = null; }
  online = {};
}

// ───────── 친구 ─────────
export interface Friend { id: number; other: string; username: string; status: 'pending' | 'accepted'; incoming: boolean; power: number; tower_best: number }
export async function loadFriends(): Promise<Friend[]> {
  if (!sb || !session) return [];
  const me = session.user.id;
  const { data } = await sb.from('friendships').select('id, requester, addressee, status');
  const rows = (data ?? []) as { id: number; requester: string; addressee: string; status: 'pending' | 'accepted' }[];
  const ids = rows.map((r) => (r.requester === me ? r.addressee : r.requester));
  if (!ids.length) return [];
  const [p, rk] = await Promise.all([
    sb.from('profiles').select('id, username').in('id', ids),
    sb.from('ranks').select('user_id, power, tower_best').in('user_id', ids),
  ]);
  const name = Object.fromEntries(((p.data ?? []) as { id: string; username: string }[]).map((x) => [x.id, x.username]));
  const rr = Object.fromEntries(((rk.data ?? []) as { user_id: string; power: number; tower_best: number }[]).map((x) => [x.user_id, x]));
  return rows.map((r) => { const o = r.requester === me ? r.addressee : r.requester; return { id: r.id, other: o, username: name[o] ?? '?', status: r.status, incoming: r.addressee === me, power: rr[o]?.power ?? 0, tower_best: rr[o]?.tower_best ?? 0 }; });
}
export async function requestFriend(name: string): Promise<string | null> {
  if (!sb || !session) return '로그인이 필요해요';
  const { data } = await sb.from('profiles').select('id').eq('username', name.trim()).maybeSingle();
  if (!data) return '그런 아이디가 없어요';
  if (data.id === session.user.id) return '자기 자신은 추가할 수 없어요';
  const { error } = await sb.from('friendships').insert({ requester: session.user.id, addressee: data.id });
  if (error) return /duplicate|unique/i.test(error.message) ? '이미 친구이거나 요청 중이에요' : '요청 실패';
  return null;
}
export async function acceptFriend(id: number) { if (sb) await sb.from('friendships').update({ status: 'accepted' }).eq('id', id); }
export async function removeFriend(id: number) { if (sb) await sb.from('friendships').delete().eq('id', id); }

// ───────── 월드보스 ─────────
export interface WBBoss { season: number; max_hp: number; hp: number; started_at: string; killed_at: string | null; killer: string | null }
export interface WBRank { user_id: string; username: string; total: number; hits: number }
export async function wbStatus(season: number, today: string) {
  if (!sb || !session) return null;
  const me = session.user.id;
  const [b, top, mine, used, prevB] = await Promise.all([
    sb.from('worldboss').select('*').eq('season', season).maybeSingle(),
    sb.from('worldboss_rank').select('user_id, username, total, hits').eq('season', season).order('total', { ascending: false }).limit(20),
    sb.from('worldboss_rank').select('user_id, username, total, hits').eq('season', season).eq('user_id', me).maybeSingle(),
    sb.from('worldboss_hits').select('id', { count: 'exact', head: true }).eq('user_id', me).eq('kst_date', today),
    sb.from('worldboss').select('season, killed_at').lt('season', season + 1).not('killed_at', 'is', null).order('season', { ascending: false }).limit(3),
  ]);
  // 받을 보상: 처치된 시즌 중 내가 참여했고 아직 안 받은 것
  let claimable: number[] = [];
  const killed = ((prevB.data ?? []) as { season: number }[]).map((x) => x.season);
  if (killed.length) {
    const [part, cl] = await Promise.all([
      sb.from('worldboss_rank').select('season').eq('user_id', me).in('season', killed),
      sb.from('worldboss_claims').select('season').eq('user_id', me).in('season', killed),
    ]);
    const done = new Set(((cl.data ?? []) as { season: number }[]).map((x) => x.season));
    claimable = ((part.data ?? []) as { season: number }[]).map((x) => x.season).filter((x) => !done.has(x));
  }
  let myRank: number | null = null;
  if (mine.data) {
    const c = await sb.from('worldboss_rank').select('user_id', { count: 'exact', head: true }).eq('season', season).gt('total', (mine.data as WBRank).total);
    myRank = (c.count ?? 0) + 1;
  }
  return { boss: (b.data as WBBoss) ?? null, top: (top.data ?? []) as WBRank[], mine: (mine.data as WBRank) ?? null, myRank, used: used.count ?? 0, claimable };
}
export async function wbCall(body: Record<string, unknown>): Promise<any> {
  if (!sb || !session) return { error: '로그인이 필요해요' };
  const { data, error } = await sb.functions.invoke('worldboss', { body });
  if (error) {
    try { const j = await (error as any).context?.json?.(); if (j?.error) return j; } catch { /* 무시 */ }
    return { error: '서버 함수에 연결할 수 없어요' };
  }
  return data;
}
let wbCh: ReturnType<SupabaseClient['channel']> | null = null;
export function subscribeWB(onChange: (b: WBBoss) => void) {
  if (!sb || wbCh) return;
  wbCh = sb.channel('wb').on('postgres_changes', { event: '*', schema: 'public', table: 'worldboss' }, (p) => onChange(p.new as WBBoss)).subscribe();
}
