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
export async function loadRoomChat(room: string): Promise<ChatMsg[]> {
  if (!sb || !session) return [];
  const { data } = await sb.from('chat_messages').select('id, user_id, username, body, created_at').eq('channel', `room:${room}`).order('id', { ascending: true }).limit(100);
  return (data ?? []) as ChatMsg[];
}
export interface ChatMsg2 extends ChatMsg { channel?: string }
let roomMsgHandler: ((m: ChatMsg) => void) | null = null;
export function setRoomChatHandler(h: typeof roomMsgHandler) { roomMsgHandler = h; }
export function subscribeChat(onMsg: (m: ChatMsg) => void, onFriends: () => void) {
  if (!sb || !session || chatCh) return;
  chatCh = sb.channel('db-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (p) => { const m = p.new as ChatMsg2; if (!m.channel || m.channel === 'global') onMsg(m); else roomMsgHandler?.(m); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => onFriends())
    .subscribe();
}
export async function sendChat(body: string, channel = 'global'): Promise<string | null> {
  if (!sb || !session) return '로그인이 필요해요';
  const t = body.trim().slice(0, 200);
  if (!t) return null;
  const { error } = await sb.from('chat_messages').insert({ body: t, user_id: session.user.id, channel });
  if (error) return /too fast/.test(error.message) ? '너무 빨라요. 잠깐 쉬었다 보내주세요' : /muted/.test(error.message) ? '채팅이 금지된 계정이에요' : '전송 실패';
  return null;
}

// ───────── 접속 중 (presence) ─────────
let presCh: ReturnType<SupabaseClient['channel']> | null = null;
export let online: Record<string, string> = {}; // user_id → username
export function joinPresence(onChange: () => void) {
  if (!sb || !session || presCh) return;
  presCh = sb.channel('online', { config: { presence: { key: session.user.id } } });
  presCh.on('broadcast', { event: 'invite' }, (m) => { const p = m.payload as { to: string; from: string; room: string; floor: number }; if (p?.to === session?.user.id) onInvite?.(p); });
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

// ───────── 멀티 던전 ─────────
export interface Room { id: string; host: string; host_name: string; floor: number; max_players: number; status: 'open' | 'running' | 'done'; result: any; created_at: string }
export interface PickedChar { uid: string; name: string; jobId: string; level: number; power: number }
export interface RoomMember { room_id: string; user_id: string; username: string; chars: (string | PickedChar)[]; ready: boolean; claimed: boolean; joined_at: string }
export async function listRooms(): Promise<(Room & { n: number })[]> {
  if (!sb) return [];
  const since = new Date(Date.now() - 3 * 3600_000).toISOString();
  const { data } = await sb.from('rooms').select('id, host, host_name, floor, max_players, status, created_at').eq('status', 'open').gt('created_at', since).order('created_at', { ascending: false }).limit(30);
  const rooms = (data ?? []) as Room[];
  if (!rooms.length) return [];
  const { data: m } = await sb.from('room_members').select('room_id, user_id').in('room_id', rooms.map((r) => r.id));
  const cnt: Record<string, number> = {};
  for (const x of (m ?? []) as { room_id: string; user_id: string }[]) cnt[x.room_id] = (cnt[x.room_id] ?? 0) + 1;
  // 방장이 접속 중이 아닌 방은 숨김 (내 방은 지울 수 있게 보여줌)
  return rooms.filter((r) => online[r.host] || r.host === session?.user.id).map((r) => ({ ...r, n: cnt[r.id] ?? 0 }));
}
export async function roomState(id: string): Promise<{ room: Room; members: RoomMember[] } | null> {
  if (!sb) return null;
  const [r, m] = await Promise.all([sb.from('rooms').select('*').eq('id', id).maybeSingle(), sb.from('room_members').select('*').eq('room_id', id).order('joined_at')]);
  if (!r.data) return null;
  return { room: r.data as Room, members: (m.data ?? []) as RoomMember[] };
}
const dbErr = (m: string) => (/room full/.test(m) ? '방이 꽉 찼어요' : /room closed/.test(m) ? '이미 시작했거나 닫힌 방이에요' : m);
export async function createRoom(floor: number, max: number): Promise<{ id?: string; error?: string }> {
  if (!sb || !session) return { error: '로그인이 필요해요' };
  const { data, error } = await sb.from('rooms').insert({ host: session.user.id, floor, max_players: max }).select('id').single();
  if (error) return { error: dbErr(error.message) };
  const j = await joinRoom(data.id);
  return j ? { error: j } : { id: data.id };
}
export async function joinRoom(id: string): Promise<string | null> {
  if (!sb || !session) return '로그인이 필요해요';
  const { error } = await sb.from('room_members').insert({ room_id: id, user_id: session.user.id });
  if (error && !/duplicate/i.test(error.message)) return dbErr(error.message);
  return null;
}
export async function kickMember(id: string, user: string) { if (sb) await sb.from('room_members').delete().eq('room_id', id).eq('user_id', user); }
export async function deleteRoom(id: string) { if (sb) await sb.from('rooms').delete().eq('id', id); }
export async function leaveRoom(id: string, host: boolean) {
  if (!sb || !session) return;
  if (host) await sb.from('rooms').delete().eq('id', id).eq('status', 'open');
  else await sb.from('room_members').delete().eq('room_id', id).eq('user_id', session.user.id);
}
export async function setMember(id: string, chars: PickedChar[], ready: boolean): Promise<string | null> {
  if (!sb || !session) return '로그인이 필요해요';
  const { error } = await sb.from('room_members').update({ chars, ready }).eq('room_id', id).eq('user_id', session.user.id);
  return error ? dbErr(error.message) : null;
}
export async function multiCall(body: Record<string, unknown>): Promise<any> {
  if (!sb || !session) return { error: '로그인이 필요해요' };
  const { data, error } = await sb.functions.invoke('multi', { body });
  if (error) { try { const j = await (error as any).context?.json?.(); if (j?.error) return j; } catch { /* 무시 */ } return { error: '서버 함수에 연결할 수 없어요' }; }
  return data;
}
let roomCh: ReturnType<SupabaseClient['channel']> | null = null;
export function watchRoom(id: string | null, onChange: () => void) {
  if (!sb) return;
  if (roomCh) { sb.removeChannel(roomCh); roomCh = null; }
  if (!id) return;
  roomCh = sb.channel(`room-${id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${id}` }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${id}` }, () => onChange())
    .subscribe();
}
/** 초대: 접속 채널로 브로드캐스트 */
let onInvite: ((p: { from: string; room: string; floor: number }) => void) | null = null;
export function setInviteHandler(h: typeof onInvite) { onInvite = h; }
export function sendInvite(to: string, room: string, floor: number) {
  presCh?.send({ type: 'broadcast', event: 'invite', payload: { to, from: username, room, floor } });
}

// ───────── 접속 기록 · 활동 로그 ─────────
export let isAdmin = false;
export async function touch(login = false) {
  if (!sb || !session) return;
  await sb.rpc('touch', { p_login: login });
  const { data } = await sb.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
  isAdmin = !!(data as { is_admin?: boolean } | null)?.is_admin;
}
const evQueue: { kind: string; detail: string }[] = [];
let evTimer = 0;
export function logEvent(kind: string, detail = '') {
  if (!sb || !session) return;
  evQueue.push({ kind: kind.slice(0, 32), detail: detail.slice(0, 300) });
  clearTimeout(evTimer);
  evTimer = window.setTimeout(flushEvents, 2000);
}
async function flushEvents() {
  if (!sb || !session || !evQueue.length) return;
  const batch = evQueue.splice(0, 50).map((e) => ({ ...e, user_id: session!.user.id }));
  await sb.from('events').insert(batch);
}

// ───────── 관리자 ─────────
export interface AdminUser { id: string; username: string; created_at: string; last_seen: string; login_count: number; is_admin: boolean; muted: boolean; day: number | null; max_floor: number | null; power: number | null; gold: number | null; tower_best: number; saved_at: string | null; events: number; chats: number }
export interface EventRow { id: number; user_id: string; username: string; kind: string; detail: string; created_at: string }
export const adminStats = async () => { if (!sb) return null; const r = await sb.rpc('admin_stats'); if (r.error) throw new Error(r.error.message); return r.data as any; };
export const adminUsers = async () => { if (!sb) return [] as AdminUser[]; const r = await sb.rpc('admin_users'); if (r.error) throw new Error(r.error.message); return (r.data ?? []) as AdminUser[]; };
export const adminUserSave = async (id: string) => (sb ? (await sb.rpc('admin_user_save', { p_user: id })).data as any : null);
export async function adminEvents(opts: { user?: string; kind?: string; limit?: number } = {}): Promise<EventRow[]> {
  if (!sb) return [];
  let q = sb.from('events').select('*').order('id', { ascending: false }).limit(opts.limit ?? 200);
  if (opts.user) q = q.eq('user_id', opts.user);
  if (opts.kind) q = q.eq('kind', opts.kind);
  const r = await q;
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as EventRow[];
}
export async function adminChats(limit = 150): Promise<(ChatMsg & { channel: string })[]> {
  if (!sb) return [];
  return ((await sb.from('chat_messages').select('id, user_id, username, body, created_at, channel').order('id', { ascending: false }).limit(limit)).data ?? []) as (ChatMsg & { channel: string })[];
}
export async function adminDeleteChat(id: number) { if (sb) await sb.from('chat_messages').delete().eq('id', id); }
export async function adminGift(user: string, g: { gold: number; stones: number; blessings: number; refineStones: number; cores: number; scales: number }): Promise<string | null> {
  if (!sb) return '서버 없음';
  const { error } = await sb.rpc('admin_gift', { p_user: user, p_gold: g.gold, p_stones: g.stones, p_bless: g.blessings, p_refine: g.refineStones, p_cores: g.cores, p_scales: g.scales });
  return error ? (/no save/.test(error.message) ? '서버 세이브가 없는 계정이에요' : error.message) : null;
}
export async function adminSet(user: string, muted: boolean, admin: boolean): Promise<string | null> {
  if (!sb) return '서버 없음';
  const { error } = await sb.rpc('admin_set', { p_user: user, p_muted: muted, p_admin: admin });
  return error ? error.message : null;
}
