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
