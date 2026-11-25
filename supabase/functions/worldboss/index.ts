// 월드보스: 도전(서버가 전투 계산) · 보상 받기
// core.js 는 배포 시 GitHub Actions가 src/server/worldboss.ts 를 번들해서 만든다.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { simulateWorldBoss, nextMaxHp, wbReward, WB_LIMIT } from './core.js';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// 한국 시간 기준 날짜와 주차 (게임과 같은 계산)
const kstNow = () => new Date(Date.now() + 9 * 3600_000);
const kstDate = () => kstNow().toISOString().slice(0, 10);
const season = () => Math.floor((Math.floor((Date.now() + 9 * 3600_000) / 86400_000) + 3) / 7); // 게임의 raidWeek()와 같음 (월요일 0시 KST 시작)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: '로그인이 필요해요' }, 401);
    const uid = u.user.id;
    const body = await req.json().catch(() => ({}));
    const sn = season();

    // 이번 시즌 보스 준비
    let { data: boss } = await admin.from('worldboss').select('*').eq('season', sn).maybeSingle();
    if (!boss) {
      const { data: prev } = await admin.from('worldboss').select('*').lt('season', sn).order('season', { ascending: false }).limit(1).maybeSingle();
      const max = nextMaxHp(prev ? { max_hp: prev.max_hp, killed: !!prev.killed_at, hours: prev.killed_at ? (Date.parse(prev.killed_at) - Date.parse(prev.started_at)) / 3600_000 : 999 } : undefined);
      await admin.from('worldboss').upsert({ season: sn, max_hp: max, hp: max }, { onConflict: 'season', ignoreDuplicates: true });
      ({ data: boss } = await admin.from('worldboss').select('*').eq('season', sn).single());
    }

    if (body.action === 'claim') {
      const target = Number(body.season ?? sn);
      const { data: b } = await admin.from('worldboss').select('*').eq('season', target).maybeSingle();
      if (!b?.killed_at) return json({ error: '아직 처치되지 않았어요' });
      const { data: ranks } = await admin.from('worldboss_rank').select('user_id, total').eq('season', target).order('total', { ascending: false });
      const idx = (ranks ?? []).findIndex((r: { user_id: string }) => r.user_id === uid);
      if (idx < 0) return json({ error: '이 시즌에 참여하지 않았어요' });
      const { error: ce } = await admin.from('worldboss_claims').insert({ season: target, user_id: uid });
      if (ce) return json({ error: '이미 보상을 받았어요' });
      return json({ ok: true, rank: idx + 1, total: ranks!.length, reward: wbReward(idx + 1, ranks!.length) });
    }

    // 도전
    if (boss.killed_at || boss.hp <= 0) return json({ error: '이번 주 월드보스는 이미 쓰러졌어요. 보상을 받으세요' });
    const today = kstDate();
    const { count } = await admin.from('worldboss_hits').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('kst_date', today);
    if ((count ?? 0) >= WB_LIMIT) return json({ error: `오늘 도전 ${WB_LIMIT}회를 다 썼어요 (자정 초기화)` });
    const { data: save } = await admin.from('saves').select('data').eq('user_id', uid).maybeSingle();
    if (!save) return json({ error: '서버에 저장된 세이브가 없어요. 잠시 후 다시 시도하세요' });
    const seed = Math.floor(Math.random() * 1e9);
    const r = simulateWorldBoss(save.data, sn, boss.hp, boss.max_hp, seed);
    if ('error' in r) return json({ error: r.error });
    const { data: hit, error: he } = await admin.rpc('wb_hit', { p_season: sn, p_user: uid, p_dmg: r.dealt, p_date: today });
    if (he) return json({ error: '기록 실패: ' + he.message }, 500);
    const h = Array.isArray(hit) ? hit[0] : hit;
    return json({ ok: true, dealt: h.applied, hpLeft: h.hp_left, maxHp: boss.max_hp, killedNow: h.killed_now, attemptsLeft: WB_LIMIT - (count ?? 0) - 1, log: r.log, report: r.report, wiped: r.wiped });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
