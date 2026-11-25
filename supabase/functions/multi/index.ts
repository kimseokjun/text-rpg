// 멀티 던전: 시작(서버가 전투 계산 후 방에 결과 저장) · 보상 받기
// core.js 는 배포 시 GitHub Actions가 src/server/multi.ts 를 번들해서 만든다.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { simulateMulti, slotsFor } from './core.js';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: '로그인이 필요해요' }, 401);
    const uid = u.user.id;
    const body = await req.json().catch(() => ({}));
    const roomId = String(body.room ?? '');
    const { data: room } = await admin.from('rooms').select('*').eq('id', roomId).maybeSingle();
    if (!room) return json({ error: '방이 없어요' });
    const { data: mem } = await admin.from('room_members').select('*').eq('room_id', roomId).order('joined_at');
    const members = (mem ?? []) as { user_id: string; username: string; chars: (string | { uid: string })[]; ready: boolean; claimed: boolean }[];

    if (body.action === 'start') {
      if (room.host !== uid) return json({ error: '방장만 시작할 수 있어요' });
      if (room.status !== 'open') return json({ error: '이미 시작한 방이에요' });
      if (members.length < 2) return json({ error: '2명 이상 모여야 시작할 수 있어요' });
      const notReady = members.filter((m) => m.user_id !== uid && !m.ready);
      if (notReady.length) return json({ error: `${notReady.map((m) => m.username).join(', ')} 준비 안 됨` });
      for (const m of members) {
        const need = slotsFor(members.length, m.user_id === room.host);
        if ((m.chars ?? []).length < 1) return json({ error: `${m.username}이(가) 단원을 고르지 않았어요` });
        if ((m.chars ?? []).length > need) return json({ error: `${m.username}은(는) ${need}명까지만 데려갈 수 있어요` });
      }
      const { data: saves } = await admin.from('saves').select('user_id, data').in('user_id', members.map((m) => m.user_id));
      const byUser = Object.fromEntries(((saves ?? []) as { user_id: string; data: unknown }[]).map((x) => [x.user_id, x.data]));
      const missing = members.filter((m) => !byUser[m.user_id]);
      if (missing.length) return json({ error: `${missing.map((m) => m.username).join(', ')}의 서버 세이브가 없어요` });
      const seed = Math.floor(Math.random() * 1e9);
      const r = simulateMulti(members.map((m) => ({ user_id: m.user_id, username: m.username, chars: m.chars, save: byUser[m.user_id], host: m.user_id === room.host })), room.floor, seed);
      if ('error' in r) return json({ error: r.error });
      const { error: e2 } = await admin.from('rooms').update({ status: 'done', started_at: new Date().toISOString(), result: r }).eq('id', roomId).eq('status', 'open');
      if (e2) return json({ error: '시작 실패: ' + e2.message }, 500);
      return json({ ok: true });
    }

    if (body.action === 'claim') {
      if (room.status !== 'done' || !room.result) return json({ error: '아직 끝나지 않았어요' });
      const me = members.find((m) => m.user_id === uid);
      if (!me) return json({ error: '이 방의 참가자가 아니에요' });
      if (me.claimed) return json({ error: '이미 보상을 받았어요' });
      const { data: upd } = await admin.from('room_members').update({ claimed: true }).eq('room_id', roomId).eq('user_id', uid).eq('claimed', false).select();
      if (!upd?.length) return json({ error: '이미 보상을 받았어요' });
      const res = room.result as { reward: Record<string, unknown>; rewards?: Record<string, Record<string, unknown>>; owner: Record<string, string>; chars: { uid: string }[] };
      const mine = Object.entries(res.owner).filter(([, o]) => o === uid).map(([k]) => k);
      return json({ ok: true, reward: res.rewards?.[uid] ?? res.reward, myChars: mine, totalChars: res.chars.length });
    }
    return json({ error: '알 수 없는 요청' });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
