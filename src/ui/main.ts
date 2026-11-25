import './style.css';
import { canAdvance, levelCap } from '../core/character';
import { mitigation, rowOf } from '../core/combat';
import { charPower, floorPower, hasHealer, noHealerFactor, partyPower, powerLevel } from '../core/power';
import type { ExpeditionSettings, FloorResult } from '../core/dungeon';
import { finalStats, expToNext, STAT_KEYS } from '../core/stats';
import { gradeWeights, BOARD_SIZE, enhanceCost, enhanceRate, refreshSlotCost, rosterLimit } from '../core/town';
import { equipStats } from '../core/stats';
import { GRADE_NAME, RARITY_NAME, TARGET_NAME, type Grade, type Row, type TargetPref, type UnitSnap, type BaseJob, type BattleEvent, type JobId, type Character, type Equip, type EquipSlot, type Rarity, type StatKey } from '../core/types';
import { raidWeek, MILESTONE_SCALES, RAID_DIFF, RAID_DIFFS, RAID_DIFF_NAME, RAID_LIMIT, RAID_ROUNDS, nextResetText, raidForm, raidMaxHp, type RaidDiff } from '../data/raid';
import { DAILIES, DAILY_BY_ID, DAILY_LIMIT, DAILY_STAGES, dailyReward } from '../data/daily';
import { CRAFT_COST, RAID_CRAFT_COST, RAID_SET, SETS, SET_BASES, SET_BY_ID, SET_DROP_CHANCE, SET_RARITY, SHARD_CHANCE } from '../data/sets';
import { PET_KINDS, EGG_ODDS, EGG_PRICE, PET_BY_ID, PET_GRADE_NAME, PET_GRADE_PCT, PET_MAX_STARS, petEffectText, petSellPrice, type Pet } from '../data/pets';
import { EQUIP_BASES, EQUIP_BY_ID, MAX_POTIONS, OPTION_SLOTS, POTIONS, REFINE_CHANCE, tierOfFloor } from '../data/items';
import { ADVANCE_AT, JOBS, advanceOptions } from '../data/jobs';
import { MERCENARIES, MERC_BY_ID } from '../data/mercenaries';
import { floorLevel, rewardScale } from '../data/monsters';
import { MAX_FLOOR, MONSTERS, PART1_FLOOR, REGIONS, ZONES, floorName, floorTip, localFloor, regionOf, zoneOf } from '../data/monsters';
import { BLESS_CHANCE, DROP_CHANCE, MAX_REPEAT, STONE_CHANCE, rarityWeights } from '../core/dungeon';
import { SKILLS, describeSkill } from '../data/skills';
import { TRAITS } from '../data/traits';
import { QUESTS, rewardText } from '../data/quests';
import { WB_LIMIT, wbInfo } from '../server/worldboss';
import { slotsFor } from '../server/multi';
import { Expedition } from '../core/dungeon';
import { Rng } from '../core/rng';
import { CARDS, CARD_BY_ID, CARD_SETS, DECK_SIZE, MAX_AWAKEN, PACK_ODDS, SET_BY_ID as CARD_SET_BY_ID, cardEffectText, cardMods } from '../data/cards';
import { cardHtml } from './cardart';
import { TOWER_UNLOCK, isTowerBoss, towerBoss, towerGimmick, towerReward } from '../data/tower';
import * as G from '../state/game';
import { exportSave, importSave, initRemote, loadGame, remoteReady, saveGame, saveGameNow, wipeSave } from '../state/save';
import * as Cloud from '../net/cloud';
import { CLOUD } from '../net/cloud';
import { townScene } from './art';
import { charSprite } from './pixel';
import { equipKind, equipSprite, itemSprite, monsterSprite, petSprite } from './sprites';

type Screen = 'title' | 'town' | 'party' | 'guild' | 'smith' | 'refinery' | 'pets' | 'forge' | 'daily' | 'raid' | 'shop' | 'storage' | 'training' | 'temple' | 'gate' | 'dungeon' | 'result' | 'tower' | 'rank' | 'world' | 'multi' | 'codex' | 'admin' | 'notice' | 'cards';

let S: G.GameState | null = null;
let screen: Screen = 'title';
let modal: { kind: 'char'; uid: string } | { kind: 'save' } | null = null;
let toastMsg: { text: string; bad: boolean } | null = null;
let toastTimer = 0;
let lastSave: G.GameState | null = null;
let useBlessing = false;
let confirmDismiss: string | null = null;
let boardConfirm: { kind: 'one'; i: number } | { kind: 'all' } | null = null;
let summary: G.ExpeditionSummary | null = null;
let gatePotions: string[] = [];
type PartyFilter = 'all' | 'warrior' | 'mage' | 'archer' | 'priest';
let partyFilter: PartyFilter = 'all';
let bulkR = new Set<Rarity>([1]);
let bulkKeepEnh = true;
let dropOpen = window.matchMedia?.('(min-width: 601px)').matches ?? true;
let bulkOpen = window.matchMedia?.('(min-width: 601px)').matches ?? true;

const app = document.getElementById('app')!;
const esc = (v: unknown) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');
const stars = (g: number) => `<span class="stars g${g}">${'★'.repeat(g)}</span>`;
const pctW = (a: number, b: number) => `${Math.max(0, Math.min(100, (a / Math.max(1, b)) * 100)).toFixed(1)}%`;

function toast(text: string, bad = false) {
  toastMsg = { text, bad };
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toastMsg = null; renderToast(); }, Math.max(2600, text.length * 70));
  renderToast();
}
function renderToast() {
  document.querySelector('.toast')?.remove();
  if (toastMsg) app.insertAdjacentHTML('beforeend', `<div class="toast ${toastMsg.bad ? 'bad' : ''}" role="status">${esc(toastMsg.text)}</div>`);
}
// ───────── 채팅·친구 (서버 버전) ─────────
let chatOpen = false;
let chatTab: 'chat' | 'friends' | 'online' = 'chat';
let chatMsgs: Cloud.ChatMsg[] = [];
let chatUnread = 0;
let chatDraft = '';
let friends: Cloud.Friend[] = [];
let friendDraft = '';
let socialOn = false;
let notices: Cloud.Notice[] = [];
let noticeTab: 'all' | 'patch' | 'plan' | 'notice' = 'all';
let noticeEdit: Partial<Cloud.Notice> | null = null;
const NOTICE_KIND: Record<string, string> = { patch: '패치', plan: '예정', notice: '공지' };
const noticeRead = () => { try { return Number(localStorage.getItem('text-rpg-notice-read') ?? 0); } catch { return 0; } };
async function loadNoticesNow() { notices = await Cloud.loadNotices(); if (screen === 'town' || screen === 'notice') render(); }
function noticeStrip() {
  if (!CLOUD || !notices.length) return '';
  const read = noticeRead();
  const unread = notices.filter((n) => n.id > read).length;
  const top = notices.find((n) => n.id > read) ?? notices[0];
  return `<button class="nstrip" data-a="go" data-to="notice"><span class="tag ${top.kind}">${NOTICE_KIND[top.kind]}</span><b>${esc(top.title)}</b>${unread ? `<span class="nbadge">새 소식 ${unread}</span>` : ''}<span class="small mute">공지사항 →</span></button>`;
}
function viewNotice() {
  const maxId = Math.max(0, ...notices.map((n) => n.id));
  if (maxId > noticeRead()) { try { localStorage.setItem('text-rpg-notice-read', String(maxId)); } catch { /* 무시 */ } }
  if (!notices.length) setTimeout(loadNoticesNow, 0);
  const list = notices.filter((n) => noticeTab === 'all' || n.kind === noticeTab);
  const ed = noticeEdit;
  const form = Cloud.isAdmin ? (ed ? `<form class="panel grid nform" data-form="notice">
      <div class="row" style="gap:8px;flex-wrap:wrap"><select name="kind">${Object.entries(NOTICE_KIND).map(([k, n]) => `<option value="${k}" ${ed.kind === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <label class="chk" style="min-height:0"><input type="checkbox" name="pinned" ${ed.pinned ? 'checked' : ''}> 상단 고정</label></div>
      <input name="title" maxlength="80" placeholder="제목" value="${esc(ed.title ?? '')}" required>
      <textarea name="body" rows="6" maxlength="4000" placeholder="내용 (줄마다 · 로 시작하면 보기 좋아요)">${esc(ed.body ?? '')}</textarea>
      <div class="row" style="gap:8px"><button class="btn sm" type="submit">${ed.id ? '수정' : '올리기'}</button><button class="btn ghost sm" type="button" data-a="noticeCancel">취소</button></div></form>`
    : `<button class="btn sm" data-a="noticeNew" style="margin:8px 0">+ 공지 쓰기</button>`) : '';
  return `<div class="wrap">${backBtn()}
    <h2>공지사항</h2>
    <div class="tabs" role="group" aria-label="공지 종류">${([['all', '전체'], ['patch', '패치 노트'], ['plan', '업데이트 예정'], ['notice', '공지']] as const).map(([k, n]) => `<button class="${noticeTab === k ? 'on' : ''}" data-a="noticeTab" data-v="${k}">${n}</button>`).join('')}</div>
    ${form}
    <div class="nlist">${list.map((n) => `<article class="notice nk-${n.kind}"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><span class="tag ${n.kind}">${NOTICE_KIND[n.kind]}</span>${n.pinned ? '<span class="small">📌</span>' : ''}<h3 style="margin:0;flex:1">${esc(n.title)}</h3><span class="small mute">${new Date(Date.parse(n.created_at) + 9 * 3600_000).toISOString().slice(5, 16).replace('T', ' ')}</span></div>
      <div class="nbody">${esc(n.body)}</div>
      ${Cloud.isAdmin ? `<div class="row" style="gap:6px;margin-top:6px"><button class="btn ghost sm" data-a="noticeEditBtn" data-v="${n.id}">수정</button><button class="btn ghost sm" data-a="noticeDel" data-v="${n.id}">삭제</button></div>` : ''}</article>`).join('') || '<p class="mute">공지가 없어요.</p>'}</div>
  </div>`;
}
let touchTimer = 0;
async function startSocial() {
  if (!CLOUD || !Cloud.session || socialOn) return;
  socialOn = true;
  Cloud.touch(true).then(() => { if (screen === 'town') render(); });
  loadNoticesNow();
  Cloud.logEvent('login', navigator.userAgent.includes('Mobile') ? '모바일' : 'PC');
  clearInterval(touchTimer);
  touchTimer = window.setInterval(() => Cloud.touch(false), 180000);
  chatMsgs = await Cloud.loadChat();
  friends = await Cloud.loadFriends();
  Cloud.subscribeChat((m) => {
    if (chatMsgs.some((x) => x.id === m.id)) return;
    chatMsgs.push(m); if (chatMsgs.length > 100) chatMsgs.shift();
    const list = document.querySelector('.chatbox .clist:not(.flist)');
    if (chatOpen && chatTab === 'chat' && list) {
      const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
      list.querySelector('p.small.mute')?.remove();
      list.insertAdjacentHTML('beforeend', msgHtml(m));
      if (atBottom || m.user_id === Cloud.session?.user.id) list.scrollTop = list.scrollHeight;
      return;
    }
    chatUnread++;
    renderChat();
  }, async () => { friends = await Cloud.loadFriends(); if (!(chatOpen && chatTab === 'chat')) renderChat(); });
  Cloud.joinPresence(() => { if (screen === 'multi' && myRoom) refreshRoom(); if (chatOpen && chatTab === 'online') { renderChat(); return; } const el = document.querySelector('.chatbox .onl'); if (el) el.textContent = `● 접속 ${Object.keys(Cloud.online).length}명`; else renderChat(); });
  renderChat();
}
let invitePending: { from: string; room: string; floor: number } | null = null;
function renderInvite() {
  document.querySelector('.invite')?.remove();
  if (!invitePending) return;
  app.insertAdjacentHTML('beforeend', `<div class="invite" role="alertdialog"><b>${esc(invitePending.from)}</b>님이 ${esc(zoneOf(invitePending.floor).name)} 균열에 초대했어요<div class="row" style="gap:6px;margin-top:8px"><button class="btn sm" data-a="mInviteJoin" data-v="${esc(invitePending.room)}">참가</button><button class="btn ghost sm" data-a="mInviteNo">거절</button></div></div>`);
}
Cloud.setInviteHandler((p) => { invitePending = p; renderInvite(); });
function stopSocial() { clearInterval(touchTimer); Cloud.leaveRealtime(); socialOn = false; chatOpen = false; chatMsgs = []; friends = []; renderChat(); }
const msgHtml = (m: Cloud.ChatMsg) => `<div class="cmsg ${m.user_id === Cloud.session?.user.id ? 'mine' : ''}"><span class="cn">${esc(m.username)}</span><span class="cb">${esc(m.body)}</span><span class="ct">${hhmm(m.created_at)}</span></div>`;
const hhmm = (t: string) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
function renderChat(scrollBottom = false) {
  const box = document.querySelector('.chatbox .clist');
  const atBottom = box ? box.scrollHeight - box.scrollTop - box.clientHeight < 40 : true;
  document.querySelector('.chatfab')?.remove();
  document.querySelector('.chatbox')?.remove();
  if (!CLOUD || !Cloud.session || !socialOn || screen === 'title') return;
  const onlineN = Object.keys(Cloud.online).length;
  const pending = friends.filter((f) => f.status === 'pending' && f.incoming).length;
  if (!chatOpen) {
    app.insertAdjacentHTML('beforeend', `<button class="chatfab" data-a="chatToggle" aria-label="채팅 열기">💬${chatUnread + pending ? `<span class="badge">${Math.min(99, chatUnread + pending)}</span>` : ''}</button>`);
    return;
  }
  const me2 = Cloud.session.user.id;
  const friendIds = new Set(friends.map((f) => f.other));
  const onlineList = Object.entries(Cloud.online).sort((a, b) => Number(b[0] === me2) - Number(a[0] === me2) || Number(friendIds.has(b[0])) - Number(friendIds.has(a[0])) || a[1].localeCompare(b[1]));
  const body = chatTab === 'online'
    ? `<div class="clist flist">${onlineList.map(([id, name]) => `<div class="frow"><span class="dot on"></span><b>${esc(name || '?')}</b><span class="small mute">${id === me2 ? '나' : friendIds.has(id) ? (friends.find((f) => f.other === id)?.status === 'accepted' ? '친구' : '요청 중') : ''}</span>${id !== me2 && !friendIds.has(id) && name ? `<button class="btn ghost sm" data-a="friendAdd" data-v="${esc(name)}">친구 요청</button>` : ''}</div>`).join('') || '<p class="small mute">접속 정보를 불러오는 중…</p>'}</div>`
    : chatTab === 'chat'
    ? `<div class="clist">${chatMsgs.map(msgHtml).join('') || '<p class="small mute">첫 메시지를 남겨보세요.</p>'}</div>
      <form class="cin" data-form="chat"><input id="chatIn" maxlength="200" placeholder="메시지 (200자)" value="${esc(chatDraft)}" autocomplete="off"><button class="btn sm" type="submit">보내기</button></form>`
    : `<div class="clist flist">
        <form class="cin" data-form="friend"><input id="friendIn" maxlength="12" placeholder="친구 아이디" value="${esc(friendDraft)}" autocomplete="off"><button class="btn sm" type="submit">친구 요청</button></form>
        ${friends.filter((f) => f.status === 'pending' && f.incoming).map((f) => `<div class="frow"><b>${esc(f.username)}</b><span class="small mute">친구 요청</span><button class="btn sm" data-a="friendAccept" data-v="${f.id}">수락</button><button class="btn ghost sm" data-a="friendRemove" data-v="${f.id}">거절</button></div>`).join('')}
        ${friends.filter((f) => f.status === 'accepted').sort((a, b) => Number(!!Cloud.online[b.other]) - Number(!!Cloud.online[a.other])).map((f) => `<div class="frow"><span class="dot ${Cloud.online[f.other] ? 'on' : ''}" title="${Cloud.online[f.other] ? '접속 중' : '오프라인'}"></span><b>${esc(f.username)}</b><span class="small mute">전투력 ${fmt(f.power)} · 탑 ${f.tower_best}층</span><button class="btn ghost sm" data-a="friendRemove" data-v="${f.id}" aria-label="친구 삭제">✕</button></div>`).join('')}
        ${friends.filter((f) => f.status === 'pending' && !f.incoming).map((f) => `<div class="frow"><b>${esc(f.username)}</b><span class="small mute">수락 대기 중</span><button class="btn ghost sm" data-a="friendRemove" data-v="${f.id}">취소</button></div>`).join('')}
        ${friends.length ? '' : '<p class="small mute">아이디로 친구를 추가해 보세요.</p>'}
      </div>`;
  app.insertAdjacentHTML('beforeend', `<section class="chatbox" aria-label="채팅">
    <div class="chead"><div class="tabs"><button class="${chatTab === 'chat' ? 'on' : ''}" data-a="chatTab" data-v="chat">전체 채팅</button><button class="${chatTab === 'friends' ? 'on' : ''}" data-a="chatTab" data-v="friends">친구${pending ? ` (${pending})` : ''}</button></div><button class="linkbtn small onl ${chatTab === 'online' ? 'on' : ''}" data-a="chatTab" data-v="online" title="누가 접속 중인지 보기">● 접속 ${onlineN}명</button><button class="btn ghost sm" data-a="chatToggle" aria-label="채팅 닫기">✕</button></div>
    ${body}</section>`);
  const nb = document.querySelector('.chatbox .clist');
  if (nb && chatTab === 'chat' && (scrollBottom ? atBottom : true)) nb.scrollTop = nb.scrollHeight;
}
async function submitChat() {
  const v = (document.getElementById('chatIn') as HTMLInputElement)?.value ?? '';
  if (!v.trim()) return;
  chatDraft = '';
  const inp = document.getElementById('chatIn') as HTMLInputElement | null;
  if (inp) inp.value = '';
  const err = await Cloud.sendChat(v);
  if (err) { chatDraft = v; if (inp) inp.value = v; toast(err, true); }
}
async function submitFriend() {
  const v = (document.getElementById('friendIn') as HTMLInputElement)?.value ?? '';
  const err = await Cloud.requestFriend(v);
  if (err) { friendDraft = v; toast(err, true); } else { friendDraft = ''; toast('친구 요청을 보냈어요'); friends = await Cloud.loadFriends(); }
  renderChat();
}

/** 활동 로그로 남길 행동 (관리자 대시보드) */
let curAction = '';
let confirmDel = '';
const LOG_ACTIONS = new Set(['cardOpen', 'cardAwaken', 'autoRefresh', 'autoEnh', 'hire', 'upgradeGuild', 'advance', 'enhance', 'buyEquip', 'buyDeal', 'train', 'reroll', 'refine', 'craft', 'buyEgg', 'petSellLow', 'claimQuest', 'dailySweep', 'buyStones']);
function commit(r?: G.Result) {
  if (CLOUD && r?.ok && LOG_ACTIONS.has(curAction)) Cloud.logEvent(curAction, r.msg ?? '');
  if (r && !r.ok) toast(r.msg, true);
  else if (r?.msg) toast(r.msg);
  if (S) saveGame(S);
  render();
}

// ───────── 공통 조각 ─────────
function topbar() {
  if (!S) return '';
  return `<header class="top"><div class="wrap">
    <h1>지하묘지의 용병단</h1>
    <div class="res">
      <span>파티 전투력 <b>${fmt(G.statePower(S))}</b></span>
      <span class="g">골드 <b>${fmt(S.gold)}</b></span>
      <span>강화석 <b>${S.stones}</b></span>
      <span>축복 <b>${S.blessings}</b></span>
      <span>${S.day}일차</span>
    </div>
  </div></header>`;
}

function charCard(c: Character, opts: { act?: string; inParty?: boolean } = {}) {
  const merc = c.mercId ? MERC_BY_ID[c.mercId] : null;
  const traits = [...c.traitIds, ...(c.uniqueTraitId ? [c.uniqueTraitId] : [])].map((t) => traitTag(t, false)).join('');
  return `<button class="card ${opts.inParty ? 'inparty' : ''} ${canAdvance(c) ? 'canadv' : ''}" data-a="${opts.act ?? 'openChar'}" data-uid="${esc(c.uid)}">
    ${canAdvance(c) ? '<span class="advbadge" title="전직할 수 있어요">⚡ 전직!</span>' : ''}
    <div class="ico">${avatar(c)}</div>
    <div class="cinfo">
      <div class="cname">${esc(c.name)} ${stars(c.grade)}${c.awakening ? `<span class="small g5">각성 ${c.awakening}</span>` : ''}</div>
      <div class="small mute">${esc(JOBS[c.jobId].name)} · Lv.${c.level} · <span class="cp">전투력 ${fmt(charPower(c))}</span>${c.isHero ? ' · 주인공' : merc ? ` · ${esc(merc.desc)}` : ''}</div>
      ${traits ? `<div class="tags">${traits}</div>` : ''}
    </div>
  </button>`;
}

/** 툴팁: PC는 마우스를 올리면, 폰은 탭하면 설명 표시 */
const tip = (text: string, inner: string, cls = '') => `<span class="tip ${cls}" data-tip="${esc(text)}" tabindex="0" role="button">${inner}</span>`;
const skillTip = (id: string) => tip(describeSkill(SKILLS[id]), esc(SKILLS[id].name), 'sk');

/** 특성 태그: 마우스를 올리거나(탭하면) 설명 표시 */
const traitTag = (id: string, focusable = true) => {
  const t = TRAITS[id];
  const cls = t?.kind === 'legend' ? 'l' : t?.kind === 'hero' ? 'u' : '';
  const kind = t?.kind === 'legend' ? '전설 고유 · ' : t?.kind === 'hero' ? '영웅 고유 · ' : t?.kind === 'mixed' ? '양날 · ' : '';
  return `<span class="tag ${cls}" data-tip="${esc(kind + (t?.desc ?? ''))}"${focusable ? ' tabindex="0" role="button"' : ''}>${esc(id)}</span>`;
};

/** 마을 건물 묶음: 건물 안 탭으로 이동 */
const HUBS: { id: string; name: string; tabs: [string, string][] }[] = [
  { id: 'guild', name: '모험가 길드', tabs: [['guild', '용병 모집'], ['codex', '용병 도감'], ['training', '훈련소'], ['temple', '신전']] },
  { id: 'smith', name: '대장간', tabs: [['smith', '강화'], ['refinery', '제련'], ['forge', '제작']] },
  { id: 'adv', name: '모험', tabs: [['gate', '던전'], ['tower', '무한 탑'], ['daily', '일일'], ['raid', '레이드']] },
];
if (CLOUD) HUBS[2].tabs.push(['multi', '멀티'], ['world', '월드보스']);
const hubOf = (sc: string) => HUBS.find((h) => h.tabs.some(([t]) => t === sc));
const hubTabs = () => {
  const h = hubOf(screen);
  return h ? `<div class="hubtabs" role="tablist" aria-label="${h.name}">${h.tabs.map(([t, n]) => `<button role="tab" class="${t === screen ? 'on' : ''}" aria-selected="${t === screen}" data-a="go" data-to="${t}">${n}</button>`).join('')}</div>` : '';
};
const backBtn = () => `<div class="back"><button class="btn ghost sm" data-a="go" data-to="town">← 마을로</button></div>${hubTabs()}`;

/** 도트 아이콘 */
const avatar = (c: Character, size = 44) => charSprite(JOBS[c.jobId].base, c.name, JOBS[c.jobId].tier, { size });
const equipIcon = (e: Equip, size = 34) => { const b = EQUIP_BY_ID[e.baseId]; return equipSprite(equipKind(b.slot, b.jobs?.[0]), b.tier, { size, set: b.set }); };
const POTION_COLOR: Record<string, string> = { p_str: '#d8443a', p_str2: '#ff3a2a', p_iron: '#8a94a4', p_iron2: '#c8d0dc', p_sage: '#3f7fd8', p_sage2: '#6a5aff', p_wind: '#6fcf97', p_luck: '#e8c84a', p_life: '#ff70a0', p_greed: '#d8a030' };
const potionIcon = (id: string, size = 30) => itemSprite('potion', { size, color: POTION_COLOR[id] ?? '#d8443a' });
function equipLine(e: Equip) {
  const b = EQUIP_BY_ID[e.baseId];
  const st = Object.entries(equipStats(e)).map(([k, v]) => `${STAT_LABEL[k as StatKey]} +${Math.round(v as number)}`).join(', ');
  const opt = e.options.map(optText).join(', ');
  return `<span class="eico r${e.rarity}e ${b.set ? 'setico' : ''}">${equipIcon(e)}</span><span class="iname r${e.rarity}">${esc(b.name)}${e.enhance ? ` +${e.enhance}` : ''}</span>${b.set ? ` <span class="settag">${esc(SET_BY_ID[b.set].name)} 세트</span>` : ''} <span class="small mute">${RARITY_NAME[e.rarity]}${b.jobs ? ` · ${b.jobs.map((j) => JOBS[j].name).join('/')}` : ''}</span><div class="istat">${st}${opt ? ` · ${opt}` : ''}</div>`;
}
const STAT_LABEL: Record<StatKey, string> = { hp: 'HP', mp: 'MP', atk: '공격', mag: '마력', def: '방어', res: '마저', agi: '민첩', crit: '치명' };
const MOD_LABEL: Record<string, string> = { ...STAT_LABEL, healPower: '회복량', skillDmg: '스킬 데미지', bossDmg: '보스 피해', resPierce: '마저 무시', defPierce: '방어 무시', magTaken: '받는 마법 피해' };
function optText(o: { key: string; kind: string; value: number }) {
  const unit = o.kind === 'pct' || o.key === 'resPierce' || o.key === 'defPierce' ? '%' : o.key === 'crit' ? '%p' : '';
  return `${MOD_LABEL[o.key] ?? o.key} ${o.value >= 0 ? '+' : ''}${o.value}${unit}`;
}
const SLOT_NAME: Record<EquipSlot, string> = { weapon: '무기', armor: '방어구', accessory: '장신구' };

// ───────── 화면들 ─────────
let authMode: 'login' | 'signup' = 'login';
let authBusy = false;
let authErr = '';
let authIdVal = '';
function authForm() {
  return `<form class="panel grid authf" data-form="auth" autocomplete="on">
    <div class="tabs" role="group" aria-label="로그인 방식"><button type="button" class="${authMode === 'login' ? 'on' : ''}" data-a="authMode" data-v="login">로그인</button><button type="button" class="${authMode === 'signup' ? 'on' : ''}" data-a="authMode" data-v="signup">회원가입</button></div>
    <div class="field"><label for="authId">아이디</label><input id="authId" name="username" autocomplete="username" maxlength="12" placeholder="2~12자 (한글·영문·숫자·_)" value="${esc(authIdVal)}" required></div>
    <div class="field"><label for="authPw">비밀번호</label><input id="authPw" name="password" type="password" autocomplete="${authMode === 'login' ? 'current-password' : 'new-password'}" minlength="6" placeholder="6자 이상" required></div>
    ${authMode === 'signup' ? '<div class="field"><label for="authPw2">비밀번호 확인</label><input id="authPw2" type="password" autocomplete="new-password" minlength="6" required></div>' : ''}
    ${authErr ? `<p class="small" style="color:var(--bad);margin:0">${esc(authErr)}</p>` : ''}
    <button class="btn" type="submit" ${authBusy ? 'disabled' : ''}>${authBusy ? '잠시만요…' : authMode === 'login' ? '로그인' : '가입하고 시작'}</button>
    <p class="small mute" style="margin:0">계정에 저장되어 어느 기기에서든 이어할 수 있어요. 비밀번호 찾기는 아직 없으니 잘 기억해 두세요.</p>
  </form>`;
}
async function submitAuth() {
  const id = (document.getElementById('authId') as HTMLInputElement)?.value ?? '';
  const pw = (document.getElementById('authPw') as HTMLInputElement)?.value ?? '';
  const pw2 = (document.getElementById('authPw2') as HTMLInputElement | null)?.value;
  authIdVal = id;
  if (authMode === 'signup' && pw !== pw2) { authErr = '비밀번호 확인이 달라요'; render(); return; }
  authBusy = true; authErr = ''; render();
  const err = authMode === 'login' ? await Cloud.signIn(id, pw) : await Cloud.signUp(id, pw);
  authBusy = false;
  if (err) { authErr = err; render(); return; }
  lastSave = await loadGame();
  render();
  startSocial();
  if (authMode === 'signup') Cloud.logEvent('signup', '');
  toast(authMode === 'login' ? `${Cloud.username}님 어서 오세요` : '가입 완료!');
}
function viewTitle() {
  return `<div class="title">
    <div class="scene">${townScene()}</div>
    <div class="tbox">
      <h1>지하묘지의 용병단</h1>
      <p class="mute">마을 지하의 봉인된 묘지에서 마물이 올라오기 시작했다. 길드에서 용병을 모아 파티를 꾸리고, 던전 깊은 곳의 진실을 밝혀내자.</p>
      ${CLOUD && !Cloud.session ? authForm() : `${CLOUD ? `<p class="small">접속 중: <b>${esc(Cloud.username)}</b> <button class="btn ghost sm" data-a="logout">로그아웃</button></p>` : ''}
      ${lastSave ? `<button class="btn" data-a="continue">이어하기 · ${esc(lastSave.heroName)} ${lastSave.day}일차</button>` : ''}
      <div class="panel grid">
        <div class="field"><label for="heroName">주인공 이름</label><input type="text" id="heroName" maxlength="8" placeholder="용사" value="킹"></div>
        <button class="btn ${lastSave ? 'ghost' : ''}" data-a="newGame">새 게임 시작</button>
        <button class="btn ghost sm" data-a="openSave">세이브 코드로 불러오기</button>
      </div>
      <p class="small mute">${remoteReady() ? '진행 상황은 계정에 자동 저장됩니다.' : '진행 상황은 이 브라우저에 자동 저장됩니다.'}</p>`}
    </div>
  </div>`;
}

const SIGN_ICON: Record<string, () => string> = {
  guild: () => charSprite('warrior', '길드', 2, { size: 34 }),
  rank: () => equipSprite('accessory', 7, { size: 34 }),
  cards: () => cardHtml('c01', { size: 26, awaken: 0 }),
  admin: () => itemSprite('refine', { size: 34 }),
  smith: () => equipSprite('sword', 3, { size: 34 }),
  refinery: () => itemSprite('refine', { size: 34 }),
  pets: () => itemSprite('egg', { size: 34 }),
  forge: () => equipSprite('sword', 8, { size: 34, set: 'demon' }),
  daily: () => itemSprite('gold', { size: 34 }),
  raid: () => monsterSprite(raidForm().monster, { size: 34, tags: ['demon'] }),
  shop: () => potionIcon('p_str', 34),
  storage: () => equipSprite('armor', 2, { size: 34 }),
  training: () => equipSprite('sword', 1, { size: 34 }),
  temple: () => equipSprite('relic', 3, { size: 34 }),
  gate: () => monsterSprite('skeleton', { size: 34, tags: ['undead'] }),
};
function questPanel() {
  const s = S!;
  const q = G.currentQuest(s);
  const i = s.questIdx ?? 0;
  if (!q) return `<div class="quest done"><b>🏆 모든 목표 달성!</b> <span class="small mute">이제 무한 탑 기록과 레이드에 도전하세요.</span></div>`;
  const ok = q.done(G.questView(s));
  return `<div class="quest ${ok ? 'ready' : ''}"><div class="qhead"><span class="small mute">다음 목표 ${i + 1}/${QUESTS.length}</span><span class="small">보상 ${esc(rewardText(q.reward))}</span></div>
    <div class="row" style="justify-content:space-between;gap:10px;align-items:center"><div><b>${ok ? '✔ ' : ''}${esc(q.title)}</b>${q.hint ? `<div class="small mute">${esc(q.hint)}</div>` : ''}</div>
    <button class="btn sm ${ok ? '' : 'ghost'}" data-a="claimQuest" ${ok ? '' : 'disabled'}>${ok ? '보상 받기' : '진행 중'}</button></div></div>`;
}
function viewTown() {
  const s = S!;
  const party = G.partyChars(s);
  const zone = s.maxFloor ? zoneOf(Math.max(1, Math.min(MAX_FLOOR, s.maxFloor))).name : '미답';
  const raidTxt = s.maxFloor >= 50 ? `탑 ${G.towerState(s).best}층 · 레이드 ${G.raidLeft(s)}/${RAID_LIMIT}` : '';
  const dailyLeft = DAILIES.filter((d) => G.dailyOpen(s, d)).reduce((a, d) => a + G.dailyLeft(s, d.id), 0);
  const signs: [string, string, string, string?][] = [
    ['gate', '모험', `${s.maxFloor ? `최고 ${esc(floorName(s.maxFloor))}` : '마왕숲 1층부터'} · 일일 ${dailyLeft}회${raidTxt ? ` · ${raidTxt}` : ''}`, 'gate'],
    ['guild', '모험가 길드', `모집·훈련소·신전 · 단원 ${s.roster.length}/${rosterLimit(s.guildLevel)}`],
    ['smith', '대장간', `강화·제련·제작 · 강화석 ${s.stones} · 제련석 ${s.refineStones}`],
    ['cards', '카드 보관함', `신비 카드 ${Object.keys(s.cards ?? {}).length}/${CARDS.length}${s.cardPacks ? ` · 팩 ${s.cardPacks}개` : ''}`],
    ['pets', '펫 우리', G.activePet(s) ? `${PET_BY_ID[G.activePet(s)!.kind].name} 동행 · ${s.pets.length}마리` : `펫 알 ${fmt(EGG_PRICE)}G`],
    ['shop', '잡화점', `물약 ${Object.values(s.potions).reduce((a, b) => a + b, 0)}개 보유`],
    ['storage', '창고', `장비 ${allEquips().length}개 · 재료 보기`],
    ...(CLOUD ? [['rank', '명예의 전당', '무한 탑 · 전투력 · 레이드 순위'] as [string, string, string]] : []),
    ...(CLOUD && Cloud.isAdmin ? [['admin', '관리자', '회원 · 활동 로그 · 채팅 · 지급'] as [string, string, string]] : []),
  ];
  return `<div class="wrap">
    <div class="scene">${townScene()}</div>
    ${noticeStrip()}
    ${questPanel()}
    ${(() => { const a = G.advanceable(s); return a.length ? `<button class="advnote" data-a="openChar" data-uid="${esc(a[0].uid)}"><b>⚡ 전직할 수 있어요!</b> <span>${a.slice(0, 4).map((c) => esc(c.name)).join(', ')}${a.length > 4 ? ` 외 ${a.length - 4}명` : ''}</span><span class="small mute">눌러서 전직하기 →</span></button>` : ''; })()}
    <nav class="signs">${signs.map(([to, n, d, c]) => `<button class="sign ${c ?? ''}" data-a="go" data-to="${to}"><span class="sico">${SIGN_ICON[to]?.() ?? ''}</span><b>${n}</b><span>${d}</span></button>`).join('')}</nav>
    <div class="cols">
      <section class="grid"><div class="row"><h2>출전 파티</h2><span class="mute">${party.length}/${G.PARTY_MAX} · 전투력 <b class="cp">${fmt(G.statePower(s))}</b></span><button class="btn sm" data-a="go" data-to="party" style="margin-left:auto">파티 편성</button></div>
        <div class="cards">${party.map((c) => charCard(c, { inParty: true })).join('')}</div>
        <p class="small mute">카드를 누르면 장비·스킬 순서·전직을 관리할 수 있어요.</p>
      </section>
      <section class="grid"><h2>마을 소식</h2><ul class="news">${s.news.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        <div class="row"><button class="btn ghost sm" data-a="openSave">저장 관리</button></div>
      </section>
    </div>
  </div>`;
}

const JOB_FILTERS: [PartyFilter, string][] = [['all', '전체'], ['warrior', '전사'], ['mage', '마법사'], ['archer', '궁수'], ['priest', '성직자']];

/** 전열/후열 + 공격 대상 선택 (파티 편성·던전 입구 공용) */
function tacticsCtl(c: Character) {
  const row = rowOf(c), tg = c.target ?? 'auto';
  return `<div class="tactics">
      <div class="seg mini" role="group" aria-label="열">${(['front', 'back'] as const).map((r) => `<button class="${row === r ? 'on' : ''}" data-a="setRow" data-uid="${esc(c.uid)}" data-v="${r}" aria-pressed="${row === r}">${r === 'front' ? '전열' : '후열'}</button>`).join('')}</div>
      <div class="seg mini" role="group" aria-label="공격 대상">${(['auto', 'boss', 'adds'] as const).map((t) => `<button class="${tg === t ? 'on' : ''}" data-a="setTarget" data-uid="${esc(c.uid)}" data-v="${t}" aria-pressed="${tg === t}">${TARGET_NAME[t]}</button>`).join('')}</div>
    </div>`;
}
function pcard(c: Character, inParty: boolean, full: boolean) {
  const s = S!;
  const traits = [...c.traitIds, ...(c.uniqueTraitId ? [c.uniqueTraitId] : [])].map((t) => traitTag(t)).join('');
  const act = inParty
    ? `<button class="btn ghost sm" data-a="partyOut" data-uid="${esc(c.uid)}" ${s.party.length <= 1 ? 'disabled' : ''}>빼기</button>`
    : `<button class="btn sm" data-a="partyIn" data-uid="${esc(c.uid)}" ${full ? 'disabled' : ''}>넣기</button>`;
  const row = rowOf(c);
  const tactics = inParty ? tacticsCtl(c) : '';
  return `<div class="pcard ${inParty ? 'inparty' : ''} ${inParty ? `row-${row}` : ''}">
    <div class="ico">${avatar(c)}</div>
    <div class="cinfo"><div class="cname">${esc(c.name)} ${stars(c.grade)}${c.awakening ? `<span class="small g5">각성 ${c.awakening}</span>` : ''}</div>
      <div class="small mute">${esc(JOBS[c.jobId].name)} · Lv.${c.level} · <span class="cp">전투력 ${fmt(charPower(c))}</span></div>
      ${traits ? `<div class="tags">${traits}</div>` : ''}${tactics}</div>
    <div class="pact">${act}<button class="btn ghost sm" data-a="openChar" data-uid="${esc(c.uid)}">상세</button></div>
  </div>`;
}

function viewParty() {
  const s = S!;
  const party = G.partyChars(s);
  const full = party.length >= G.PARTY_MAX;
  const ordered = [...party].sort((a, b) => (rowOf(a) === rowOf(b) ? 0 : rowOf(a) === 'front' ? -1 : 1));
  const slots = Array.from({ length: G.PARTY_MAX }, (_, i) => ordered[i] ? pcard(ordered[i], true, full) : `<div class="pcard emptyslot"><span class="mute">빈 자리 · 아래에서 넣기</span></div>`).join('');
  const nFront = party.filter((c) => rowOf(c) === 'front').length;
  const bench = s.roster.filter((c) => !s.party.includes(c.uid))
    .filter((c) => partyFilter === 'all' || JOBS[c.jobId].base === partyFilter)
    .sort((a, b) => charPower(b) - charPower(a));
  const healer = hasHealer(party);
  return `<div class="wrap">${backBtn()}
    <div class="row" style="justify-content:space-between"><h2>파티 편성</h2>
      <span>전투력 <b class="cp">${fmt(G.statePower(s))}</b> · ${party.length}/${G.PARTY_MAX}명</span></div>
    <p class="small ${healer ? 'mute' : ''}" style="${healer ? '' : 'color:var(--gold)'}">${healer ? '회복 담당이 있어요.' : '성직자 계열이 없어요. 보스는 회복 없이 매우 어렵습니다.'}</p>
    <div class="row" style="margin-bottom:10px"><button class="btn sm" data-a="autoEquipParty">파티 자동 장착</button><button class="btn ghost sm" data-a="unequipParty">파티 장비 전체 해제</button><span class="small mute">새 용병으로 바꿀 땐 해제 → 자동 장착 순서로 누르면 편해요</span></div>
    <p class="small mute" style="margin:4px 0 8px">전열 ${nFront}명 · 후열 ${party.length - nFront}명 — 전열은 방어·마저 +5%에 적이 주로 노리고, 후열은 공격·마력 +5%에 덜 맞아요. 공격 대상: 자동(체력 낮은 적), 보스 우선, 잡몹 우선.</p>
    <div class="slots">${slots}</div>
    <div class="row" style="margin-top:22px;justify-content:space-between"><h3>대기 중인 단원 ${s.roster.length - party.length}명</h3><span class="small mute">전투력 높은 순</span></div>
    <div class="tabs" role="group" aria-label="직업 필터" style="margin:8px 0">${JOB_FILTERS.map(([v, n]) => `<button class="${partyFilter === v ? 'on' : ''}" data-a="partyFilter" data-v="${v}">${n}</button>`).join('')}</div>
    <div class="bench">${bench.map((c) => pcard(c, false, full)).join('') || '<p class="mute">대기 중인 단원이 없습니다. 길드에서 고용해 보세요.</p>'}</div>
  </div>`;
}

const LOCK_SVG = (on: boolean) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"/><path d="${on ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.5-2'}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

/** 교체 대상 중 영웅 등급 이상 */
function rareTargets(which: { kind: 'one'; i: number } | { kind: 'all' }) {
  const s = S!;
  const idx = which.kind === 'one' ? [which.i] : s.board.map((_, i) => i).filter((i) => !s.boardLocks[i]);
  return idx.map((i) => s.board[i]).filter(Boolean).map((c) => MERC_BY_ID[c!.mercId]).filter((d) => d.grade >= 4);
}

function boardConfirmBox() {
  if (!boardConfirm) return '';
  const list = rareTargets(boardConfirm);
  return `<div class="confirm" role="alertdialog" aria-label="교체 확인" style="margin-bottom:12px">
    <p><b>영웅 등급 이상입니다. 교체하시겠습니까?</b></p>
    <p class="small mute">${list.map((d) => `${esc(d.name)} (${GRADE_NAME[d.grade]})`).join(', ')}이(가) 사라져요. 남기고 싶으면 취소하고 자물쇠로 잠가 두세요.</p>
    <div class="row"><button class="btn danger" data-a="confirmRefresh">교체하기</button><button class="btn ghost" data-a="cancelRefresh">취소</button></div>
  </div>`;
}

function doRefresh(which: { kind: 'one'; i: number } | { kind: 'all' }) {
  boardConfirm = null;
  commit(which.kind === 'one' ? G.refreshSlot(S!, which.i) : G.refreshAll(S!));
}

let autoGrade: 4 | 5 = 4, autoTries = 50;
function viewGuild() {
  const s = S!;
  const lead = G.leadLevel(s);
  const board = s.board.map((c, i) => {
    if (!c) return `<div class="bcard empty"><span>빈 자리</span><button class="btn ghost sm" data-a="refresh" data-i="${i}">새 지원자 · ${refreshSlotCost(lead)}G</button></div>`;
    const d = MERC_BY_ID[c.mercId];
    const owned = s.roster.find((r) => r.mercId === d.id);
    const tr = [...d.traits, ...(d.unique ? [d.unique] : [])].map((t) => traitTag(t)).join('') || '<span class="small mute">특성 없음</span>';
    const locked = s.boardLocks[i];
    return `<div class="bcard gr${d.grade} ${locked ? 'locked' : ''}">
      <div class="row" style="gap:8px;align-items:flex-start"><div class="ico">${charSprite(d.job, d.name, 1, { size: 44 })}</div><div style="flex:1"><div class="cname">${esc(d.name)}</div>${stars(d.grade)} <span class="small mute">${GRADE_NAME[d.grade]}</span></div>
        <button class="lockbtn ${locked ? 'on' : ''}" data-a="lock" data-i="${i}" aria-pressed="${locked}" aria-label="${locked ? '잠금 해제' : '잠금'}" title="${locked ? '잠금 해제' : '잠그면 전체 교체에서 빠져요'}">${LOCK_SVG(locked)}</button></div>
      <div class="small">${JOBS[d.job].name} · Lv.${owned ? owned.level : c.level}</div>
      <div class="tags">${tr}</div>
      <div class="desc">${esc(d.desc)}${d.unique ? `<br><span class="small">${esc(TRAITS[d.unique].desc)}</span>` : ''}</div>
      ${owned ? `<div class="owned">이미 보유 · 고용 시 각성 ${owned.awakening}→${Math.min(5, owned.awakening + 1)}</div>` : ''}
      <div class="row" style="justify-content:space-between"><span class="price">${fmt(c.price)}G</span></div>
      <div class="row"><button class="btn sm" data-a="hire" data-i="${i}" ${owned?.awakening === 5 ? 'disabled' : ''}>${owned ? '각성' : '고용'}</button><button class="btn ghost sm" data-a="refresh" data-i="${i}" ${locked ? 'disabled title="잠금 중"' : ''}>${refreshSlotCost(lead)}G 교체</button></div>
    </div>`;
  }).join('');
  const roster = s.roster.map((c) => charCard(c, { inParty: s.party.includes(c.uid) })).join('');
  return `<div class="wrap">${backBtn()}
    <div class="row" style="justify-content:space-between"><h2>모험가 길드 <span class="mute small">Lv.${s.guildLevel}</span></h2>
      <button class="btn ghost sm" data-a="upgradeGuild">길드 확장 · ${fmt(G.guildUpgradeCost(s.guildLevel))}G</button></div>
    <div class="row" style="justify-content:space-between;margin:6px 0 10px">
      <p class="small mute" style="margin:0">지원자는 골드로만 바뀌어요. 자물쇠를 잠근 칸은 전체 교체에서 빠지고, 같은 용병을 다시 고용하면 각성합니다.</p>
      <button class="btn sm" data-a="refreshAll" ${s.boardLocks.every(Boolean) ? 'disabled' : ''}>전체 교체 ${s.board.filter((_, i) => !s.boardLocks[i]).length}칸 · ${fmt(G.refreshAllCost(s))}G</button></div>
    <div class="panel autorf"><b class="small">자동 교체</b>
      <div class="seg mini" role="group" aria-label="목표 등급">${([[4, '영웅 이상'], [5, '전설']] as const).map(([g, n]) => `<button class="${autoGrade === g ? 'on' : ''}" data-a="autoGrade" data-v="${g}">${n}</button>`).join('')}</div>
      <div class="seg mini" role="group" aria-label="최대 횟수">${[20, 50, 100, 300].map((n) => `<button class="${autoTries === n ? 'on' : ''}" data-a="autoTries" data-v="${n}">${n}회</button>`).join('')}</div>
      <button class="btn sm" data-a="autoRefresh" ${s.boardLocks.every(Boolean) ? 'disabled' : ''}>나올 때까지 돌리기</button>
      <span class="small mute">최대 ${fmt(G.refreshAllCost(s) * autoTries)}G · 나오면 멈추고 그 칸을 잠가요</span></div>
    ${boardConfirmBox()}
    <div class="board">${board}</div>
    <div class="row" style="margin-top:22px;justify-content:space-between"><h2>단원 ${s.roster.length}/${rosterLimit(s.guildLevel)}</h2><button class="btn sm" data-a="go" data-to="party">파티 편성 ${s.party.length}/${G.PARTY_MAX}</button></div>
    <div class="cards" style="margin-top:10px">${roster}</div>
  </div>`;
}

function allEquips() {
  const s = S!;
  const out: { e: Equip; owner?: Character }[] = [];
  for (const c of s.roster) for (const e of Object.values(c.equipment)) if (e) out.push({ e, owner: c });
  for (const e of s.inventory) out.push({ e });
  return out;
}

type GroupView = 'party' | 'all' | 'bag';
let smithView: GroupView = 'party';

const SLOTS: EquipSlot[] = ['weapon', 'armor', 'accessory'];

/** 제련 칸: 옵션 3칸 + 고정 토글 + 제련 버튼 */
function refineCtl(e: Equip) {
  const s = S!;
  const locked = new Set(e.locked ?? []);
  const cost = G.refineCost(e);
  const cells = Array.from({ length: OPTION_SLOTS }, (_, i) => {
    const o = e.options[i];
    if (!o) return `<div class="optcell empty"><span class="small mute">빈 칸</span></div>`;
    const on = locked.has(i);
    return `<div class="optcell ${on ? 'locked' : ''}"><span class="small">${esc(optText(o))}</span><button class="lockbtn ${on ? 'on' : ''}" data-a="optLock" data-e="${esc(e.uid)}" data-i="${i}" aria-pressed="${on}" aria-label="${on ? '고정 해제' : '고정'}" title="${on ? '고정 해제' : '고정하면 제련석 +2'}">${LOCK_SVG(on)}</button></div>`;
  }).join('');
  const can = s.refineStones >= cost.stones && s.gold >= cost.gold;
  return `<div class="refine"><div class="opts">${cells}</div>
    <div class="row" style="gap:6px;justify-content:space-between"><span class="small mute">제련석 ${cost.stones} · ${fmt(cost.gold)}G${locked.size ? ` · 고정 ${locked.size}칸` : ''}</span>
    <button class="btn sm" data-a="refine" data-e="${esc(e.uid)}" ${can ? '' : 'disabled'}>제련</button></div></div>`;
}
/** 강화 정보 한 줄 + 버튼 */
function enhanceCtl(e: Equip) {
  if (e.enhance >= 15) return `<div class="ectl"><span class="small mute">최대 강화</span></div>`;
  const cost = enhanceCost(e.enhance + 1);
  const rate = enhanceRate(e, useBlessing);
  return `<div class="ectl"><span class="small mute">+${e.enhance}→+${e.enhance + 1} · 성공 <b class="${rate >= 50 ? 'okt' : rate >= 25 ? 'closet' : 'lowt'}">${rate}%</b> · 강화석 ${cost.stone} · ${fmt(cost.gold)}G${e.failStack ? ` · 천장 +${e.failStack * 5}%p` : ''}</span>
    <span class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="enhance" data-e="${esc(e.uid)}">강화</button>${[5, 10, 15].filter((t) => e.enhance < t).slice(0, 2).map((t) => `<button class="btn ghost sm" data-a="autoEnh" data-e="${esc(e.uid)}" data-v="${t}" title="성공할 때까지 자동으로 강화 (재료가 떨어지면 멈춤)">+${t}까지</button>`).join('')}</span></div>`;
}

/** 캐릭터 한 명의 장비 3칸 묶음 */
function equipGroup(c: Character, mode: 'smith' | 'storage' | 'refine') {
  const s = S!;
  const cells = SLOTS.map((sl) => {
    const e = c.equipment[sl];
    const bag = s.inventory.filter((x) => EQUIP_BY_ID[x.baseId].slot === sl && G.canWear(c, x));
    const pick = mode === 'storage' && bag.length
      ? `<select data-a="equipSel" data-uid="${esc(c.uid)}" aria-label="${esc(c.name)} ${SLOT_NAME[sl]}"><option value="">${e ? '교체…' : '장착…'}</option>${bag.map((x) => `<option value="${esc(x.uid)}">${esc(EQUIP_BY_ID[x.baseId].name)}${x.enhance ? ` +${x.enhance}` : ''} (${RARITY_NAME[x.rarity]})</option>`).join('')}</select>` : '';
    const body = e ? equipLine(e) : '<span class="mute">비어 있음</span>';
    const ctl = mode === 'smith' ? (e ? enhanceCtl(e) : '')
      : mode === 'refine' ? (e ? refineCtl(e) : '')
      : `<div class="row" style="gap:6px">${e ? `<button class="btn ghost sm" data-a="unequip" data-uid="${esc(c.uid)}" data-slot="${sl}">해제</button>` : ''}${pick}</div>`;
    return `<div class="eqcell ${e ? `rb${e.rarity}` : 'none'}"><div class="small mute">${SLOT_NAME[sl]}</div><div>${body}</div>${ctl}</div>`;
  }).join('');
  return `<section class="eqgroup ${s.party.includes(c.uid) ? 'inparty' : ''}">
    <div class="eqhead"><div class="ico">${avatar(c)}</div><div><div class="cname">${esc(c.name)} ${stars(c.grade)}${s.party.includes(c.uid) ? '<span class="tag wear">출전</span>' : ''}</div>
      <div class="small mute">${esc(JOBS[c.jobId].name)} · Lv.${c.level} · <span class="cp">전투력 ${fmt(charPower(c))}</span></div></div></div>
    <div class="eqcells">${cells}</div></section>`;
}

const orderedRoster = (s: G.GameState) => [...G.partyChars(s), ...s.roster.filter((c) => !s.party.includes(c.uid))];

function bagList(mode: 'smith' | 'storage' | 'refine') {
  const s = S!;
  const slotOrder: Record<EquipSlot, number> = { weapon: 0, armor: 1, accessory: 2 };
  const list = [...s.inventory].sort((a, b) => slotOrder[EQUIP_BY_ID[a.baseId].slot] - slotOrder[EQUIP_BY_ID[b.baseId].slot] || b.rarity - a.rarity || b.enhance - a.enhance);
  if (!list.length) return '<p class="mute">가방이 비었습니다.</p>';
  return `<div class="items">${list.map((e) => {
    if (mode === 'smith') return `<div class="item"><div>${equipLine(e)}</div><div>${enhanceCtl(e)}</div></div>`;
    if (mode === 'refine') return `<div class="item col"><div>${equipLine(e)}</div>${refineCtl(e)}</div>`;
    const wearers = s.roster.filter((c) => G.canWear(c, e));
    return `<div class="item"><div>${equipLine(e)}</div><div class="row">
      ${wearers.length ? `<select data-a="equipToSel" data-e="${esc(e.uid)}" aria-label="장착할 캐릭터"><option value="">장착하기…</option>${wearers.map((c) => `<option value="${esc(c.uid)}">${esc(c.name)} (${esc(JOBS[c.jobId].name)})</option>`).join('')}</select>` : ''}
      <button class="btn ghost sm" data-a="sell" data-e="${esc(e.uid)}">${fmt(G.sellPrice(e))}G 판매</button><button class="btn ghost sm" data-a="dismantle" data-e="${esc(e.uid)}">분해 +${G.dismantleValue(e)}</button></div></div>`;
  }).join('')}</div>`;
}

function viewSmith() {
  const s = S!;
  const tabs: [GroupView, string][] = [['party', `출전 파티 ${s.party.length}`], ['all', `전체 단원 ${s.roster.length}`], ['bag', `가방 ${s.inventory.length}`]];
  const body = smithView === 'bag' ? bagList('smith')
    : (smithView === 'party' ? G.partyChars(s) : orderedRoster(s)).map((c) => equipGroup(c, 'smith')).join('');
  return `<div class="wrap">${backBtn()}
    <h2>대장간</h2>
    <p class="small mute">실패해도 단계는 내려가지 않고 재료만 소모됩니다. 실패할 때마다 다음 성공률 +5%p. 보유: 강화석 <b>${s.stones}</b> · 축복 <b>${s.blessings}</b></p>
    <label class="chk"><input type="checkbox" id="bless" data-a="toggleBless" ${useBlessing ? 'checked' : ''} ${s.blessings ? '' : 'disabled'}> 축복 주문서 사용 (성공률 +10%p)</label>
    <div class="tabs" role="group" aria-label="보기">${tabs.map(([v, n]) => `<button class="${smithView === v ? 'on' : ''}" data-a="smithView" data-v="${v}">${n}</button>`).join('')}</div>
    <div class="groups">${body}</div>
  </div>`;
}

/** 착용 중인 세트 효과 */
function setStatus(c: Character) {
  const cnt: Record<string, number> = {};
  for (const e of Object.values(c.equipment)) { const st = e && EQUIP_BY_ID[e.baseId].set; if (st) cnt[st] = (cnt[st] ?? 0) + 1; }
  const ids = Object.keys(cnt);
  if (!ids.length) return '';
  return `<div class="setbonus">${ids.map((id) => { const d = SET_BY_ID[id], n = cnt[id]; return `<div class="small"><span class="settag">${esc(d.name)} ${n}/3</span> <span class="${n >= 2 ? 'on' : 'mute'}">2세트: ${esc(d.twoText)}</span> · <span class="${n >= 3 ? 'on' : 'mute'}">3세트: ${esc(d.threeText)}</span></div>`; }).join('')}</div>`;
}
let forgeSet = 'ash';
let forgeJob: BaseJob = 'warrior';
function viewForge() {
  const s = S!;
  const set = SET_BY_ID[forgeSet];
  const bases = SET_BASES.filter((b) => b.set === forgeSet && (b.slot !== 'weapon' || b.jobs?.[0] === forgeJob));
  const raidSet = forgeSet === RAID_SET;
  const card = (b: typeof bases[number]) => {
    const c = CRAFT_COST[b.slot], rc = RAID_CRAFT_COST[b.slot];
    const can = raidSet ? s.scales >= rc.scales && s.gold >= rc.gold : s.cores >= c.cores && s.gold >= c.gold;
    const st = Object.entries(b.stats).map(([k, v]) => `${STAT_LABEL[k as StatKey]} +${v}`).join(', ');
    return `<div class="icard r5b forgecard"><div class="row" style="gap:10px;align-items:center"><span class="eico r5e setico" style="width:64px;height:64px">${equipSprite(equipKind(b.slot, b.jobs?.[0]), 8, { size: 60, set: b.set })}</span>
      <div><b class="r5">${esc(b.name)}</b><div class="small mute">${({ weapon: '무기', armor: '갑옷', accessory: '장신구' } as Record<string, string>)[b.slot]}${b.jobs ? ` · ${JOBS[b.jobs[0]].name}` : ''} · 기본 ${st}</div></div></div>
      <div class="small">재료: ${raidSet ? `벨리알의 파편 ${rc.scales} · ${fmt(rc.gold)}G` : `군단장의 핵 ${c.cores} · ${fmt(c.gold)}G`}</div>
      <button class="btn" data-a="craft" data-id="${b.id}" ${can ? '' : 'disabled'}>제작</button></div>`;
  };
  return `<div class="wrap">${backBtn()}
    <h2>제작소</h2>
    <p class="small mute">마왕성 입구에서 모은 재료로 원하는 세트 장비를 만들어요. 만든 장비는 영웅 ${SET_RARITY[4]}% · 전설 ${SET_RARITY[5]}% 등급으로 나오고, 강화·제련도 그대로 할 수 있어요.<br>
    재료 드롭(마왕성): 군단장의 핵 — 일반 ${SHARD_CHANCE.normal}% · 엘리트·보스 확정 (보스 25~38개) · 일일 던전 '군단의 잔해' · 레이드 / 세트 장비 직접 드롭 — 엘리트 ${SET_DROP_CHANCE.elite}% · 보스 ${SET_DROP_CHANCE.boss}%</p>
    <div class="panel row" style="gap:16px;flex-wrap:wrap">
      <span class="row" style="gap:6px">${equipSprite('accessory', 8, { size: 36, set: 'demon' })}<span>군단장의 핵 <b>${s.cores}</b></span></span>
      <span class="row" style="gap:6px">${monsterSprite('belialFire', { size: 36, tags: ['demon'] })}<span>벨리알의 파편 <b>${s.scales}</b></span></span>
      <span>골드 <b>${fmt(s.gold)}</b></span>
    </div>
    <div class="tabs" role="group" aria-label="세트" style="margin-top:12px">${SETS.map((x) => `<button class="${forgeSet === x.id ? 'on' : ''}" data-a="forgeSet" data-v="${x.id}">${x.id === RAID_SET ? '레이드 · ' : ''}${esc(x.name)}</button>`).join('')}</div>
    ${raidSet ? '<p class="small mute">레이드 장비는 개인 레이드에서 얻는 벨리알의 파편으로 만들어요. 레이드 보스에게만 강해지는 대신 다른 세트 효과를 포기해야 해요.</p>' : ''}
    <div class="panel setinfo"><b class="r5">${esc(set.name)} 세트</b> <span class="small mute">${esc(set.desc)}</span>
      <div class="small" style="margin-top:6px"><b>2세트</b> ${esc(set.twoText)} · <b>3세트</b> ${esc(set.threeText)}</div></div>
    <div class="tabs" role="group" aria-label="무기 직업">${(['warrior', 'mage', 'archer', 'priest'] as BaseJob[]).map((j) => `<button class="${forgeJob === j ? 'on' : ''}" data-a="forgeJob" data-v="${j}">${JOBS[j].name} 무기</button>`).join('')}</div>
    <div class="petgrid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${bases.map(card).join('')}</div>
  </div>`;
}

let petSel: string | null = null;
let petOdds = false;
function viewPets() {
  const s = S!;
  const act = G.activePet(s);
  const bag = s.pets.filter((p) => p.uid !== s.activePet).sort((a, b) => b.grade - a.grade || b.stars - a.stars || a.kind.localeCompare(b.kind));
  const sel = bag.find((p) => p.uid === petSel) ?? null;
  const owned = new Set(s.pets.map((p) => `${p.kind}:${p.grade}`));
  const stars = (n: number) => `<span class="stars" aria-label="${n}성">${'★'.repeat(n)}<span class="off">${'☆'.repeat(PET_MAX_STARS - n)}</span></span>`;
  const hero = act ? `<div class="pethero r${act.grade}b">
      <div class="petpic big">${petSprite(act.kind, act.grade, { size: 128 })}</div>
      <span class="tag">동행 중</span>
      <h3 class="g${act.grade}" style="margin:6px 0 0">${esc(PET_BY_ID[act.kind].name)}</h3>
      <div class="small g${act.grade}">${PET_GRADE_NAME[act.grade]} ${stars(act.stars)}</div>
      <p style="margin:6px 0 0"><b>${esc(petEffectText(act))}</b> <span class="small mute">· 출전 파티 전원</span></p>
      ${act.stars < PET_MAX_STARS ? `<p class="small mute" style="margin:4px 0 0">같은 ${PET_GRADE_NAME[act.grade]} ${esc(PET_BY_ID[act.kind].name)}이(가) 또 나오면 자동으로 ★+1</p>` : '<p class="small g5" style="margin:4px 0 0">최대 성급!</p>'}
    </div>` : `<div class="pethero empty">${itemSprite('egg', { size: 96 })}<p class="mute">동행 중인 펫이 없어요. 알을 부화시켜 보세요.</p></div>`;
  const tiles = bag.map((p) => `<button class="pettile r${p.grade}b ${p.uid === petSel ? 'on' : ''}" data-a="petSel" data-id="${p.uid}" aria-pressed="${p.uid === petSel}">
      ${petSprite(p.kind, p.grade, { size: 56 })}<span class="pn g${p.grade}">${esc(PET_BY_ID[p.kind].name)}</span><span class="pg g${p.grade}">${PET_GRADE_NAME[p.grade]}</span><span class="small">${stars(p.stars)}</span></button>`).join('');
  const cmp = (p: Pet) => {
    if (!act || act.kind !== p.kind) return '';
    const d = PET_GRADE_PCT[p.grade] + p.stars - (PET_GRADE_PCT[act.grade] + act.stars);
    return ` <span class="small ${d > 0 ? 'up' : d < 0 ? 'down' : 'mute'}">(지금보다 ${d > 0 ? '+' : ''}${d}%p)</span>`;
  };
  const detail = sel ? `<div class="petsel r${sel.grade}b">${petSprite(sel.kind, sel.grade, { size: 64 })}<div class="psi"><b class="g${sel.grade}">${PET_GRADE_NAME[sel.grade]} ${esc(PET_BY_ID[sel.kind].name)}</b> ${stars(sel.stars)}<div class="small">${esc(petEffectText(sel))}${cmp(sel)}</div><div class="small mute">${esc(PET_BY_ID[sel.kind].desc)}</div></div>
      <div class="row psb" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="petUse" data-id="${sel.uid}">데려가기</button><button class="btn ghost sm" data-a="petSell" data-id="${sel.uid}">보내기 +${fmt(petSellPrice(sel))}G</button></div></div>` : '';
  const lowN = bag.filter((p) => p.grade <= 2).length;
  const recent = G.lastHatch.length ? `<div class="hatch">${G.lastHatch.slice(0, 10).map((h) => `<span class="hx r${h.grade}b" title="${PET_GRADE_NAME[h.grade]} ${esc(PET_BY_ID[h.kind].name)}">${petSprite(h.kind, h.grade, { size: 36 })}</span>`).join('')}</div>` : '';
  return `<div class="wrap">${backBtn()}
    <h2>펫 우리</h2>
    ${hero}
    <div class="panel petshop">
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">${itemSprite('egg', { size: 40 })}<b style="flex:1">펫 알 ${fmt(EGG_PRICE)}G</b>
        <button class="btn" data-a="buyEgg" data-n="1" ${s.gold < EGG_PRICE ? 'disabled' : ''}>1개</button>
        <button class="btn ghost" data-a="buyEgg" data-n="10" ${s.gold < EGG_PRICE * 10 ? 'disabled' : ''}>10개 · ${fmt(EGG_PRICE * 10)}G</button></div>
      ${recent}
      <button class="linkbtn small" data-a="petOdds">${petOdds ? '▴ 접기' : '▾ 확률·규칙 보기'}</button>
      ${petOdds ? `<p class="small mute" style="margin:4px 0 0">부화 확률: 일반 ${EGG_ODDS[1]}% · 고급 ${EGG_ODDS[2]}% · 희귀 ${EGG_ODDS[3]}% · 영웅 ${EGG_ODDS[4]}% · 전설 ${EGG_ODDS[5]}%<br>등급별 효과 ${Object.values(PET_GRADE_PCT).join('/')}% + ★ 하나당 1%p (최대 ★${PET_MAX_STARS}). 같은 종류·등급이 나오면 자동 합성돼요. 보스 첫 처치·무한 탑·월드보스에서도 알이 나와요.</p>` : ''}
    </div>
    <div class="row" style="justify-content:space-between;align-items:baseline;margin-top:14px"><h3 style="margin:0">펫 가방 <span class="small mute">${bag.length}마리 · 도감 ${owned.size}/${PET_KINDS.length * 5}</span></h3>
      ${lowN ? `<button class="btn ghost sm" data-a="petSellLow">일반·고급 ${lowN}마리 보내기</button>` : ''}</div>
    ${detail}
    <div class="petbag">${tiles || '<p class="mute">가방이 비어 있어요.</p>'}</div>
  </div>`;
}

let refineView: GroupView = 'party';
function viewRefinery() {
  const s = S!;
  const tabs: [GroupView, string][] = [['party', `출전 파티 ${s.party.length}`], ['all', `전체 단원 ${s.roster.length}`], ['bag', `가방 ${s.inventory.length}`]];
  const body = refineView === 'bag' ? bagList('refine')
    : (refineView === 'party' ? G.partyChars(s) : orderedRoster(s)).map((c) => equipGroup(c, 'refine')).join('');
  return `<div class="wrap">${backBtn()}
    <h2>제련소</h2>
    <p class="small mute">제련석으로 장비 옵션 3칸을 새로 새겨요. 마음에 드는 옵션은 자물쇠로 고정하면 그대로 남고, 고정한 칸마다 제련석이 2개씩 더 들어요. 깊은 층 장비일수록 옵션 수치가 높아요.<br>
    제련석은 던전에서만 나와요: 일반 몬스터 ${REFINE_CHANCE.normal}% · 엘리트 ${REFINE_CHANCE.elite}% · 보스 ${REFINE_CHANCE.boss}%. 보유 <b>${s.refineStones}</b>개</p>
    <div class="tabs" role="group" aria-label="보기">${tabs.map(([v, n]) => `<button class="${refineView === v ? 'on' : ''}" data-a="refineView" data-v="${v}">${n}</button>`).join('')}</div>
    <div class="groups">${body}</div>
  </div>`;
}

function viewShop() {
  const s = S!;
  const pots = G.potionsAvailable(s).map((p) => `<div class="item"><div><span class="eico">${potionIcon(p.id)}</span><span class="iname">${esc(p.name)}</span> <span class="small mute">보유 ${s.potions[p.id] ?? 0}</span><div class="istat">${MOD_LABEL[p.mod.key] ?? (p.mod.key === 'goldGain' ? '골드 획득' : p.mod.key)} +${p.mod.value}${p.mod.kind === 'pct' ? '%' : '%p'} · 이번 탐험 동안 파티 전체</div></div><div class="row buyn">${[1, 10, 100].map((n) => `<button class="btn sm ${n > 1 ? 'ghost' : ''}" data-a="buyPotion" data-id="${p.id}" data-n="${n}" ${s.gold < p.price * n ? 'disabled' : ''}>${n > 1 ? `+${n} · ` : ''}${fmt(p.price * n)}G</button>`).join('')}</div></div>`).join('');
  const eq = G.shopList(s).map((x) => {
    const b = EQUIP_BY_ID[x.baseId];
    const fake: Equip = { uid: '', baseId: x.baseId, rarity: x.rarity, enhance: 0, failStack: 0, options: [] };
    return `<div class="item"><div>${equipLine(fake)}</div><button class="btn sm" data-a="buyEquip" data-id="${b.id}" data-r="${x.rarity}">${fmt(x.price)}G</button></div>`;
  }).join('');
  const sell = s.inventory.map((e) => `<div class="item"><div>${equipLine(e)}</div><button class="btn ghost sm" data-a="sell" data-e="${esc(e.uid)}">${fmt(G.sellPrice(e))}G 판매</button></div>`).join('');
  const deals = s.deals.map((d, i) => `<div class="icard r${d.equip.rarity}b"><div class="who"><span class="small mute">오늘의 특가</span></div><div>${equipLine(d.equip)}</div><div class="row" style="margin-top:auto"><button class="btn sm" data-a="buyDeal" data-i="${i}">${fmt(d.price)}G 구매</button></div></div>`).join('');
  const sp = G.stonePrice(s);
  return `<div class="wrap">${backBtn()}
    <h2>잡화점</h2>
    <section class="grid" style="margin-top:12px">
      <div class="row" style="justify-content:space-between"><h3>오늘의 특가 <span class="small mute">탐험에서 돌아올 때마다 바뀌어요</span></h3></div>
      <div class="igrid" style="margin-top:0">${deals || '<p class="mute">오늘 특가는 모두 팔렸어요.</p>'}</div>
      <div class="item"><div><span class="iname">강화석</span> <span class="small mute">보유 ${s.stones} · 오늘 남은 재고 ${s.stoneStock}개</span><div class="istat">개당 ${fmt(sp)}G</div></div>
        <div class="row">${[1, 5, 10].map((n) => `<button class="btn sm" data-a="buyStones" data-n="${n}" ${s.stoneStock ? '' : 'disabled'}>${n}개 ${fmt(sp * Math.min(n, Math.max(1, s.stoneStock)))}G</button>`).join('')}</div></div>
    </section>
    <div class="cols" style="margin-top:16px">
      <section class="grid"><h3>버프 물약</h3><div class="items">${pots}
        <div class="item"><div><span class="iname">축복 주문서</span> <span class="small mute">보유 ${s.blessings}</span><div class="istat">강화 성공률 +10%p</div></div><div class="row buyn">${[1, 10].map((n) => `<button class="btn sm ${n > 1 ? 'ghost' : ''}" data-a="buyBless" data-n="${n}" ${s.gold < G.blessingPrice * n ? 'disabled' : ''}>${n > 1 ? `+${n} · ` : ''}${fmt(G.blessingPrice * n)}G</button>`).join('')}</div></div></div>
        <h3 style="margin-top:12px">장비</h3><div class="items">${eq}</div></section>
      <section class="grid"><h3>가방 판매</h3><div class="items">${sell || '<p class="mute">팔 장비가 없습니다.</p>'}</div></section>
    </div>
  </div>`;
}

function viewTraining() {
  const s = S!;
  const list = [...s.roster].sort((a, b) => (s.party.includes(b.uid) ? 1 : 0) - (s.party.includes(a.uid) ? 1 : 0) || b.level - a.level);
  const rows = list.map((c) => {
    const no = G.canTrain(s, c);
    const cost = G.trainCost(c);
    return `<div class="pcard ${s.party.includes(c.uid) ? 'inparty' : ''}"><div class="ico">${avatar(c)}</div>
      <div class="cinfo"><div class="cname">${esc(c.name)} ${stars(c.grade)}</div>
        <div class="small mute">${esc(JOBS[c.jobId].name)} · Lv.${c.level} / 상한 ${levelCap(c)} · <span class="cp">전투력 ${fmt(charPower(c))}</span></div>
        ${no ? `<div class="small mute">${esc(no)}</div>` : ''}</div>
      <div class="pact"><button class="btn sm" data-a="train" data-uid="${esc(c.uid)}" ${no ? 'disabled' : ''}>Lv.${c.level + 1} · ${fmt(cost)}G</button></div></div>`;
  }).join('');
  return `<div class="wrap">${backBtn()}
    <h2>훈련소</h2>
    <p class="mute">골드를 내고 단원을 한 레벨씩 훈련시켜요. 직업 레벨 상한까지 올릴 수 있어요.</p>
    <div class="bench">${rows || '<p class="mute">훈련할 단원이 없습니다.</p>'}</div>
  </div>`;
}

function viewTemple() {
  const s = S!;
  const list = s.roster.filter((c) => c.traitIds.length);
  const rows = list.map((c) => {
    const cost = G.rerollTraitCost(c);
    return `<div class="pcard"><div class="ico">${avatar(c)}</div>
      <div class="cinfo"><div class="cname">${esc(c.name)} ${stars(c.grade)}</div>
        <div class="small mute">${esc(JOBS[c.jobId].name)} · Lv.${c.level} · 재설정 ${fmt(cost)}G</div>
        <div class="slist" style="margin-top:6px">${c.traitIds.map((t, i) => `<div class="sitem"><span class="t">${traitTag(t)}</span><button class="btn ghost sm" data-a="reroll" data-uid="${esc(c.uid)}" data-i="${i}">다시 받기</button></div>`).join('')}
        ${c.uniqueTraitId ? `<div class="sitem"><span class="t">${traitTag(c.uniqueTraitId)}</span><span class="small mute">고유 특성은 바꿀 수 없어요</span></div>` : ''}</div></div></div>`;
  }).join('');
  return `<div class="wrap">${backBtn()}
    <h2>신전</h2>
    <p class="mute">골드를 바치고 특성 하나를 무작위로 다시 받아요. 지금 가진 특성과 겹치지 않는 것 중에서 나와요.</p>
    <div class="bench">${rows || '<p class="mute">특성을 가진 단원이 없습니다.</p>'}</div>
  </div>`;
}

/** 선택한 층에서 얻을 수 있는 것 (확률 공개) */
function dropInfo(floor: number) {
  const z = zoneOf(floor);
  const boss = z.boss.floor === floor;
  const tier = tierOfFloor(floor);
  const w = rarityWeights(floor);
  const sum = w.reduce((a, b) => a + b, 0);
  const pct = (x: number) => `${(Math.round((x / sum) * 1000) / 10).toString()}%`;
  const items = EQUIP_BASES.filter((b) => b.tier === tier);
  const st = STONE_CHANCE(floor), bl = BLESS_CHANCE(floor);
  const mons = z.pool.map((p) => esc(MONSTERS[p.id].name)).join(', ');
  return `<details class="panel drops" ${dropOpen ? 'open' : ''} data-drops><summary><h3>${localFloor(floor)}층에서 얻을 수 있는 것</h3></summary>
    <div class="dgrid">
      <div><div class="small mute">등장 몬스터</div>
        <p>${boss ? `<b class="g5">보스 ${esc(MONSTERS[z.boss.id].name)}</b> + ${z.boss.adds.map((id) => esc(MONSTERS[id].name)).join(', ')}` : `${mons}<br><span class="small">웨이브마다 10% 확률로 엘리트 <b class="g4">${esc(MONSTERS[z.elite].name)}</b></span>`}</p></div>
      <div><div class="small mute">장비 (T${tier})</div>
        <div class="tags">${items.map((b) => `<span class="tag">${esc(b.name)}</span>`).join('')}</div></div>
      <div><div class="small mute">장비가 나올 확률</div>
        <p class="small">일반 몬스터 ${DROP_CHANCE.normal}% · 엘리트 ${DROP_CHANCE.elite}% · 보스 ${DROP_CHANCE.boss}% (희귀 이상 확정)</p>
        <div class="small mute" style="margin-top:6px">나온 장비의 등급 확률</div>
        <div class="rprob">${(['일반', '고급', '희귀', '영웅', '전설'] as const).map((n, i) => `<span class="r${i + 1}">${n} ${pct(w[i])}</span>`).join('')}</div></div>
      <div><div class="small mute">재료</div>
        <p class="small">강화석: 일반 몬스터 ${Math.round(st.normal * 10) / 10}% (${1 + Math.floor(floor / 15)}개) · 엘리트 ${st.elite}% · ${boss ? `보스 확정 ${st.bossCount}개` : `보스 처치 시 확정`}<br>
        축복 주문서: 엘리트 ${bl.elite}% · ${boss ? `보스 확정 ${bl.bossCount}장` : '보스 처치 시 확정'}<br>
        제련석: 일반 몬스터 ${REFINE_CHANCE.normal}% · 엘리트 ${REFINE_CHANCE.elite}% · 보스 ${REFINE_CHANCE.boss}%${floor > 50 ? `<br>군단장의 핵: 일반 ${SHARD_CHANCE.normal}% · 엘리트·보스 확정<br><b class="r5">세트 장비</b>: 엘리트 ${SET_DROP_CHANCE.elite}% · 보스 ${SET_DROP_CHANCE.boss}% (4세트 중 무작위)` : ''}${boss ? '<br>보스 첫 처치: 희귀 이상 장비 1개 + 보너스 골드' : ''}</p></div>
    </div>
    <p class="small mute" style="margin:8px 0 0">황금손 특성·탐욕의 물약 같은 효과로 골드·장비 획득량이 늘 수 있어요.</p>
  </details>`;
}

let gateRegion: string | null = null;
/** 던전 입구 첫 화면: 지역 고르기 */
function viewRegions() {
  const s = S!;
  const cards = REGIONS.map((r) => {
    if (!r.floors) return `<div class="region locked"><h3>${esc(r.name)}</h3><p class="small mute">${esc(r.desc)}</p><span class="tag">준비 중</span></div>`;
    const [a, b] = r.floors;
    const open = s.maxFloor + 1 >= a;
    const best = Math.max(0, Math.min(s.maxFloor, b) - a + 1);
    const total = b - a + 1;
    const zones = ZONES.filter((z) => z.floors[0] >= a && z.floors[1] <= b).map((z) => z.name.replace(/^마왕성 · /, '')).join(' · ');
    return `<button class="region ${open ? '' : 'locked'}" data-a="pickRegion" data-v="${r.id}" ${open ? '' : 'disabled'}>
      <h3>${esc(r.name)}</h3><p class="small">${esc(r.desc)}</p>
      <div class="small mute">${esc(zones)}</div>
      <div class="bar xp" style="margin-top:8px"><i style="width:${Math.round((best / total) * 100)}%"></i></div>
      <div class="small">${open ? `진행 ${best}/${total}층${best >= total ? ' · 정복!' : ''}` : `${REGIONS[REGIONS.indexOf(r) - 1]?.name ?? ''} 끝까지 클리어하면 열려요`}</div>
    </button>`;
  }).join('');
  return `<div class="wrap">${backBtn()}
    <h2>던전 입구</h2>
    <p class="mute">들어갈 지역을 고르세요. 지역마다 1층부터 시작하고, 5층마다 새 구역과 보스가 있어요.</p>
    <div class="regions">${cards}
    </div>
  </div>`;
}

/** 실행 중 층 표시: 일일 던전이면 "황금 금고 3단계" */
function runLabel(f: number) {
  if (EX?.settings.tower) return `무한 탑 ${f}층`;
  if (EX?.settings.rift) return `균열 ${f}층`;
  const rd = EX?.settings.raid;
  if (rd) return `레이드 · ${RAID_DIFF_NAME[rd.diff]}`;
  const d = EX?.settings.daily;
  return d ? `${DAILY_BY_ID[d.id].name} ${d.stage}단계` : `${localFloor(f)}층`;
}
const dailyStage: Record<string, number> = {};
const REWARD_ICON: Record<string, () => string> = {
  gold: () => itemSprite('gold', { size: 40 }), refine: () => itemSprite('refine', { size: 40 }), stone: () => itemSprite('stone', { size: 40 }),
  exp: () => itemSprite('scroll', { size: 40 }), legion: () => equipSprite('accessory', 8, { size: 40, set: 'demon' }),
};
let raidDiff: RaidDiff = 'normal';
function viewRaid() {
  const s = S!;
  const st = G.raidState(s), form = raidForm(st.week);
  if (!G.raidOpen(s, raidDiff)) raidDiff = 'normal';
  const max = raidMaxHp(raidDiff), left = G.raidHpLeft(s, raidDiff), pct = (left / max) * 100;
  const claimed = new Set(st.claimed[raidDiff] ?? []);
  const m = RAID_DIFF[raidDiff].mult;
  const ms: [number, string][] = ([[25, `제련석 ${10 * m}`], [50, `군단장의 핵 ${70 * m}`], [75, `펫 알 (${RAID_DIFF[raidDiff].eggMin === 4 ? '영웅' : '희귀'} 이상)`], [100, `전설 세트 장비 · 핵 ${5 * m} · 골드 ${fmt(100000 * m)}`]] as [number, string][]).map(([p, t]) => [p, `${t} · 벨리알의 파편 ${MILESTONE_SCALES[p] * m}`]);
  gatePotions = gatePotions.filter((id) => (s.potions[id] ?? 0) > 0);
  const owned = POTIONS.filter((p) => (s.potions[p.id] ?? 0) > 0);
  const open = s.maxFloor >= 50;
  return `<div class="wrap">${backBtn()}
    <h2>개인 레이드</h2>
    ${open ? '' : '<p class="panel">마왕숲 50층을 클리어하면 열려요.</p>'}
    <div class="panel raidboss">
      <div class="raidpic">${monsterSprite(form.monster, { size: 128, boss: true, tags: ['demon', 'boss'] })}</div>
      <div style="flex:1;min-width:240px">
        <div class="small mute">이번 주 · ${nextResetText()} 형태가 바뀜</div>
        <h3 style="margin:2px 0">군단장 벨리알 · ${esc(form.name)}</h3>
        <p class="small" style="margin:4px 0"><b class="r5">공략</b> ${esc(form.tip)}</p>
        <div class="tabs" role="group" aria-label="난이도" style="margin:8px 0">${RAID_DIFFS.map((d) => `<button class="${raidDiff === d ? 'on' : ''}" data-a="raidDiff" data-v="${d}" ${G.raidOpen(s, d) ? '' : 'disabled'} title="${G.raidOpen(s, d) ? '' : '이전 난이도를 처치하면 열려요'}">${RAID_DIFF_NAME[d]}${st.everKilled[d] ? ' ✓' : ''}</button>`).join('')}</div>
        <div class="bar hp raidbar" aria-label="남은 HP"><i style="width:${pct.toFixed(1)}%"></i></div>
        <div class="row small" style="justify-content:space-between"><span>남은 HP ${fmt(left)} / ${fmt(max)} (${pct.toFixed(1)}%)</span><span>이번 주 최고 한 방 ${fmt(st.best)}</span></div>
      </div>
    </div>
    <div class="grid2">
      <div class="panel">
        <h3>구간 보상 <span class="small mute">이번 주 · ${RAID_DIFF_NAME[raidDiff]}</span></h3>
        ${ms.map(([p, t]) => `<div class="msrow ${claimed.has(p) ? 'done' : ''}"><b>${p === 100 ? '처치' : `${p}%`}</b><span class="small">${esc(t)}</span><span class="small">${claimed.has(p) ? '받음' : ''}</span></div>`).join('')}
        <p class="small" style="margin:8px 0 0">구간마다 <b>벨리알의 파편</b>도 받아요. 파편으로 제작소에서 <b>군단장 사냥꾼 세트</b>(레이드 보스 피해 최대 +70%)를 만들 수 있어요. 보유 <b>${s.scales}</b>개 <button class="btn ghost sm" data-a="go" data-to="forge">제작소</button></p>
        <p class="small mute" style="margin:6px 0 0">도전할 때마다 가한 피해만큼 골드·제련석·벨리알의 파편도 받아요. 한 번에 ${RAID_ROUNDS}라운드, 파티가 쓰러져도 넣은 피해는 남아요.</p>
      </div>
      <div class="panel">
        <h3>도전 <span class="small mute">오늘 ${G.raidLeft(s)}/${RAID_LIMIT} · 자정 초기화</span></h3>
        <p class="small">파티 전투력 ${fmt(G.statePower(s))} · 펫 ${G.activePet(s) ? esc(PET_BY_ID[G.activePet(s)!.kind].name) : '없음'}</p>
        <h3 style="margin-top:10px">버프 물약 <span class="small mute">최대 ${MAX_POTIONS}종</span></h3>
        <div class="pots">${owned.map((p) => `<button class="pot ${gatePotions.includes(p.id) ? 'on' : ''}" data-a="pickPotion" data-id="${p.id}"><span class="row" style="gap:4px">${potionIcon(p.id, 24)}${esc(p.name)}</span><span class="small mute">×${s.potions[p.id]}</span></button>`).join('') || '<p class="small mute">물약이 없어요.</p>'}</div>
        <button class="btn" style="margin-top:10px;width:100%" data-a="raidGo" ${open && G.raidLeft(s) > 0 && left > 0 ? '' : 'disabled'}>${left > 0 ? `${RAID_DIFF_NAME[raidDiff]} 도전` : '이번 주 처치 완료'}</button>
      </div>
    </div>
  </div>`;
}
function startRaidRun() {
  const s = S!;
  const ex = G.startRaid(s, raidDiff, gatePotions);
  if (typeof ex === 'string') { toast(ex, true); return; }
  EX = ex;
  gatePotions = [];
  saveGame(s);
  units = {};
  screen = 'dungeon';
  render();
  drawParty();
  playFloor();
}

const unlockShort = (f: number) => `${regionOf(f).name.includes('성') ? '성' : '숲'} ${localFloor(f)}층`;

let rankKind: Cloud.RankKind = 'tower_best';
let rankData: { kind: string; top: Cloud.RankRow[]; mine: number | null; at: number } | null = null;
let rankLoading = false;
async function loadRanks(force = false) {
  if (rankLoading) return;
  if (!force && rankData && rankData.kind === rankKind && Date.now() - rankData.at < 30000) return;
  rankLoading = true; render();
  const r = await Cloud.fetchRanks(rankKind, raidWeek());
  rankLoading = false;
  rankData = r ? { kind: rankKind, ...r, at: Date.now() } : { kind: rankKind, top: [], mine: null, at: Date.now() };
  if (!r) toast('랭킹을 불러오지 못했어요', true);
  if (screen === 'rank') render();
}
function viewRank() {
  const kinds: [Cloud.RankKind, string][] = [['tower_best', '무한 탑'], ['power', '파티 전투력'], ['raid_best', '이번 주 레이드']];
  if (!rankData || rankData.kind !== rankKind) setTimeout(() => loadRanks(), 0);
  const val = (r: Cloud.RankRow) => rankKind === 'tower_best' ? `${r.tower_best}층` : rankKind === 'power' ? fmt(r.power) : fmt(r.raid_best);
  const rows = rankData && rankData.kind === rankKind ? rankData.top.map((r, i) => `<li class="${r.username === Cloud.username ? 'me' : ''}"><span class="rk ${i < 3 ? `top${i + 1}` : ''}">${i + 1}</span><b>${esc(r.username)}</b><span class="rv">${val(r)}</span></li>`).join('') : '';
  const mine = rankData?.kind === rankKind ? rankData.mine : null;
  return `<div class="wrap">${backBtn()}
    <h2>명예의 전당</h2>
    <div class="tabs" role="group" aria-label="랭킹 종류">${kinds.map(([k, n]) => `<button class="${rankKind === k ? 'on' : ''}" data-a="rankKind" data-v="${k}">${n}</button>`).join('')}</div>
    <p class="small mute">${rankKind === 'tower_best' ? '무한 탑 최고 돌파 층' : rankKind === 'power' ? '출전 파티 전투력 (저장할 때 갱신)' : `이번 주(${raidForm().name}) 한 번 도전에서 넣은 최고 피해`} · 내 순위 <b>${mine ? `${mine}위` : '기록 없음'}</b>
      <button class="btn ghost sm" data-a="rankRefresh" ${rankLoading ? 'disabled' : ''}>${rankLoading ? '불러오는 중…' : '새로고침'}</button></p>
    <ol class="ranklist">${rows || `<p class="mute">${rankLoading ? '불러오는 중…' : '아직 기록이 없어요.'}</p>`}</ol>
  </div>`;
}

// ───────── 월드보스 (서버) ─────────
let wb: Awaited<ReturnType<typeof Cloud.wbStatus>> = null;
let wbLoading = false, wbBusy = false, wbAt = 0;
let wbLast: any = null;
async function loadWB(force = false) {
  if (wbLoading || (!force && Date.now() - wbAt < 15000)) return;
  wbLoading = true;
  wb = await Cloud.wbStatus(raidWeek(), kstToday());
  wbLoading = false; wbAt = Date.now();
  Cloud.subscribeWB((b) => { if (wb && b.season === raidWeek()) { wb.boss = b; if (screen === 'world') { const el = document.getElementById('wbhp'); if (el) el.outerHTML = wbHpBar(b); } } });
  if (screen === 'world') render();
}
const kstToday = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
function wbHpBar(b: Cloud.WBBoss | null) {
  if (!b) return `<div id="wbhp" class="small mute">첫 도전이 들어오면 이번 주 보스가 나타나요.</div>`;
  const pct = Math.max(0, (b.hp / b.max_hp) * 100);
  return `<div id="wbhp"><div class="bar e big"><i style="width:${pct}%"></i></div><p class="small" style="margin:4px 0 0">${b.killed_at ? `☠ 처치 완료${b.killer ? ` · 막타 ${esc(b.killer)}` : ''}` : `HP ${fmt(b.hp)} / ${fmt(b.max_hp)} (${pct.toFixed(1)}%)`}</p></div>`;
}
function viewWorld() {
  const s = S!;
  if (!wb && !wbLoading) setTimeout(() => loadWB(true), 0);
  else if (Date.now() - wbAt > 15000) setTimeout(() => loadWB(), 0);
  const info = wbInfo(raidWeek());
  const b = wb?.boss ?? null;
  const left = Math.max(0, WB_LIMIT - (wb?.used ?? 0));
  const top = (wb?.top ?? []).map((r, i) => `<li class="${r.user_id === Cloud.session?.user.id ? 'me' : ''}"><span class="rk ${i < 3 ? `top${i + 1}` : ''}">${i + 1}</span><b>${esc(r.username)}</b><span class="small mute">${r.hits}회</span><span class="rv">${fmt(r.total)}</span></li>`).join('');
  const last = wbLast ? `<div class="panel raidres"><div><b>이번 도전 피해 ${fmt(wbLast.dealt)}</b>${wbLast.killedNow ? ' · ☠ 막타! 월드보스를 쓰러뜨렸다!' : ''}${wbLast.wiped ? ' · 파티 전멸' : ''}</div><div class="small mute">남은 도전 ${wbLast.attemptsLeft}회</div></div>${wbLast.report ? reportPanel({ report: wbLast.report, lost: false, diag: [] } as unknown as G.ExpeditionSummary) : ''}` : '';
  return `<div class="wrap">${backBtn()}
    <h2>월드보스</h2>
    <p class="mute">모든 모험가가 <b>피통 하나를 함께 깎는</b> 주간 보스예요. 하루 ${WB_LIMIT}번 도전할 수 있고, 피해는 <b>서버가 직접 계산</b>해요. 쓰러뜨리면 기여 순위에 따라 보상을 받아요. 매주 월요일에 새 형태로 돌아와요.</p>
    ${!G.towerOpen(s) ? '<p class="small" style="color:var(--gold)">마왕숲 50층 이전 파티는 거의 피해를 못 넣어요. 그래도 참여하면 참여 보상은 받을 수 있어요.</p>' : ''}
    ${(wb?.claimable ?? []).map((sn) => `<div class="quest ready"><div class="row" style="justify-content:space-between;gap:10px;align-items:center"><b>✔ ${sn === raidWeek() ? '이번 주' : '지난'} 월드보스 처치 보상</b><button class="btn sm" data-a="wbClaim" data-v="${sn}">보상 받기</button></div></div>`).join('')}
    <div class="panel raidboss"><div class="raidpic">${monsterSprite(info.monster, { size: 128, boss: true, tags: ['demon'] })}</div>
      <div style="flex:1;min-width:0"><h3 style="margin:0">${esc(info.name)}</h3><p class="small mute" style="margin:2px 0 8px">${esc(info.form)} · ${esc(info.tip)}</p>
      ${wbHpBar(b)}
      <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn" data-a="wbAttack" ${left && !wbBusy && !b?.killed_at ? '' : 'disabled'}>${wbBusy ? '전투 중…' : `도전 (오늘 ${left}/${WB_LIMIT})`}</button><button class="btn ghost sm" data-a="wbRefresh">새로고침</button></div>
      <p class="small mute" style="margin:6px 0 0">지금 출전 파티·장비·펫으로 싸워요 (도전할 때 서버에 저장 후 계산).</p></div></div>
    ${last}
    <div class="panel"><h3 style="margin-top:0">기여 순위 <span class="small mute">내 기여 ${wb?.mine ? `${fmt(wb.mine.total)} · ${wb.myRank}위` : '없음'}</span></h3>
      <ol class="ranklist">${top || `<p class="mute">${wbLoading ? '불러오는 중…' : '아직 아무도 도전하지 않았어요.'}</p>`}</ol>
      <p class="small mute">보상: 1위 핵 300·전설 알 / 상위 10% 핵 200·영웅 알 / 30% 핵 140 / 60% 핵 90 / 참여 핵 50 (+제련석·골드)</p></div>
  </div>`;
}
async function wbAttack() {
  if (wbBusy) return;
  wbBusy = true; render();
  if (S && !(await saveGameNow(S))) { wbBusy = false; toast('서버 저장에 실패했어요. 잠시 후 다시 시도하세요', true); render(); return; }
  const r = await Cloud.wbCall({ action: 'attack' });
  wbBusy = false;
  if (r?.error) { toast(r.error, true); await loadWB(true); render(); return; }
  wbLast = r;
  Cloud.logEvent('worldboss', `피해 ${r.dealt}${r.killedNow ? ' · 막타!' : ''}`);
  toast(`월드보스에게 ${fmt(r.dealt)} 피해!`);
  await loadWB(true);
  render();
}
async function wbClaim(season: number) {
  const r = await Cloud.wbCall({ action: 'claim', season });
  if (r?.error) { toast(r.error, true); return; }
  const extra = G.grantReward(S!, r.reward);
  saveGame(S!);
  toast(`${r.rank}위 / ${r.total}명 (${r.reward.label}) 보상: 핵 ${r.reward.cores} · 제련석 ${r.reward.refineStones} · ${fmt(r.reward.gold)}G${extra}`);
  await loadWB(true); render();
}

// ───────── 멀티 던전 (서버) ─────────
let myRoom: string | null = null;
let roomSt: { room: Cloud.Room; members: Cloud.RoomMember[] } | null = null;
let roomList: (Cloud.Room & { n: number })[] = [];
let roomListAt = 0;
let mFloor = 0, mMax = 2;
let mPick: string[] = [];
let mBusy = false;
let replayRoom: string | null = null;
let roomLog: { sys?: boolean; name?: string; text: string; at: string; mine?: boolean }[] = [];
let roomDraft = '';
const pickUid = (c: string | Cloud.PickedChar) => (typeof c === 'string' ? c : c.uid);
function roomDiff(prev: Cloud.RoomMember[] | undefined, next: Cloud.RoomMember[]) {
  if (!prev) return;
  const now = new Date().toISOString();
  const pm = Object.fromEntries(prev.map((m) => [m.user_id, m]));
  const nm = Object.fromEntries(next.map((m) => [m.user_id, m]));
  for (const m of next) {
    const o = pm[m.user_id];
    if (!o) roomLog.push({ sys: true, text: `${m.username || '누군가'}님이 들어왔어요`, at: now });
    else {
      if (!o.ready && m.ready) roomLog.push({ sys: true, text: `${m.username}님 준비 완료`, at: now });
      if (o.ready && !m.ready) roomLog.push({ sys: true, text: `${m.username}님 준비 취소`, at: now });
      const a = o.chars.map(pickUid).join(), b = m.chars.map(pickUid).join();
      if (a !== b && m.chars.length) roomLog.push({ sys: true, text: `${m.username}님이 ${m.chars.map((c) => (typeof c === 'string' ? '?' : c.name)).join(', ')} 선택`, at: now });
    }
  }
  for (const o of prev) if (!nm[o.user_id]) roomLog.push({ sys: true, text: `${o.username || '누군가'}님이 나갔어요`, at: now });
}
function renderRoomLog() {
  const el = document.getElementById('roomlog');
  if (!el) return;
  el.innerHTML = roomLogHtml();
  el.scrollTop = el.scrollHeight;
}
const roomLogHtml = () => roomLog.slice(-80).map((l) => l.sys ? `<div class="rl sys">· ${esc(l.text)} <span class="ct">${hhmm(l.at)}</span></div>` : `<div class="rl"><b class="${l.mine ? 'me' : ''}">${esc(l.name ?? '')}</b> ${esc(l.text)} <span class="ct">${hhmm(l.at)}</span></div>`).join('') || '<p class="small mute" style="margin:0">아직 조용해요. 인사해 보세요!</p>';
Cloud.setRoomChatHandler((m) => {
  if (!myRoom || (m as Cloud.ChatMsg2).channel !== `room:${myRoom}`) return;
  roomLog.push({ name: m.username, text: m.body, at: m.created_at, mine: m.user_id === Cloud.session?.user.id });
  renderRoomLog();
});
window.addEventListener('pagehide', () => { if (myRoom && roomSt?.room.status === 'open') Cloud.leaveRoom(myRoom, roomSt.room.host === Cloud.session?.user.id); });
async function refreshRooms() { roomList = await Cloud.listRooms(); roomListAt = Date.now(); if (screen === 'multi') render(); }
async function refreshRoom() {
  if (!myRoom) return;
  const st = await Cloud.roomState(myRoom);
  if (!st || (!st.members.some((m) => m.user_id === Cloud.session?.user.id) && st.room.status === 'open')) {
    if (roomSt && !st) toast('방이 닫혔어요');
    else if (roomSt) toast('방에서 나왔어요');
    myRoom = null; roomSt = null; Cloud.watchRoom(null, () => {}); if (screen === 'multi') render(); return;
  }
  roomDiff(roomSt?.members, st.members);
  roomSt = st;
  if (st.room.status === 'done' && st.room.result && replayRoom !== st.room.id && st.members.some((m) => m.user_id === Cloud.session?.user.id)) {
    replayRoom = st.room.id;
    startMultiReplay(st.room);
    return;
  }
  if (screen === 'multi') { const log = document.getElementById('roomlog'); const keep = (document.getElementById('roomIn') as HTMLInputElement | null) === document.activeElement; render(); renderRoomLog(); if (keep) (document.getElementById('roomIn') as HTMLInputElement | null)?.focus(); void log; }
}
async function enterRoom(id: string) {
  myRoom = id; mPick = []; roomSt = null;
  roomLog = (await Cloud.loadRoomChat(id)).map((m) => ({ name: m.username, text: m.body, at: m.created_at, mine: m.user_id === Cloud.session?.user.id }));
  roomLog.push({ sys: true, text: '방에 들어왔어요', at: new Date().toISOString() });
  Cloud.watchRoom(id, () => refreshRoom());
  clearInterval(roomPoll);
  roomPoll = window.setInterval(() => { if (myRoom) refreshRoom(); else clearInterval(roomPoll); }, 8000);
  await refreshRoom();
  renderRoomLog();
}
let roomPoll = 0;
function viewMulti() {
  const s = S!;
  const me = Cloud.session?.user.id;
  if (!myRoom) {
    if (Date.now() - roomListAt > 10000) setTimeout(refreshRooms, 0);
    const riftOpts = ZONES.map((z) => ({ z, f: z.floors[0] + 2 })).filter((o) => (s.maxFloor || 0) >= o.f || o.z.floors[0] === 1);
    if (!riftOpts.some((o) => o.f === mFloor)) mFloor = riftOpts[riftOpts.length - 1].f;
    return `<div class="wrap">${backBtn()}
      <h2>멀티 던전</h2>
      <p class="mute">멀티 전용 던전 <b>균열</b>을 친구와 함께 돌아요. 각자 단원을 모아 <b>4인 파티</b>로 <b>10층</b>(5층 정예 · 10층 보스, 3층부터 기믹)을 진행하고, 5층을 넘으면 전원 회복해요. 전투는 서버가 계산하고 모두의 화면에서 같은 속도로 재생돼요.<br>보상은 협동 보너스 +20%. 단, <b>내가 아직 못 깬 구역</b>의 균열이면 보상은 내 최고층 수준으로 받아요.</p>
      <div class="panel grid"><h3 style="margin:0">방 만들기</h3>
        <div class="field"><label for="mFloor">균열 구역 (내가 지나온 구역까지)</label><select id="mFloor" data-m="floor">${[...riftOpts].reverse().map((o) => `<option value="${o.f}" ${o.f === mFloor ? 'selected' : ''}>${esc(o.z.name)} 균열 · 권장 ${fmt(floorPower(o.f))}</option>`).join('')}</select></div>
        <div class="seg mini" role="group" aria-label="인원">${[2, 3, 4].map((n) => `<button class="${mMax === n ? 'on' : ''}" data-a="mMax" data-v="${n}">${n}인</button>`).join('')}</div>
        <p class="small mute" style="margin:0">2인: 각자 2명 · 3인: 방장 2명, 나머지 1명 · 4인: 각자 1명</p>
        <button class="btn" data-a="mCreate" ${mBusy ? 'disabled' : ''}>방 만들기</button></div>
      <div class="panel"><div class="row" style="justify-content:space-between"><h3 style="margin:0">열린 방</h3><button class="btn ghost sm" data-a="mRooms">새로고침</button></div>
        <div class="tlist">${roomList.map((r) => `<div class="trow"><b class="tf">${r.n}/${r.max_players}</b><div class="tg"><span><b>${esc(r.host_name)}</b>의 방 · ${esc(zoneOf(r.floor).name)} 균열</span><span class="small mute">${hhmm(r.created_at)} 개설</span></div><div class="row" style="grid-column:2;gap:6px">${r.host === Cloud.session?.user.id ? `<button class="btn sm" data-a="mJoin" data-v="${r.id}">들어가기</button><button class="btn ghost sm" data-a="mDelete" data-v="${r.id}">삭제</button>` : `<button class="btn sm" data-a="mJoin" data-v="${r.id}" ${r.n >= r.max_players ? 'disabled' : ''}>${r.n >= r.max_players ? '꽉 참' : '참가'}</button>`}</div></div>`).join('') || '<p class="small mute">열린 방이 없어요. 방을 만들고 친구를 초대해 보세요.</p>'}</div></div>
    </div>`;
  }
  const st = roomSt;
  if (!st) return `<div class="wrap">${backBtn()}<h2>멀티 던전</h2><p class="mute">방 정보를 불러오는 중…</p></div>`;
  const { room, members } = st;
  const isHost = room.host === me;
  const meM = members.find((m) => m.user_id === me);
  const n = members.length;
  const slots = slotsFor(Math.max(n, 2), isHost);
  if (meM && !mPick.length && meM.chars.length) mPick = meM.chars.map(pickUid).filter((u) => G.byUid(s, u));
  const card = (m: Cloud.RoomMember) => {
    const on = !!Cloud.online[m.user_id];
    const picks = m.chars.map((c) => typeof c === 'string' ? '<li class="small mute">단원</li>' : `<li class="small"><b>${esc(c.name)}</b> <span class="mute">${esc(JOBS[c.jobId as JobId]?.name ?? '')} · Lv.${c.level} · ${fmt(c.power)}</span></li>`).join('');
    return `<div class="mmem ${m.ready || m.user_id === room.host ? 'ready' : ''}"><div class="row" style="justify-content:space-between;gap:6px"><span class="row" style="gap:6px"><span class="dot ${on ? 'on' : ''}" title="${on ? '접속 중' : '자리 비움'}"></span><b>${esc(m.username || '(이름 없음)')}${m.user_id === room.host ? ' 👑' : ''}</b></span><span class="small ${m.ready || m.user_id === room.host ? '' : 'mute'}">${m.user_id === room.host ? '방장' : m.ready ? '✔ 준비' : '준비 중'}</span></div>
      <ul class="mpick">${picks || '<li class="small mute">아직 단원을 안 골랐어요</li>'}</ul>
      <div class="row" style="justify-content:space-between"><span class="small mute">${m.chars.length}/${slotsFor(Math.max(n, 2), m.user_id === room.host)}명${on ? '' : ' · 자리 비움'}</span>${isHost && m.user_id !== me ? `<button class="btn ghost sm" data-a="mKick" data-v="${m.user_id}">내보내기</button>` : ''}</div></div>`;
  };
  const friendsOn = friends.filter((f) => f.status === 'accepted' && Cloud.online[f.other] && !members.some((m) => m.user_id === f.other));
  return `<div class="wrap">${backBtn()}
    <h2>균열 · ${esc(zoneOf(room.floor).name)}</h2>
    <p class="small mute">${esc(room.host_name)}의 방 · ${n}/${room.max_players}명 · 10층 진행 · 권장 전투력 ${fmt(floorPower(room.floor))}${(s.maxFloor || 0) < room.floor ? ` · <span style="color:var(--gold)">아직 못 깬 구역이라 보상은 내 최고층 수준</span>` : ''}</p>
    <div class="row" style="gap:8px;align-items:center;margin:6px 0"><span class="small">전투 배속</span>${isHost ? `<div class="seg mini" role="group" aria-label="배속">${([1, 2, 0] as const).map((v) => `<button class="${(room.speed ?? 1) === v ? 'on' : ''}" data-a="mSpeed" data-v="${v}">${v ? `${v}배` : '스킵'}</button>`).join('')}</div>` : `<b>${(room.speed ?? 1) ? `${room.speed ?? 1}배` : '스킵'}</b> <span class="small mute">(방장이 정함)</span>`}</div>
    <div class="mgrid">${members.map(card).join('')}${Array.from({ length: room.max_players - n }, () => '<div class="mmem empty"><span class="small mute">빈 자리</span></div>').join('')}</div>
    <div class="panel"><h3 style="margin-top:0">내가 데려갈 단원 <span class="small mute">${mPick.length}/${slots}명 선택</span></h3>
      <div class="cards">${s.roster.map((c) => `<button class="card ${mPick.includes(c.uid) ? 'inparty' : ''}" data-a="mPick" data-uid="${esc(c.uid)}"><div class="ico">${avatar(c)}</div><div><b>${esc(c.name)}</b><div class="small mute">${esc(JOBS[c.jobId].name)} · Lv.${c.level} · 전투력 ${fmt(charPower(c))}</div></div></button>`).join('')}</div>
      <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
        ${isHost ? `<button class="btn" data-a="mStart" ${mBusy || n < 2 ? 'disabled' : ''}>${mBusy ? '서버 계산 중…' : n < 2 ? '2명 이상 모이면 시작' : '출발!'}</button>` : `<button class="btn ${meM?.ready ? 'ghost' : ''}" data-a="mReady">${meM?.ready ? '준비 취소' : '준비 완료'}</button>`}
        <button class="btn ghost" data-a="mLeave">${isHost ? '방 삭제' : '나가기'}</button></div></div>
    <div class="panel"><h3 style="margin-top:0">방 채팅 · 기록</h3><div id="roomlog" class="roomlog">${roomLogHtml()}</div>
      <form class="cin" data-form="room" style="display:flex;gap:6px;margin-top:8px"><input id="roomIn" maxlength="200" placeholder="방 사람들에게 한마디" value="${esc(roomDraft)}" autocomplete="off" style="flex:1;min-width:0"><button class="btn sm" type="submit">보내기</button></form></div>
    ${friendsOn.length ? `<div class="panel"><h3 style="margin-top:0">접속 중인 친구 초대</h3>${friendsOn.map((f) => `<div class="frow"><span class="dot on"></span><b>${esc(f.username)}</b><span class="small mute">전투력 ${fmt(f.power)}</span><button class="btn sm" data-a="mInvite" data-v="${f.other}">초대</button></div>`).join('')}</div>` : '<p class="small mute">친구가 접속하면 여기서 초대할 수 있어요. 열린 방 목록에서 직접 참가할 수도 있어요.</p>'}
  </div>`;
}
async function mSync(ready?: boolean) {
  if (!myRoom || !roomSt) return;
  const meM = roomSt.members.find((m) => m.user_id === Cloud.session?.user.id);
  const picked = mPick.map((u) => G.byUid(S!, u)).filter(Boolean).map((c) => ({ uid: c!.uid, name: c!.name, jobId: c!.jobId, level: c!.level, power: charPower(c!) }));
  const err = await Cloud.setMember(myRoom, picked, ready ?? meM?.ready ?? false);
  if (err) toast(err, true);
}
let mySpeed: 1 | 2 | 0 = 1;
function startMultiReplay(room: Cloud.Room) {
  const res = room.result;
  mySpeed = speed;
  speed = (room.speed ?? 1) as 1 | 2 | 0;
  EX = new Expedition(res.chars, res.settings, new Rng(res.seed));
  multiRoom = room;
  units = {};
  screen = 'dungeon';
  render();
  drawParty();
  logLine('sp', `멀티 던전 출발! ${res.chars.map((c: Character) => c.name).join(', ')}`);
  playFloor();
}
let multiRoom: Cloud.Room | null = null;
async function finishMulti() {
  const ex = EX!, room = multiRoom!;
  playToken++;
  EX = null;
  const r = await Cloud.multiCall({ action: 'claim', room: room.id });
  const s = S!;
  let ups: { name: string; to: number }[] = [], equips: Equip[] = [];
  const rw = room.result.reward;
  if (r?.error) toast(r.error, true);
  else {
    const prefix = `${Cloud.session!.user.id.slice(0, 8)}_`;
    const res = G.applyMultiReward(s, r.reward, (r.myChars as string[]).map((u) => u.replace(prefix, '')), r.totalChars);
    ups = res.ups; equips = res.equips;
  }
  const lost = ex.stopReason === 'wipe' || ex.stopReason === 'timeout';
  const myRw = r?.error ? null : r.reward;
  summary = { reason: lost ? `균열 ${ex.floor}층에서 ${ex.stopReason === 'timeout' ? '시간 초과로 후퇴' : '전멸'}` : `균열 ${room.result.cleared}층 완주!`, daily: `${room.host_name}의 방 · 협동 보너스 +20%${myRw?.level && myRw.level < room.floor ? ` · 보상은 내 최고층(${floorName(myRw.level)}) 기준` : ''}`, report: ex.report, lost, diag: [], insured: true, floor: ex.floor, repeat: false, runs: ex.floorsCleared,
    gold: myRw?.gold ?? 0, exp: myRw?.exp ?? 0, stones: myRw?.stones ?? 0, blessings: myRw?.blessings ?? 0, refineStones: myRw?.refineStones ?? 0, shards: 0, cores: myRw?.cores ?? 0, cardPacks: myRw?.cardPacks ?? 0, equips, levelUps: ups, bosses: [], newMaxFloor: false } as unknown as G.ExpeditionSummary;
  Cloud.logEvent('multi', `${(summary as G.ExpeditionSummary).reason} · ${room.host_name}의 방`);
  myRoom = null; roomSt = null; multiRoom = null; Cloud.watchRoom(null, () => {});
  speed = mySpeed;
  screen = 'result';
  commit();
}

let codexGrade: Grade | 0 = 0;
function viewCodex() {
  const s = S!;
  const seen = new Set(s.codex ?? []);
  const have = new Set(s.roster.map((c) => c.mercId).filter(Boolean));
  const w = gradeWeights(s.guildLevel);
  const tot = Object.values(w).reduce((a, b) => a + b, 0);
  const list = MERCENARIES.filter((m) => !codexGrade || m.grade === codexGrade).sort((a, b) => b.grade - a.grade);
  const byGrade = ([5, 4, 3, 2, 1] as Grade[]).map((g) => ({ g, n: MERCENARIES.filter((m) => m.grade === g).length, got: MERCENARIES.filter((m) => m.grade === g && seen.has(m.id)).length }));
  const cards = list.map((m) => {
    const st = have.has(m.id) ? 'have' : seen.has(m.id) ? 'seen' : 'none';
    const tr = [...m.traits, ...(m.unique ? [m.unique] : [])];
    return `<div class="codex r${m.grade}b ${st}">
      <div class="row" style="gap:10px;align-items:center"><div class="ico">${charSprite(m.job, m.name, 1, { size: 44 })}</div>
        <div style="flex:1;min-width:0"><b class="g${m.grade}">${esc(m.name)}</b> ${stars(m.grade)}<div class="small mute">${GRADE_NAME[m.grade]} ${esc(JOBS[m.job].name)} · ${esc(m.desc)}</div></div>
        <span class="tag ${st === 'none' ? 'mute' : ''}">${st === 'have' ? '보유 중' : st === 'seen' ? '만난 적 있음' : '미발견'}</span></div>
      <div class="tags" style="margin-top:6px">${tr.map((t) => traitTag(t, false)).join('')}</div>
      ${m.unique ? `<div class="small" style="margin-top:4px"><b class="g5">고유 · ${esc(m.unique)}</b> <span class="mute">${esc(TRAITS[m.unique]?.desc ?? '')}</span></div>` : ''}
    </div>`;
  }).join('');
  return `<div class="wrap">${backBtn()}
    <h2>용병 도감</h2>
    <p class="mute">길드 모집판에 나타날 수 있는 모든 용병이에요. 같은 용병이 또 나오면 고용 대신 <b>각성</b>(별 추가)에 쓸 수 있어요. 길드 레벨이 오르면 높은 등급이 더 자주 나와요.</p>
    <div class="sum" style="margin:10px 0">${byGrade.map((x) => `<div><span class="small g${x.g}">${GRADE_NAME[x.g]} · 모집 확률 ${((w[x.g] / tot) * 100).toFixed(1)}%</span><b>${x.got}/${x.n}</b></div>`).join('')}</div>
    <div class="tabs" role="group" aria-label="등급">${([0, 5, 4, 3, 2, 1] as (Grade | 0)[]).map((g) => `<button class="${codexGrade === g ? 'on' : ''}" data-a="codexGrade" data-v="${g}">${g ? GRADE_NAME[g as Grade] : '전체'}</button>`).join('')}</div>
    <div class="codexgrid">${cards}</div>
  </div>`;
}

// ───────── 관리자 대시보드 ─────────
const KIND_NAME: Record<string, string> = { cardOpen: '카드 팩', cardAwaken: '카드 각성', autoRefresh: '자동 교체', autoEnh: '자동 강화', login: '접속', signup: '회원가입', run: '던전', tower: '무한 탑', raid: '레이드', daily: '일일 던전', worldboss: '월드보스', multi: '멀티 던전', hire: '용병 고용', upgradeGuild: '길드 강화', advance: '전직', enhance: '강화', buyEquip: '장비 구매', buyDeal: '특가 구매', train: '훈련', reroll: '특성 재설정', refine: '제련', craft: '세트 제작', buyEgg: '펫 알', petSellLow: '펫 정리', claimQuest: '목표 보상', dailySweep: '소탕', buyStones: '강화석 구매', admin_gift: '관리자 지급' };
let adTab: 'over' | 'users' | 'log' | 'chat' = 'over';
let adStats: any = null, adUsers: Cloud.AdminUser[] = [], adEvents: Cloud.EventRow[] = [], adChats: (Cloud.ChatMsg & { channel: string })[] = [];
let adSel: string | null = null, adSave: any = null, adSelEvents: Cloud.EventRow[] = [];
let adSort: 'seen' | 'joined' | 'power' | 'floor' = 'seen', adQ = '', adKind = '';
let adLoading = false, adAt: Record<string, number> = {}, adErr = '';
const ago = (t?: string | null) => { if (!t) return '-'; const m = Math.floor((Date.now() - Date.parse(t)) / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`; };
const ymd = (t?: string | null) => (t ? new Date(Date.parse(t) + 9 * 3600_000).toISOString().slice(0, 16).replace('T', ' ') : '-');
async function adLoad(tab = adTab, force = false) {
  if (adLoading || (!force && Date.now() - (adAt[tab] ?? 0) < 20000)) return;
  adLoading = true; render();
  try {
    if (tab === 'over') adStats = await Cloud.adminStats();
    if (tab === 'users' || tab === 'over') adUsers = await Cloud.adminUsers();
    if (tab === 'log') adEvents = await Cloud.adminEvents({ kind: adKind || undefined, limit: 300 });
    if (tab === 'chat') adChats = await Cloud.adminChats(200);
  } catch (e) { adErr = `불러오기 실패: ${(e as Error).message}`; toast(adErr, true); adLoading = false; if (screen === 'admin') render(); return; }
  adErr = ''; adAt[tab] = Date.now(); adLoading = false;
  if (screen === 'admin') render();
}
async function adOpenUser(id: string) {
  adSel = id; adUTab = 'sum'; adSave = null; adSelEvents = []; render();
  try {
    const [sv, ev] = await Promise.all([Cloud.adminUserSave(id), Cloud.adminEvents({ user: id, limit: 60 })]);
    adSave = sv; adSelEvents = ev;
  } catch (e) { toast(`불러오기 실패: ${(e as Error).message}`, true); }
  render();
}
const bars = (rows: { d: string; n: number }[]) => {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return `<div class="adbars">${rows.map((r) => `<div class="ab" title="${r.d}: ${r.n}"><i style="height:${(r.n / max) * 100}%"></i><span>${r.d.slice(5)}</span><b>${r.n}</b></div>`).join('') || '<p class="small mute">데이터 없음</p>'}</div>`;
};
let adUTab: 'sum' | 'chars' | 'bag' | 'pets' | 'log' | 'manage' = 'sum';
let adGs: { raw: unknown; gs: G.GameState | null } = { raw: null, gs: null };
function adProfile(sel: Cloud.AdminUser) {
  if (adSave !== adGs.raw) { adGs = { raw: adSave, gs: adSave ? G.migrate(JSON.parse(JSON.stringify(adSave))) : null }; }
  const gs = adGs.gs;
  const on = !!Cloud.online[sel.id];
  const party = gs ? G.partyChars(gs) : [];
  const lead = party[0] ?? gs?.roster[0];
  const tiles = (rows: [string, string | number][]) => `<div class="adtiles">${rows.map(([k, v]) => `<div><span>${k}</span><b>${typeof v === 'number' ? fmt(v) : esc(String(v))}</b></div>`).join('')}</div>`;
  const head = `<div class="adhead">
      <div class="adava">${lead ? avatar(lead, 64) : ''}</div>
      <div style="flex:1;min-width:0"><div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><span class="dot ${on ? 'on' : ''}"></span><h3 style="margin:0">${esc(sel.username)}</h3>${sel.is_admin ? '<span class="tag">관리자</span>' : ''}${sel.muted ? '<span class="tag mute">채팅 금지</span>' : ''}</div>
        <div class="small mute">${on ? '접속 중' : `마지막 접속 ${ago(sel.last_seen)}`} · 가입 ${ymd(sel.created_at).slice(0, 10)} · 접속 ${sel.login_count}회</div>
        <div class="small">${gs ? `${esc(gs.heroName)} · ${gs.day}일차 · ${esc(floorName(Math.max(1, gs.maxFloor)))} · 전투력 <b class="cp">${fmt(G.statePower(gs))}</b>` : '세이브 불러오는 중…'}</div></div>
      <button class="btn ghost sm" data-a="adClose" aria-label="닫기">✕</button></div>`;
  const utabs: [typeof adUTab, string][] = [['sum', '요약'], ['chars', `단원 ${gs?.roster.length ?? ''}`], ['bag', `가방 ${gs?.inventory.length ?? ''}`], ['pets', `펫 ${gs?.pets.length ?? ''}`], ['log', '활동'], ['manage', '관리']];
  let body = '';
  if (!gs && adUTab !== 'log' && adUTab !== 'manage') body = '<p class="mute">세이브를 불러오는 중이거나 서버 세이브가 없어요.</p>';
  else if (adUTab === 'sum') {
    body = `${tiles([['골드', gs!.gold], ['강화석', gs!.stones], ['축복', gs!.blessings], ['제련석', gs!.refineStones], ['군단장의 핵', gs!.cores], ['벨리알 파편', gs!.scales], ['물약', Object.values(gs!.potions).reduce((x, y) => x + y, 0)], ['길드', `Lv.${gs!.guildLevel}`]])}
      <h4>진행</h4>${tiles([['최고 층', floorName(Math.max(1, gs!.maxFloor))], ['무한 탑', `${gs!.tower?.best ?? 0}층`], ['이번 주 레이드 최고', gs!.raid?.best ?? 0], ['보스 처치', gs!.bossesKilled.length], ['가이드 목표', `${gs!.questIdx ?? 0}/${QUESTS.length}`], ['용병 도감', `${(gs!.codex ?? []).length}/${MERCENARIES.length}`], ['전직 가능', G.advanceable(gs!).length], ['일차', gs!.day]])}
      <h4>출전 파티</h4><div class="cards">${party.map((c) => charCard(c, { act: 'noop', inParty: true })).join('') || '<p class="small mute">없음</p>'}</div>`;
  } else if (adUTab === 'chars') {
    const order = [...gs!.roster].sort((x, y) => Number(gs!.party.includes(y.uid)) - Number(gs!.party.includes(x.uid)) || charPower(y) - charPower(x));
    body = `<div class="adchars">${order.map((c) => {
      const merc = c.mercId ? MERC_BY_ID[c.mercId] : null;
      const traits = [...c.traitIds, ...(c.uniqueTraitId ? [c.uniqueTraitId] : [])].map((t) => traitTag(t, false)).join('');
      const eq = (['weapon', 'armor', 'accessory'] as EquipSlot[]).map((sl) => { const e = c.equipment[sl]; return `<div class="adeq"><span class="small mute">${SLOT_NAME[sl]}</span>${e ? `<div>${equipLine(e)}</div>` : '<span class="small mute">비어 있음</span>'}</div>`; }).join('');
      const skills = c.skillSlots.map((sl) => SKILLS[sl.skillId]?.name ?? sl.skillId).join(' → ');
      return `<div class="adchar ${gs!.party.includes(c.uid) ? 'inparty' : ''}"><div class="row" style="gap:10px;align-items:center"><div class="ico">${avatar(c, 48)}</div>
        <div style="flex:1;min-width:0"><b>${esc(c.name)}</b> ${stars(c.grade)}${c.awakening ? ` <span class="small g5">각성 ${c.awakening}</span>` : ''}${gs!.party.includes(c.uid) ? ' <span class="tag">출전</span>' : ''}
          <div class="small mute">${esc(JOBS[c.jobId].name)} · Lv.${c.level} · <span class="cp">전투력 ${fmt(charPower(c))}</span>${c.isHero ? ' · 주인공' : merc ? ` · ${GRADE_NAME[merc.grade]} 용병` : ''} · ${rowOf(c) === 'front' ? '전열' : '후열'} · ${TARGET_NAME[c.target ?? 'auto']}</div></div></div>
        ${traits ? `<div class="tags" style="margin-top:6px">${traits}</div>` : ''}
        <div class="adeqs">${eq}</div>
        <div class="small mute" style="margin-top:6px">스킬 순서: ${esc(skills || '-')}</div></div>`;
    }).join('')}</div>`;
  } else if (adUTab === 'bag') {
    const inv = [...gs!.inventory].sort((x, y) => y.rarity - x.rarity || y.enhance - x.enhance);
    const pots = POTIONS.filter((pp) => (gs!.potions[pp.id] ?? 0) > 0).map((pp) => `<span class="tag">${esc(pp.name)} ×${gs!.potions[pp.id]}</span>`).join('');
    body = `${pots ? `<div class="tags" style="margin-bottom:8px">${pots}</div>` : ''}<div class="adbag">${inv.map((e) => `<div class="adeq r${e.rarity}b">${equipLine(e)}</div>`).join('') || '<p class="small mute">가방이 비어 있어요.</p>'}</div>`;
  } else if (adUTab === 'pets') {
    const pets = [...gs!.pets].sort((x, y) => Number(y.uid === gs!.activePet) - Number(x.uid === gs!.activePet) || y.grade - x.grade || y.stars - x.stars);
    body = `<div class="petbag">${pets.map((pp) => `<div class="pettile r${pp.grade}b ${pp.uid === gs!.activePet ? 'on' : ''}">${petSprite(pp.kind, pp.grade, { size: 56 })}<span class="pn g${pp.grade}">${esc(PET_BY_ID[pp.kind].name)}</span><span class="pg g${pp.grade}">${PET_GRADE_NAME[pp.grade]}${pp.uid === gs!.activePet ? ' · 동행' : ''}</span><span class="small" style="color:var(--gold)">${'★'.repeat(pp.stars)}</span></div>`).join('') || '<p class="small mute">펫이 없어요.</p>'}</div>`;
  } else if (adUTab === 'log') {
    body = `<div class="adlog">${adSelEvents.map(evRow).join('') || '<p class="small mute">활동 기록 없음</p>'}</div>`;
  } else {
    body = `<div class="row" style="gap:6px;flex-wrap:wrap;margin:4px 0 10px"><button class="btn ghost sm" data-a="adMute" data-v="${sel.id}">${sel.muted ? '채팅 금지 해제' : '채팅 금지'}</button>${sel.id !== Cloud.session?.user.id ? `<button class="btn ghost sm" data-a="adAdmin" data-v="${sel.id}">${sel.is_admin ? '관리자 해제' : '관리자 지정'}</button>` : ''}</div>
      <form class="adgift" data-form="adgift"><b class="small" style="flex-basis:100%">재료 지급</b>${[['gold', '골드'], ['stones', '강화석'], ['blessings', '축복'], ['refineStones', '제련석'], ['cores', '핵'], ['scales', '벨리알 파편']].map(([k, n]) => `<label class="small">${n}<input type="number" min="0" step="1" name="${k}" value="0" inputmode="numeric"></label>`).join('')}<button class="btn sm" type="submit">지급</button></form>
      <p class="small mute" style="margin:6px 0 0">지급하면 그 계정 서버 세이브에 바로 더해져요. 접속 중이면 새로고침해야 보여요 (그 전에 저장되면 덮어써짐).</p>`;
  }
  return `<div class="panel addetail">${head}
    <div class="tabs" role="group" aria-label="회원 정보" style="margin:10px 0">${utabs.map(([k, n]) => `<button class="${adUTab === k ? 'on' : ''}" data-a="adUTab" data-v="${k}">${n}</button>`).join('')}</div>
    ${body}</div>`;
}
function viewAdmin() {
  if (!Cloud.isAdmin) return `<div class="wrap">${backBtn()}<h2>관리자</h2><p class="mute">관리자만 볼 수 있어요.</p></div>`;
  if (!adAt[adTab] && !adLoading) setTimeout(() => adLoad(adTab), 0);
  const tabs: [typeof adTab, string][] = [['over', '개요'], ['users', `회원 ${adUsers.length || ''}`], ['log', '활동 로그'], ['chat', '채팅']];
  let body = '';
  if (adTab === 'over') {
    const st = adStats;
    const online = Object.keys(Cloud.online).length;
    const tiles: [string, unknown][] = st ? [['전체 회원', st.users], ['지금 접속', online], ['24시간 접속', st.active24], ['7일 접속', st.active7], ['신규 가입 (24h)', st.new24], ['활동 (24h)', st.events24], ['채팅 (24h)', st.chats24], ['멀티 방 (24h)', st.rooms24]] : [];
    const kinds = st ? Object.entries(st.kinds as Record<string, number>).sort((a, b) => b[1] - a[1]) : [];
    const top = [...adUsers].filter((u) => u.power).sort((a, b) => (b.power ?? 0) - (a.power ?? 0)).slice(0, 5);
    body = !st ? '<p class="mute">불러오는 중…</p>' : `
      <div class="sum">${tiles.map(([k, v]) => `<div><span class="small mute">${k}</span><b>${fmt(Number(v) || 0)}</b></div>`).join('')}</div>
      ${st.wb ? `<div class="panel"><h3 style="margin-top:0">월드보스 (시즌 ${st.wb.season})</h3><div class="bar e big"><i style="width:${Math.max(0, (st.wb.hp / st.wb.max_hp) * 100)}%"></i></div><p class="small">${st.wb.killed_at ? `처치됨 · ${ymd(st.wb.killed_at)}` : `HP ${fmt(st.wb.hp)} / ${fmt(st.wb.max_hp)}`}</p></div>` : ''}
      <div class="grid2"><div class="panel"><h3 style="margin-top:0">일별 가입 (14일)</h3>${bars(st.signups)}</div><div class="panel"><h3 style="margin-top:0">일별 활동 유저 (14일)</h3>${bars(st.dau)}</div></div>
      <div class="grid2"><div class="panel"><h3 style="margin-top:0">24시간 행동</h3>${kinds.map(([k, n]) => `<div class="row" style="justify-content:space-between"><span>${esc(KIND_NAME[k] ?? k)}</span><b>${fmt(n)}</b></div>`).join('') || '<p class="small mute">없음</p>'}</div>
        <div class="panel"><h3 style="margin-top:0">전투력 TOP 5</h3>${top.map((u, i) => `<div class="row" style="justify-content:space-between"><span>${i + 1}. ${esc(u.username)}</span><b>${fmt(u.power ?? 0)}</b></div>`).join('') || '<p class="small mute">없음</p>'}</div></div>`;
  } else if (adTab === 'users') {
    const q = adQ.trim().toLowerCase();
    const list = adUsers.filter((u) => !q || u.username.toLowerCase().includes(q)).sort((a, b) => adSort === 'joined' ? Date.parse(b.created_at) - Date.parse(a.created_at) : adSort === 'power' ? (b.power ?? 0) - (a.power ?? 0) : adSort === 'floor' ? (b.max_floor ?? 0) - (a.max_floor ?? 0) : Date.parse(b.last_seen) - Date.parse(a.last_seen));
    const sel = adUsers.find((u) => u.id === adSel);
    const sv = adSave;
    const detail = sel ? adProfile(sel) : '';
    body = `${detail}
      <div class="row" style="gap:8px;flex-wrap:wrap;margin:8px 0"><input id="adQ" placeholder="아이디 검색" value="${esc(adQ)}" style="flex:1;min-width:140px"><div class="seg mini" role="group" aria-label="정렬">${([['seen', '최근 접속'], ['joined', '가입순'], ['power', '전투력'], ['floor', '진행']] as const).map(([k, n]) => `<button class="${adSort === k ? 'on' : ''}" data-a="adSort" data-v="${k}">${n}</button>`).join('')}</div></div>
      <div class="rtbl"><table class="adtbl"><thead><tr><th>아이디</th><th>마지막 접속</th><th>가입</th><th>접속</th><th>진행</th><th>전투력</th><th>탑</th></tr></thead><tbody>
      ${list.map((u) => `<tr data-a="adUser" data-v="${u.id}" class="${u.id === adSel ? 'on' : ''}"><td><span class="dot ${Cloud.online[u.id] ? 'on' : ''}"></span> <b>${esc(u.username)}</b>${u.is_admin ? ' 👑' : ''}${u.muted ? ' 🔇' : ''}</td><td>${ago(u.last_seen)}</td><td>${ymd(u.created_at).slice(5, 10)}</td><td>${u.login_count}</td><td>${u.max_floor ? esc(floorName(u.max_floor)) : '-'}</td><td>${fmt(u.power ?? 0)}</td><td>${u.tower_best}</td></tr>`).join('')}</tbody></table></div>`;
  } else if (adTab === 'log') {
    body = `<div class="row" style="gap:8px;flex-wrap:wrap;margin:8px 0"><select id="adKind" data-ad="kind"><option value="">전체 행동</option>${Object.entries(KIND_NAME).map(([k, n]) => `<option value="${k}" ${adKind === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><span class="small mute">최근 ${adEvents.length}건</span></div>
      <div class="adlog big">${adEvents.map(evRow).join('') || '<p class="small mute">기록 없음</p>'}</div>`;
  } else {
    body = `<div class="adlog big">${adChats.map((m) => `<div class="evr"><span class="ct">${ymd(m.created_at).slice(5)}</span><span class="tag ${m.channel === 'global' ? '' : 'mute'}">${m.channel === 'global' ? '전체' : '방'}</span><b>${esc(m.username)}</b><span class="ed">${esc(m.body)}</span><button class="btn ghost sm" data-a="adDelChat" data-v="${m.id}" aria-label="삭제">삭제</button></div>`).join('') || '<p class="small mute">메시지 없음</p>'}</div>`;
  }
  return `<div class="wrap">${backBtn()}
    <div class="row" style="justify-content:space-between;align-items:center"><h2>관리자 대시보드</h2><button class="btn ghost sm" data-a="adRefresh" ${adLoading ? 'disabled' : ''}>${adLoading ? '불러오는 중…' : '새로고침'}</button></div>
    <div class="tabs" role="group" aria-label="관리자 메뉴">${tabs.map(([k, n]) => `<button class="${adTab === k ? 'on' : ''}" data-a="adTab" data-v="${k}">${n}</button>`).join('')}</div>
    ${adErr ? `<p class="small" style="color:var(--bad)">${esc(adErr)}</p>` : ''}
    ${adAt[adTab] ? `<p class="small mute" style="margin:4px 0">${ymd(new Date(adAt[adTab]).toISOString()).slice(11)} 기준</p>` : ''}
    ${body}
  </div>`;
}
const evRow = (e: Cloud.EventRow) => `<div class="evr"><span class="ct">${ymd(e.created_at).slice(5)}</span><b>${esc(e.username)}</b><span class="tag">${esc(KIND_NAME[e.kind] ?? e.kind)}</span><span class="ed">${esc(e.detail)}</span></div>`;

let cardTab: 'deck' | 'all' | 'open' = 'deck';
let cardSet = 'all';
let cardSel: string | null = null;
function viewCards() {
  const s = S!;
  const owned = s.cards ?? {};
  const deck = s.deck ?? [];
  const eff = cardMods(owned, deck);
  const tabs: [typeof cardTab, string][] = [['deck', `덱 ${deck.length}/${DECK_SIZE}`], ['all', `컬렉션 ${Object.keys(owned).length}/${CARDS.length}`], ['open', `팩 열기${s.cardPacks ? ` (${s.cardPacks})` : ''}`]];
  const sel = cardSel ? CARD_BY_ID[cardSel] : null;
  const so = sel ? owned[sel.id] : null;
  const detail = sel ? `<div class="cdetail g${sel.grade}">${cardHtml(sel.id, { awaken: so?.awaken ?? 0, locked: !so, size: 120 })}
      <div style="flex:1;min-width:0"><b class="g${sel.grade}">${['', '일반', '고급', '희귀', '영웅', '전설'][sel.grade]} · ${esc(sel.name)}</b><div class="small mute">${esc(sel.title)} · ${esc(CARD_SET_BY_ID[sel.set].name)}</div>
        ${so ? `<p class="small" style="margin:6px 0">효과: <b>${esc(cardEffectText(sel, so.awaken))}</b>${so.awaken < MAX_AWAKEN ? ` <span class="mute">→ 각성 시 ${esc(cardEffectText(sel, so.awaken + 1))}</span>` : ''}</p>
          <p class="small mute" style="margin:0 0 8px">각성 ${so.awaken}/${MAX_AWAKEN} · 여분 ${so.count - 1}장${so.awaken < MAX_AWAKEN ? ` · 다음 각성에 ${G.awakenNeed(so)}장 필요` : ''}</p>
          <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="cardDeck" data-v="${sel.id}">${deck.includes(sel.id) ? '덱에서 빼기' : '덱에 넣기'}</button><button class="btn ghost sm" data-a="cardAwaken" data-v="${sel.id}" ${so.awaken < MAX_AWAKEN && so.count - 1 >= G.awakenNeed(so) ? '' : 'disabled'}>각성</button></div>`
        : '<p class="small mute">아직 없는 카드예요. 균열에서 카드 팩을 모아 열어보세요.</p>'}</div>
      <button class="btn ghost sm" data-a="cardSel" data-v="${sel.id}" aria-label="닫기">✕</button></div>` : '';
  let body = '';
  if (cardTab === 'deck') {
    const slots = Array.from({ length: DECK_SIZE }, (_, i) => deck[i]).map((id) => id ? `<button class="cslot" data-a="cardSel" data-v="${id}">${cardHtml(id, { awaken: owned[id]?.awaken ?? 0, size: 104 })}</button>` : `<button class="cslot empty" data-a="cardTab" data-v="all"><span>+</span><span class="small mute">카드 넣기</span></button>`).join('');
    const setLines = eff.lines.filter((l) => l.kind !== 'codex');
    body = `<div class="cdeck">${slots}</div>
      <div class="panel"><h3 style="margin-top:0">적용 중인 효과 <span class="small mute">출전 파티 전원</span></h3>
        <div class="small">${deck.map((id) => CARD_BY_ID[id]).filter(Boolean).map((c) => `<span class="tag">${esc(c.name)} · ${esc(cardEffectText(c, owned[c.id]?.awaken ?? 0))}</span>`).join(' ') || '<span class="mute">장착한 카드가 없어요</span>'}</div>
        <ul class="csets">${setLines.map((l) => `<li class="${l.on ? 'on' : ''}"><span>${l.on ? '✔' : '·'}</span>${esc(l.text)}</li>`).join('')}</ul>
        ${eff.lines.filter((l) => l.kind === 'codex').map((l) => `<p class="small" style="margin:6px 0 0"><b>📖 ${esc(l.text)}</b> <span class="mute">(장착 안 해도 적용)</span></p>`).join('') || '<p class="small mute" style="margin:6px 0 0">📖 도감: 카드를 모을 때마다 HP·공격·마력이 영구로 올라요</p>'}</div>
      <div class="panel"><h3 style="margin-top:0">세트 안내</h3>${CARD_SETS.map((st) => `<div class="cset"><b style="color:${st.color}">${esc(st.name)}</b> <span class="small mute">${esc(st.desc)}</span><div class="small">${st.bonus.map((b) => `${b.n}장: ${esc(b.text)}`).join(' · ')}</div><div class="small mute">각성 합계 ${st.awaken.map((a) => `${a.sum}: ${esc(a.text)}`).join(' · ')}</div></div>`).join('')}</div>`;
  } else if (cardTab === 'all') {
    const list = CARDS.filter((c) => cardSet === 'all' || c.set === cardSet);
    body = `<div class="tabs" role="group" aria-label="세트">${[['all', '전체'], ...CARD_SETS.map((x) => [x.id, x.name])].map(([k, n]) => `<button class="${cardSet === k ? 'on' : ''}" data-a="cardSetF" data-v="${k}">${esc(n)}</button>`).join('')}</div>
      <div class="cgrid">${list.map((c) => { const o = owned[c.id]; const canAw = o && o.awaken < MAX_AWAKEN && o.count - 1 >= G.awakenNeed(o); return `<button class="cgi ${deck.includes(c.id) ? 'indeck' : ''}" data-a="cardSel" data-v="${c.id}">${cardHtml(c.id, { awaken: o?.awaken ?? 0, locked: !o, size: 104 })}${deck.includes(c.id) ? '<span class="cbadge">장착</span>' : canAw ? '<span class="cbadge up">각성 가능</span>' : o && o.count > 1 ? `<span class="cbadge dim">+${o.count - 1}</span>` : ''}</button>`; }).join('')}</div>`;
  } else {
    const last = G.lastCards;
    body = `<div class="panel" style="text-align:center"><div class="row" style="justify-content:center;gap:10px;align-items:center;flex-wrap:wrap"><b>신비 카드 팩 ${s.cardPacks ?? 0}개</b>
      <button class="btn" data-a="cardOpen" data-v="1" ${(s.cardPacks ?? 0) >= 1 ? '' : 'disabled'}>1개 열기</button><button class="btn ghost" data-a="cardOpen" data-v="10" ${(s.cardPacks ?? 0) >= 1 ? '' : 'disabled'}>${Math.min(10, s.cardPacks ?? 0) || 10}개 열기</button></div>
      <p class="small mute">확률: 일반 ${PACK_ODDS[1]}% · 고급 ${PACK_ODDS[2]}% · 희귀 ${PACK_ODDS[3]}% · 영웅 ${PACK_ODDS[4]}% · 전설 ${PACK_ODDS[5]}%<br>카드 팩은 <b>균열(멀티)</b>에서 나와요: 층마다 20%, 5층 정예·10층 보스 확정, 완주 보너스 +1</p>
      ${last.length ? `<div class="copen">${last.map((g, i) => `<div class="cflip" style="animation-delay:${i * 0.08}s">${cardHtml(g.id, { awaken: owned[g.id]?.awaken ?? 0, size: 96 })}${g.isNew ? '<span class="cbadge new">NEW</span>' : ''}</div>`).join('')}</div>` : ''}</div>`;
  }
  return `<div class="wrap">${backBtn()}
    <h2>카드 보관함</h2>
    <p class="small mute" style="margin-top:-4px">신비 카드를 덱에 장착하면 출전 파티 전원이 강해져요. 같은 세트를 모아 끼면 세트 효과, 같은 카드를 겹치면 각성해요.</p>
    <div class="tabs" role="group" aria-label="카드">${tabs.map(([k, n]) => `<button class="${cardTab === k ? 'on' : ''}" data-a="cardTab" data-v="${k}">${n}</button>`).join('')}</div>
    ${detail}
    ${body}
  </div>`;
}

function viewTower() {
  const s = S!;
  if (!G.towerOpen(s)) return `<div class="wrap">${backBtn()}<h2>무한 탑</h2><p class="mute">마왕숲 ${TOWER_UNLOCK}층을 클리어하면 열려요.</p></div>`;
  const best = G.towerState(s).best, next = best + 1;
  const power = G.statePower(s);
  const rows = Array.from({ length: 6 }, (_, i) => next + i).map((t) => {
    const g = towerGimmick(t), boss = isTowerBoss(t), r = towerReward(t);
    const bname = boss ? MONSTERS[towerBoss(t).id].name : '';
    return `<div class="trow ${boss ? 'boss' : ''} ${t === next ? 'next' : ''}"><b class="tf">${t}층</b><div class="tg"><span>${g.icon} <b>${esc(g.name)}</b>${boss ? ` · <span class="r5">보스 ${esc(bname)}</span>` : ''}</span><span class="small mute">${esc(g.desc)} — ${esc(g.tip)}</span></div>
      <span class="small tr">${fmt(r.gold)}G · 핵 ${r.cores}${r.refineStones ? ` · 제련석 ${r.refineStones}` : ''}${r.egg ? ` · ${r.egg === 5 ? '전설' : '영웅'} 이상 알` : ''}</span></div>`;
  }).join('');
  return `<div class="wrap">${backBtn()}
    <h2>무한 탑</h2>
    <p class="mute">끝없이 이어지는 탑이에요. 층마다 <b>기믹이 고정</b>되어 있어서 미리 보고 세팅을 맞출 수 있어요. 10층마다 보스가 나와요. 이기면 파티가 완전히 회복되고 다음 층으로 계속 올라가요. 져도 잃는 건 없고, <b>처음 돌파한 층</b>만 보상을 줘요. 입장 제한도 없어요.</p>
    <div class="sum" style="margin:12px 0"><div><span class="small mute">최고 기록</span><b>${best}층</b></div><div><span class="small mute">파티 전투력</span><b>${fmt(power)}</b></div><div><span class="small mute">군단장의 핵</span><b>${fmt(s.cores)}</b></div></div>
    <div class="panel"><h3 style="margin-top:0">다가오는 층</h3><div class="tlist">${rows}</div>
      <p class="small mute" style="margin:8px 0 0">25층마다 펫 알 보상이 있어요. 전투 리포트의 패배 분석을 보고 공격 대상·전열·장비를 바꿔가며 오르세요.</p>
      <button class="btn" data-a="towerGo" style="margin-top:10px">${next}층부터 도전</button></div>
  </div>`;
}

function viewDaily() {
  const s = S!;
  const power = G.statePower(s);
  const cards = DAILIES.map((d) => {
    const open = G.dailyOpen(s, d);
    if (!open) return `<div class="panel daily locked"><div class="row" style="gap:10px">${REWARD_ICON[d.reward]()}<div><h3 style="margin:0">${esc(d.name)}</h3><p class="small mute" style="margin:2px 0 0">${d.unlockFloor >= 50 ? '마왕숲 50층 클리어' : `마왕숲 ${d.unlockFloor}층 클리어`} 후 개방</p></div></div></div>`;
    const cleared = G.dailyState(s).cleared[d.id] ?? 0;
    const maxOpen = Array.from({ length: DAILY_STAGES }, (_, i) => i + 1).filter((k) => G.stageOpen(s, d, k)).pop() ?? 1;
    const st = Math.min(dailyStage[d.id] ?? Math.min(maxOpen, cleared + 1), maxOpen);
    const f = d.stageFloor(st), need = floorPower(f);
    const r = dailyReward(d, st, rewardScale(f));
    const rw = [r.gold && `골드 ${fmt(r.gold)}`, r.exp && `경험치 ${fmt(r.exp)} (파티 나눔)`, r.stones && `강화석 ${r.stones}`, r.blessings && `축복 ${r.blessings}`, r.refineStones && `제련석 ${r.refineStones}`, r.cores && `군단장의 핵 ${r.cores}`].filter(Boolean).join(' · ');
    const left = G.dailyLeft(s, d.id);
    const lv = powerLevel(power, f, hasHealer(G.partyChars(s)));
    return `<div class="panel daily">
      <div class="row" style="gap:10px;align-items:flex-start">${REWARD_ICON[d.reward]()}<div style="flex:1"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(d.name)}</h3><span class="tag ${left ? '' : 'mute'}">오늘 ${left}/${DAILY_LIMIT}</span></div>
        <p class="small mute" style="margin:2px 0">${esc(d.desc)}</p><p class="small" style="margin:0"><b class="r5">공략</b> ${esc(d.tip)}</p></div></div>
      <div class="floors stages" role="group" aria-label="단계">${Array.from({ length: DAILY_STAGES }, (_, i) => i + 1).map((k) => `<button class="fl ${k === st ? 'on' : ''} ${k <= cleared ? 'cleared' : ''}" data-a="dailyStage" data-id="${d.id}" data-v="${k}" ${G.stageOpen(s, d, k) ? '' : 'disabled'} aria-pressed="${k === st}"><b>${k}단계</b><span class="${G.stageOpen(s, d, k) ? (k <= cleared ? 'sw' : '') : 'lk'}">${!G.stageOpen(s, d, k) ? `🔒${unlockShort(d.stageUnlock(k))}` : k <= cleared ? '소탕 가능' : fmt(floorPower(d.stageFloor(k)))}</span></button>`).join('')}</div>
      ${maxOpen < DAILY_STAGES ? `<p class="small mute" style="margin:4px 0 0">다음 개방: <b>${maxOpen + 1}단계</b> — ${esc(floorName(d.stageUnlock(maxOpen + 1)))} 클리어 시</p>` : ''}
      <p class="small ${lv}t" style="margin:6px 0 2px">권장 전투력 ${fmt(need)} · 파티 ${fmt(power)} · ${{ ok: '충분', close: '조금 부족', low: '많이 부족' }[lv]}</p>
      <p class="small" style="margin:0 0 8px"><b>보상</b> ${rw}</p>
      <div class="row" style="gap:8px"><button class="btn" data-a="dailyGo" data-id="${d.id}" data-v="${st}" ${left ? '' : 'disabled'}>도전</button>
        <button class="btn ghost" data-a="dailySweep" data-id="${d.id}" data-v="${st}" ${left && st <= cleared ? '' : 'disabled'} title="클리어한 단계는 전투 없이 보상">소탕</button>
        <span class="small mute">실패하면 입장 횟수는 그대로</span></div>
    </div>`;
  }).join('');
  return `<div class="wrap">${backBtn()}
    <h2>일일 던전</h2>
    <p class="mute">던전마다 하루 ${DAILY_LIMIT}번 (한국 시간 자정 초기화). 단계마다 개방 조건(🔒)이 표시돼 있고, 한 번 클리어한 단계는 <b>소탕</b>으로 바로 보상을 받을 수 있어요.</p>
    <div class="dailies">${cards}</div>
  </div>`;
}

function viewGate() {
  const s = S!;
  if (!gateRegion) return viewRegions();
  const region = REGIONS.find((r) => r.id === gateRegion)!;
  const [rA, rB] = region.floors!;
  const st = s.settings;
  if (st.startFloor < rA || st.startFloor > rB) st.startFloor = rA;
  if (!region.repeat && st.mode === 'repeat') st.mode = 'advance';
  if (st.targetFloor > rB) st.targetFloor = rB;
  const party = G.partyChars(s);
  const owned = POTIONS.filter((p) => (s.potions[p.id] ?? 0) > 0);
  gatePotions = gatePotions.filter((id) => (s.potions[id] ?? 0) > 0);
  const maxStart = Math.min(G.maxStartFloor(s), rB);
  if (st.startFloor > maxStart) st.startFloor = Math.max(rA, maxStart);
  const L = localFloor;
  if (st.targetFloor < st.startFloor) st.targetFloor = st.startFloor;
  const can = G.canDepart(s);
  const rep = st.mode === 'repeat';
  const opt = (v: number | string, cur: number | string, label: string) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${label}</option>`;
  const power = G.statePower(s), healer = hasHealer(party);
  const lastFloor = rep ? st.startFloor : st.targetFloor;
  const bossInRange = Array.from({ length: MAX_FLOOR / 5 }, (_, i) => (i + 1) * 5).filter((b) => b >= st.startFloor && b <= lastFloor);
  const bossWarn = bossInRange.length && !healer
    ? `진행 범위에 보스(${bossInRange.length > 3 ? `${L(bossInRange[0])}층 외 ${bossInRange.length - 1}곳` : bossInRange.map((b) => `${L(b)}층`).join('·')})가 있어요. 회복 없이는 매우 어려우니 성직자 계열을 넣는 걸 추천해요.` : '';
  const best = Math.min(s.maxFloor, rB) - rA + 1;
  return `<div class="wrap"><div class="back row" style="gap:8px"><button class="btn ghost sm" data-a="go" data-to="town">← 마을로</button><button class="btn ghost sm" data-a="pickRegion" data-v="">← 지역 선택</button></div>${hubTabs()}
    <h2>${esc(region.name)}</h2>
    <p class="mute">${esc(region.desc)}. 클리어한 최고 층: <b>${best > 0 ? `${best}층 (${esc(zoneOf(Math.min(s.maxFloor, rB)).name)})` : '없음'}</b></p>
    <p class="small mute" style="margin-top:-6px">최고 기록보다 5층 이상 아래 층은 골드·경험치가 75%, 10층 이상 아래는 50%만 들어와요. 강화석·장비 드롭은 그대로예요.</p>
    <div class="cols" style="margin-top:12px">
      <section class="grid">
        <h3>파티 <span class="small mute">전열/후열 · 공격 대상</span></h3><div class="cards">${[...party].sort((a, b) => (rowOf(a) === rowOf(b) ? 0 : rowOf(a) === 'front' ? -1 : 1)).map((c) => `<div class="gmem row-${rowOf(c)}">${charCard(c, { inParty: true })}${tacticsCtl(c)}</div>`).join('')}</div>
        <h3>동행 펫</h3>
        ${G.activePet(s) ? `<p class="small row" style="gap:8px">${petSprite(G.activePet(s)!.kind, G.activePet(s)!.grade, { size: 40 })}<b class="g${G.activePet(s)!.grade}">${esc(PET_BY_ID[G.activePet(s)!.kind].name)}</b> ${'★'.repeat(G.activePet(s)!.stars)} · ${esc(petEffectText(G.activePet(s)!))} <button class="btn ghost sm" data-a="go" data-to="pets">바꾸기</button></p>` : '<p class="small mute">펫이 없어요. 펫 우리에서 알을 사서 부화시켜 보세요. <button class="btn ghost sm" data-a="go" data-to="pets">펫 우리</button></p>'}
        <h3>버프 물약 <span class="small mute">최대 ${MAX_POTIONS}종, 입장할 때 마심</span></h3>
        <div class="pots">${owned.map((p) => `<button class="pot ${gatePotions.includes(p.id) ? 'on' : ''}" data-a="pickPotion" data-id="${p.id}"><span class="row" style="gap:4px">${potionIcon(p.id, 24)}${esc(p.name)}</span><span class="small mute">×${s.potions[p.id]}</span></button>`).join('') || '<p class="small mute">물약이 없습니다. 잡화점에서 살 수 있어요.</p>'}</div>
      </section>
      <section class="panel grid">
        <h3>탐험 방식</h3>
        <div class="seg" role="group" aria-label="탐험 방식">
          <button data-a="setMode" data-v="advance" class="${rep ? '' : 'on'}"><b>아래로 진행</b><span>층을 내려가며 최고 기록에 도전</span></button>
          <button data-a="setMode" data-v="repeat" class="${rep ? 'on' : ''}" ${region.repeat ? '' : 'disabled'}><b>한 층 반복</b><span>${region.repeat ? '같은 층을 계속 돌며 파밍' : '이 지역에선 반복 불가'}</span></button>
        </div>
        <div class="field"><label>${rep ? '반복할 층' : '시작 층'} <span class="small mute">· 숫자는 권장 전투력</span></label>
          <div class="floors" role="group" aria-label="층 선택">${Array.from({ length: Math.min(rB, rA - 1 + Math.ceil((maxStart - rA + 2) / 5) * 5) - rA + 1 }, (_, i) => {
            const f = rA + i, lv = powerLevel(power, f, healer), locked = f > maxStart;
            return `<button class="fl ${lv} ${f === st.startFloor ? 'on' : ''} ${zoneOf(f).boss.floor === f ? 'boss' : ''}" data-a="pickFloor" data-v="${f}" ${locked ? 'disabled' : ''} aria-pressed="${f === st.startFloor}"><b>${L(f)}층${zoneOf(f).boss.floor === f ? ' 보스' : ''}</b><span>${fmt(floorPower(f))}</span></button>`;
          }).join('')}</div>
          <p class="small ${powerLevel(power, st.startFloor, healer)}t">파티 전투력 ${fmt(power)} · ${L(st.startFloor)}층 권장 ${fmt(floorPower(st.startFloor))} · ${{ ok: '충분', close: '조금 부족', low: '많이 부족' }[powerLevel(power, st.startFloor, healer)]}</p>
          ${healer ? '' : `<p class="small" style="color:var(--gold)">회복 담당이 없어 전투력을 ${Math.round(noHealerFactor(st.startFloor) * 100)}%로 쳐서 판정해요${st.startFloor >= 25 ? ' (이 깊이부터는 회복 없이 거의 불가능)' : ''}.</p>`}
          <p class="small mute">권장 = 그 층 하나를 체력 가득한 상태로 80% 깨는 수준. 아래로 연속 진행하면 체력이 이어지니 여유를 두세요.</p>
          <p class="tipline"><b>${L(st.startFloor)}층 공략</b> ${esc(floorTip(st.startFloor))}</p>
          ${bossInRange.length ? bossCard(bossInRange[0], party, power) : ''}
          ${st.startFloor > PART1_FLOOR ? '<p class="small mute">마왕성 권장 전투력은 탱커·딜러·힐러를 갖춘 정석 조합 기준이에요. 조합과 공격 대상 설정이 어긋나면 훨씬 더 필요해요.</p>' : ''}
        </div>
        ${dropInfo(st.startFloor)}
        <div class="form">
          ${rep
            ? `<div class="field"><label for="g_repeatCount">반복 횟수</label><select id="g_repeatCount" data-g="repeatCount">${[3, 5, 10, 20, 30, MAX_REPEAT].map((v) => opt(v, st.repeatCount, `${v}회`)).join('')}</select></div>`
            : `<div class="field"><label for="g_targetFloor">목표 층 (도달 시 귀환)</label><select id="g_targetFloor" data-g="targetFloor">${Array.from({ length: rB - st.startFloor + 1 }, (_, i) => opt(st.startFloor + i, st.targetFloor, `${L(st.startFloor + i)}층`)).join('')}</select></div>`}
          <div class="field"><label for="g_retreatHpPct">HP 귀환 기준 (파티 평균)</label><select id="g_retreatHpPct" data-g="retreatHpPct">${[0, 20, 30, 40, 50].map((v) => opt(v, st.retreatHpPct, v ? `${v}% 이하` : '사용 안 함')).join('')}</select></div>
          <div class="field"><label for="g_auto">진행</label><select id="g_auto" data-g="auto">${opt(1, st.auto ? 1 : 0, rep ? '자동으로 계속 반복' : '자동으로 다음 층')}${opt(0, st.auto ? 1 : 0, '매번 직접 선택')}</select></div>
        </div>
        <label class="chk"><input type="checkbox" data-g="retreatOnDown" ${st.retreatOnDown ? 'checked' : ''}> 파티원이 쓰러지면 귀환</label>
        ${rep ? '' : `<label class="chk"><input type="checkbox" data-g="stopBeforeBoss" ${st.stopBeforeBoss ? 'checked' : ''}> 보스 층 앞에서 멈추고 묻기</label>`}
        <label class="chk"><input type="checkbox" data-g="insured" ${st.insured ? 'checked' : ''}> 탐험 보험 ${fmt(G.insuranceCost(st.startFloor))}G · 전멸해도 골드·장비 손실 없음</label>
        <p class="small mute">${rep ? `층을 클리어할 때마다 HP·MP가 15% 회복되고, ${st.repeatCount}회를 채우거나 귀환 조건에 걸리면 돌아옵니다.` : '층을 클리어할 때마다 HP·MP가 15% 회복됩니다.'}</p>
        ${can.ok ? '' : `<p class="small" style="color:var(--bad)">${esc(can.msg)}</p>`}
        <button class="btn" data-a="depart" ${can.ok ? '' : 'disabled'}>${rep ? `${L(st.startFloor)}층 반복 출발` : `${L(st.startFloor)}층부터 출발`}</button>
      </section>
    </div>
  </div>`;
}

/** 보스 대비 카드: 기믹·피해 성향·지금 파티 점검 */
function bossCard(f: number, party: Character[], power: number) {
  const z = zoneOf(f);
  const boss = MONSTERS[z.boss.id];
  const adds = z.boss.adds.map((id) => MONSTERS[id]);
  const all = [boss, ...adds];
  const has = (p: string) => all.some((m) => (m.passives ?? []).includes(p as never));
  // 보스 피해 성향: 평타 + 스킬(발동 확률 가중)
  let magW = 0, physW = 0, aoe = false;
  const skillW = boss.skillChance / 100;
  (boss.attackScale === 'mag' ? (magW += 1 - skillW) : (physW += 1 - skillW));
  const dmgSkills = boss.skills.map((sl) => SKILLS[sl.skillId]).filter((sk) => sk?.effects.some((e) => e.type === 'damage'));
  for (const sk of dmgSkills) for (const e of sk.effects) if (e.type === 'damage') {
    const w = (skillW / Math.max(1, dmgSkills.length)) * (e.target === 'all' ? 3 : e.target === 'back' || e.target === 'front' ? 2 : 1);
    if (e.scale === 'mag' || (e.scale !== 'atk' && boss.attackScale === 'mag')) magW += w; else physW += w;
    if (e.target === 'all' || e.target === 'back') aoe = true;
  }
  const magic = magW >= physW;
  const lv = floorLevel(f);
  const red = party.length ? party.reduce((a, c) => { const st = finalStats(c).stats; return a + (1 - mitigation(magic ? st.res : st.def, lv)); }, 0) / party.length : 0;
  const dps = party.filter((c) => JOBS[c.jobId].base !== 'priest' && JOBS[c.jobId].base !== 'warrior');
  const healer = hasHealer(party);
  const tankFront = party.some((c) => JOBS[c.jobId].base === 'warrior' && rowOf(c) === 'front');
  const gimmicks: string[] = [];
  if (has('bulwark')) gimmicks.push('🛡 <b>결계</b> — 수하가 살아있는 동안 보스가 받는 피해 −70%');
  if (has('mender')) gimmicks.push('✚ <b>치유 수하</b> — 살아있으면 매 라운드 보스 HP 9% 회복');
  if (has('rampage')) gimmicks.push('🔥 <b>광폭화</b> — 라운드마다 공격 +12%, 오래 끌수록 위험');
  if (boss.phase2) gimmicks.push(`⚡ <b>2페이즈</b> — HP 50% 이하에서 공격 +${boss.phase2.atkMagPct}%`);
  gimmicks.push(`${magic ? '🔮 주로 <b>마법</b> 피해' : '⚔ 주로 <b>물리</b> 피해'}${aoe ? ' · <b>광역</b> 공격 있음' : ''}`);
  const chk: [boolean | null, string][] = [];
  chk.push([healer, healer ? '힐러 있음' : '힐러 없음 — 보스전은 회복 없이 매우 어려워요']);
  chk.push([red >= 0.45, `파티 평균 ${magic ? '마법' : '물리'} 피해 감소 ${Math.round(red * 100)}%${red >= 0.45 ? '' : ` — ${magic ? '마저 장비·옵션, 방패 거북 펫' : '방어 장비·옵션'}으로 올려보세요`}`]);
  if (has('bulwark') || has('mender')) { const n = party.filter((c) => c.target === 'adds').length; chk.push([n > 0, n ? `잡몹 우선 단원 ${n}명` : '잡몹 우선 단원 없음 — 딜러 한두 명을 잡몹 우선으로 두세요']); }
  if (has('rampage')) { const n = dps.filter((c) => c.target === 'boss').length; chk.push([n > 0 ? true : null, n ? `보스 우선 딜러 ${n}명` : '보스 우선 딜러가 있으면 더 빨리 끝나요']); }
  chk.push([tankFront, tankFront ? '전사 계열이 전열에 있음' : '전열에 전사 계열이 없어요 — 딜러가 대신 맞게 돼요']);
  if (aoe) { const weak = party.filter((c) => rowOf(c) === 'back' && finalStats(c).stats.hp < Math.max(...party.map((x) => finalStats(x).stats.hp)) * 0.6).length; if (weak) chk.push([null, `광역 공격이 있어 HP 낮은 후열 ${weak}명이 위험해요`]); }
  const lvl = powerLevel(power, f, healer);
  chk.push([lvl === 'ok', `전투력 ${fmt(power)} / 보스층 권장 ${fmt(floorPower(f))}`]);
  const L = (x: number) => localFloor(x);
  return `<div class="bosscard"><div class="row" style="gap:10px;align-items:center">${monsterSprite(boss.id, { size: 56, boss: true, tags: boss.tags })}<div><span class="small mute">${L(f)}층 보스 대비</span><h3 style="margin:0">${esc(boss.name)}</h3>${adds.length ? `<span class="small mute">수하: ${[...new Set(adds.map((a) => a.name))].map(esc).join(', ')}</span>` : ''}</div></div>
    <ul class="gim">${gimmicks.map((g) => `<li>${g}</li>`).join('')}</ul>
    <p class="small" style="margin:6px 0 4px"><b>지금 파티 점검</b></p>
    <ul class="bchk">${chk.map(([ok, t]) => `<li class="${ok === true ? 'ok' : ok === false ? 'no' : 'mid'}"><span>${ok === true ? '✔' : ok === false ? '✘' : '△'}</span>${esc(t)}</li>`).join('')}</ul>
    <p class="small" style="margin:6px 0 0"><b class="r5">공략</b> ${esc(floorTip(f))}</p>
  </div>`;
}

function bulkPanel() {
  const s = S!;
  if (!s.inventory.length) return '';
  const f = { rarities: [...bulkR], keepEnhanced: bulkKeepEnh };
  const list = G.bulkTargets(s, f);
  const gold = list.reduce((a, e) => a + G.sellPrice(e), 0);
  const stones = list.reduce((a, e) => a + G.dismantleValue(e), 0);
  return `<details class="panel bulk" ${bulkOpen ? 'open' : ''} data-bulk><summary><h3>일괄 정리</h3><span class="small mute">가방 장비만 · 장착 중 제외</span></summary>
    <div class="tabs" role="group" aria-label="등급 선택">${([1, 2, 3, 4, 5] as Rarity[]).map((r) => {
      const n = s.inventory.filter((e) => e.rarity === r).length;
      return `<button class="rr r${r} ${bulkR.has(r) ? 'on' : ''}" data-a="bulkR" data-r="${r}" aria-pressed="${bulkR.has(r)}">${RARITY_NAME[r]} ${n}</button>`;
    }).join('')}</div>
    <label class="chk"><input type="checkbox" data-a="bulkKeep" ${bulkKeepEnh ? 'checked' : ''}> 강화한 장비(+1 이상)는 남기기</label>
    <div class="row"><span>대상 <b>${list.length}</b>개</span>
      <button class="btn sm" data-a="bulkSell" ${list.length ? '' : 'disabled'}>일괄 판매 +${fmt(gold)}G</button>
      <button class="btn ghost sm" data-a="bulkDis" ${list.length ? '' : 'disabled'}>일괄 분해 · 강화석 +${stones}</button></div>
  </details>`;
}

type WhFilter = 'all' | EquipSlot | 'worn' | 'bag';
let whFilter: WhFilter = 'all';
let whOpen: string | null = null;

function viewStorage() {
  const s = S!;
  const all = allEquips();
  const slotOrder: Record<EquipSlot, number> = { weapon: 0, armor: 1, accessory: 2 };
  const list = all
    .filter(({ e, owner }) => whFilter === 'all' || (whFilter === 'worn' ? !!owner : whFilter === 'bag' ? !owner : EQUIP_BY_ID[e.baseId].slot === whFilter))
    .sort((a, b) => slotOrder[EQUIP_BY_ID[a.e.baseId].slot] - slotOrder[EQUIP_BY_ID[b.e.baseId].slot] || b.e.rarity - a.e.rarity || b.e.enhance - a.e.enhance);
  const filters: [WhFilter, string][] = [['all', `전체 ${all.length}`], ['weapon', '무기'], ['armor', '방어구'], ['accessory', '장신구'], ['worn', `장착 중 ${all.filter((x) => x.owner).length}`], ['bag', `가방 ${s.inventory.length}`]];
  const cards = list.map(({ e, owner }) => {
    const bs = EQUIP_BY_ID[e.baseId];
    const on = whOpen === e.uid;
    const st = Object.entries(equipStats(e)).map(([k, v]) => `${STAT_LABEL[k as StatKey]} +${Math.round(v as number)}`).join(' · ');
    const opts = e.options.map(optText);
    const set = bs.set ? SET_BY_ID[bs.set] : null;
    return `<div class="wrow r${e.rarity}b ${owner ? 'worn' : ''} ${on ? 'on' : ''}">
      <button class="whead" data-a="whOpen" data-e="${esc(e.uid)}" aria-expanded="${on}">
        <span class="eico r${e.rarity}e ${bs.set ? 'setico' : ''}">${equipIcon(e)}</span>
        <span class="wname"><span class="iname r${e.rarity}">${esc(bs.name)}${e.enhance ? ` +${e.enhance}` : ''}</span><span class="small mute">${RARITY_NAME[e.rarity]} · ${SLOT_NAME[bs.slot]}${set ? ` · <span class="settag">${esc(set.name)}</span>` : ''}</span></span>
        <span class="wown">${owner ? `<span class="ico">${avatar(owner, 22)}</span><span class="small">${esc(owner.name)}</span>` : '<span class="small mute">가방</span>'}</span>
        <span class="chev">${on ? '▴' : '▾'}</span>
      </button>
      ${on ? `<div class="wbody">
        <p class="small" style="margin:0">${st || '기본 능력치 없음'}</p>
        ${opts.length ? `<p class="small" style="margin:0"><b>옵션</b> ${opts.join(' · ')}</p>` : ''}
        ${bs.jobs ? `<p class="small mute" style="margin:0">전용: ${bs.jobs.map((j) => JOBS[j].name).join('/')}</p>` : ''}
        ${set ? `<p class="small mute" style="margin:0">${esc(set.name)} 세트 효과는 캐릭터 정보에서 확인</p>` : ''}
        <div class="row" style="gap:6px">${owner ? `<button class="btn ghost sm" data-a="unequip" data-uid="${esc(owner.uid)}" data-slot="${bs.slot}">${esc(owner.name)}에게서 해제</button>`
          : `<button class="btn ghost sm" data-a="sell" data-e="${esc(e.uid)}">판매 ${fmt(G.sellPrice(e))}G</button><button class="btn ghost sm" data-a="dismantle" data-e="${esc(e.uid)}">분해 · 강화석 +${G.dismantleValue(e)}</button>`}</div>
      </div>` : ''}
    </div>`;
  }).join('');
  const pots = POTIONS.filter((p) => (s.potions[p.id] ?? 0) > 0).map((p) => `<div><span class="small mute row" style="gap:4px">${potionIcon(p.id, 22)}${esc(p.name)}</span><b>${s.potions[p.id]}</b></div>`).join('');
  return `<div class="wrap">${backBtn()}
    <h2>창고</h2>
    <div class="sum" style="margin:12px 0">
      <div><span class="small mute">강화석</span><b>${s.stones}</b></div>
      <div><span class="small mute">축복 주문서</span><b>${s.blessings}</b></div>
      <div><span class="small mute">제련석</span><b>${s.refineStones}</b></div>
      <div><span class="small mute">군단장의 핵</span><b>${s.cores}</b></div>
      <div><span class="small mute">벨리알의 파편</span><b>${s.scales}</b></div>
      ${pots}
    </div>
    ${bulkPanel()}
    <div class="tabs" role="group" aria-label="필터">${filters.map(([v, n]) => `<button class="${whFilter === v ? 'on' : ''}" data-a="whFilter" data-v="${v}">${n}</button>`).join('')}</div>
    <div class="wlist">${cards || '<p class="mute">해당하는 장비가 없습니다.</p>'}</div>
  </div>`;
}

// ───────── 던전 진행 ─────────
let EX: Expedition | null = null;
let speed: 1 | 2 | 0 = 1;
let playToken = 0;
let units: Record<string, { id: string; hp: number; max: number; dead: boolean; side: 'p' | 'e' }> = {};
let uidSeq = 0;
let phase: 'playing' | 'between' | 'bossAsk' | 'done' = 'playing';
let lastFloor: FloorResult | null = null;

function viewDungeon() {
  const ex = EX!;
  const zone = zoneOf(ex.floor);
  return `<div class="wrap">
    <div class="dhead"><div><div class="small mute">${ex.settings.rift ? `균열 · ${esc(zoneOf(ex.settings.rift.level).name)}` : ex.settings.tower ? `무한 탑 · ${esc(towerGimmick(ex.floor).icon)} ${esc(towerGimmick(ex.floor).name)}` : ex.settings.raid ? `개인 레이드 · ${esc(raidForm(ex.settings.raid.week).name)}` : ex.daily ? '일일 던전' : `${esc(regionOf(ex.floor).name)} · ${esc(zone.name)}`}</div><h2 id="floorTitle">${floorTitle(ex)}</h2></div>
      <div class="speed" role="group" aria-label="전투 속도">${([1, 2, 0] as const).map((v) => `<button data-a="speed" data-v="${v}" class="${speed === v ? 'on' : ''}" ${EX?.settings.multi ? 'disabled title="멀티에서는 방장이 정한 배속으로 고정돼요"' : ''}>${v === 0 ? '스킵' : `${v}x`}</button>`).join('')}</div></div>
    <div class="stage"><div class="side" id="pside"></div><div class="vs">VS</div><div class="side" id="eside"></div></div>
    <div class="log" id="log" aria-live="polite"></div>
    <div class="dctl" id="dctl"></div>
  </div>`;
}

const floorTitle = (ex: Expedition) =>
  `${runLabel(ex.floor)}${ex.isBossFloor() ? ' · 보스' : ''}${ex.repeating ? ` · 반복 ${Math.min(ex.floorsCleared + 1, ex.settings.repeatCount)}/${ex.settings.repeatCount}` : ''}`;

const unitHtml = (name: string, u: { id: string; hp: number; max: number; dead: boolean }, icon: string, cls = '') =>
  `<div class="unit ${cls} ${u.dead ? 'dead' : ''}" id="${u.id}"><div class="un"><span class="row" style="gap:6px"><span class="uico">${icon}</span>${esc(name)}</span><small>${Math.round(u.hp)}/${u.max}</small></div><div class="bar ${u.id.startsWith('e') ? 'e' : ''}"><i style="width:${pctW(u.hp, u.max)}"></i></div></div>`;

function drawParty() {
  const el = document.getElementById('pside');
  if (!el || !EX) return;
  el.innerHTML = EX.party.map((p) => {
    const u = (units[p.name] ??= { id: `u${uidSeq++}`, hp: p.hp, max: p.maxHp, dead: !p.alive, side: 'p' });
    return unitHtml(p.name, u, avatar(p.char!, 52));
  }).join('');
}
function syncPartyFromEx() {
  if (!EX) return;
  for (const p of EX.party) units[p.name] = { ...(units[p.name] ?? { id: `u${uidSeq++}`, side: 'p' as const }), hp: p.hp, max: p.maxHp, dead: !p.alive };
  drawParty();
}
function drawEnemies(list: UnitSnap[], append = false) {
  const el = document.getElementById('eside');
  if (!el) return;
  if (!append) { el.innerHTML = ''; for (const k of Object.keys(units)) if (units[k].side === 'e') delete units[k]; }
  for (const m of list) {
    const u = (units[m.name] = { id: `e${uidSeq++}`, hp: m.hp, max: m.maxHp, dead: false, side: 'e' });
    el.insertAdjacentHTML('beforeend', unitHtml(m.name, u, monsterSprite(m.id ?? '', { size: m.boss ? 72 : 52, boss: m.boss, elite: m.elite, tags: m.tags }), m.boss ? 'boss' : m.elite ? 'elite' : ''));
  }
}
function setHp(name: string, hp: number, max: number, hit: boolean) {
  const u = units[name];
  if (!u) return;
  u.hp = hp; u.max = max;
  const el = document.getElementById(u.id);
  if (!el) return;
  (el.querySelector('.bar i') as HTMLElement).style.width = pctW(hp, max);
  el.querySelector('small')!.textContent = `${Math.round(hp)}/${max}`;
  if (hit && speed !== 0) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
}
function setDead(name: string, dead: boolean) {
  const u = units[name];
  if (!u) return;
  u.dead = dead;
  document.getElementById(u.id)?.classList.toggle('dead', dead);
}

function logLine(cls: string, text: string) {
  const el = document.getElementById('log');
  if (!el) return;
  const p = document.createElement('p');
  p.className = cls;
  p.textContent = text;
  el.appendChild(p);
  while (el.childElementCount > 400) el.firstElementChild!.remove();
  el.scrollTop = el.scrollHeight;
}

function applyEvent(e: BattleEvent): boolean {
  switch (e.t) {
    case 'wave':
      drawEnemies(e.enemies);
      logLine('w', e.boss ? `${runLabel(e.floor)} 보스전 · ${e.enemies.map((x) => x.name).join(', ')}` : `${runLabel(e.floor)} ${e.wave}웨이브${e.elite ? ' · 엘리트 출현' : ''} · ${e.enemies.map((x) => x.name).join(', ')}`);
      return true;
    case 'round': case 'attack': return false;
    case 'skill': logLine('sk', `${e.actor}의 [${e.skill}]`); return true;
    case 'damage': setHp(e.to, e.hpLeft, e.maxHp, true); logLine(e.crit ? 'cr' : 'dm', `  ${e.from} → ${e.to} ${e.amount}${e.crit ? ' 치명타!' : ''}`); return true;
    case 'evade': logLine('st', `  ${e.to}이(가) 공격을 피했다`); return true;
    case 'heal': setHp(e.to, e.hpLeft, e.maxHp, false); logLine('hl', `  ${e.to} +${e.amount} 회복`); return true;
    case 'status': logLine('st', `  ${e.to}: ${e.label}`); return true;
    case 'dot': setHp(e.to, e.hpLeft, e.maxHp, false); logLine('st', `  ${e.to} ${e.status === 'poison' ? '독' : '화상'} 피해 ${e.amount}`); return true;
    case 'stunned': logLine('st', `  ${e.who}은(는) 기절해 움직이지 못한다`); return true;
    case 'death': setDead(e.who, true); logLine('de', `  ${e.who} 쓰러짐`); return true;
    case 'special':
      if (e.text.includes('다시 일어선다')) { const m = e.text.match(/부활! (.+)이\(가\)/); setDead(m ? m[1] : e.who, false); }
      logLine('sp', `  ✦ ${e.who}: ${e.text}`); return true;
    case 'summon': drawEnemies(e.summoned, true); logLine('sp', `  ✦ ${e.who}이(가) ${e.summoned.map((x) => x.name).join(', ')}을(를) 불러냈다`); return true;
    case 'result': logLine('res', e.win ? `승리 (${e.rounds}라운드)` : `패배…`); return true;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function playFloor() {
  const ex = EX!;
  const token = ++playToken;
  phase = 'playing';
  renderDctl();
  document.getElementById('floorTitle')!.textContent = floorTitle(ex);
  const r = ex.runFloor();
  lastFloor = r;
  for (const e of r.log) {
    if (token !== playToken) return;
    const shown = applyEvent(e);
    if (shown && speed !== 0) {
      // 웨이브 시작·전투 결과 줄은 조금 더 오래 보여줌
      const pause = e.t === 'wave' || e.t === 'result' ? 2.2 : 1;
      await sleep((speed === 1 ? 480 : 220) * pause);
    }
  }
  if (token !== playToken) return;
  syncPartyFromEx();
  if (r.story) logLine('story', r.story);
  afterFloor(r);
}

function afterFloor(r: FloorResult) {
  const ex = EX!;
  if (!r.win) { phase = 'done'; logLine('de', ex.stopReason === 'timeout' ? '60라운드가 지나도 끝나지 않아 후퇴했다… (화력 부족 · 회복하는 적을 먼저 잡아보세요)' : '파티가 전멸했다…'); renderDctl(); return; }
  logLine('hl', `${runLabel(r.floor)} 클리어${ex.repeating ? ` (${ex.floorsCleared}/${ex.settings.repeatCount})` : ''} · 파티 평균 HP ${Math.round(ex.avgHpPct)}%`);
  const reason = ex.autoStopReason();
  if (reason && reason !== 'bossAhead') { ex.finish(reason); phase = 'done'; renderDctl(); return; }
  if (reason === 'bossAhead') { phase = 'bossAsk'; renderDctl(); return; }
  if (ex.settings.auto) {
    phase = 'between'; renderDctl();
    const t = playToken;
    setTimeout(() => { if (t === playToken && phase === 'between' && EX?.settings.auto) { ex.next(); playFloor(); } }, speed === 0 ? 150 : speed === 1 ? 1600 : 900);
    return;
  }
  phase = 'between'; renderDctl();
}

function renderDctl() {
  const el = document.getElementById('dctl');
  if (!el || !EX) return;
  const ex = EX;
  if (ex.settings.multi) {
    el.innerHTML = phase === 'done' ? `<button class="btn" data-a="endRun">결과 보기</button>` : `<span class="mute">${phase === 'playing' ? '전투 중…' : '다음 층으로 이동 중…'} · 배속 ${speed ? `${speed}배` : '스킵'} (방장 설정)</span>`;
    return;
  }
  const autoBox = `<label class="chk"><input type="checkbox" data-a="toggleAuto" ${ex.settings.auto ? 'checked' : ''}> ${ex.repeating ? '자동 반복' : '자동 진행'}</label>`;
  if (phase === 'playing') el.innerHTML = `<span class="mute">전투 중…</span>${autoBox}`;
  else if (phase === 'done') el.innerHTML = `<button class="btn" data-a="endRun">결과 보기</button>`;
  else if (phase === 'bossAsk') el.innerHTML = `<span>다음은 <b>보스 층</b>입니다. 파티 평균 HP ${Math.round(ex.avgHpPct)}%</span><button class="btn danger" data-a="nextFloor">보스 도전</button><button class="btn ghost" data-a="retreat">귀환</button>`;
  else {
    const atEnd = !!ex.daily || !!ex.settings.raid || (!ex.repeating && ex.floor >= (regionOf(ex.settings.startFloor).floors?.[1] ?? MAX_FLOOR));
    el.innerHTML = atEnd
      ? `<span>${ex.settings.raid ? (ex.raidKilled ? '벨리알을 쓰러뜨렸다!' : '전투 종료') : ex.daily ? '보상을 챙겼다!' : `${esc(regionOf(ex.floor).name)}의 끝까지 왔다!`}</span><button class="btn" data-a="retreat">귀환</button>`
      : `<button class="btn" data-a="nextFloor">${ex.repeating ? `${localFloor(ex.floor)}층 다시` : `${localFloor(ex.floor + 1)}층으로`}</button><button class="btn ghost" data-a="retreat">귀환</button>${autoBox}`;
  }
}

function startDailyRun(id: string, stage: number) {
  const s = S!;
  const ex = G.startDaily(s, id, stage, []);
  if (typeof ex === 'string') { toast(ex, true); return; }
  EX = ex;
  saveGame(s);
  units = {};
  screen = 'dungeon';
  render();
  drawParty();
  playFloor();
}
function startTowerRun() {
  const s = S!;
  const ex = G.startTower(s);
  if (typeof ex === 'string') { toast(ex, true); return; }
  EX = ex;
  saveGame(s);
  units = {};
  screen = 'dungeon';
  render();
  drawParty();
  playFloor();
}
function startRun() {
  const s = S!;
  const settings: ExpeditionSettings = { ...s.settings, potions: gatePotions };
  if (settings.targetFloor < settings.startFloor) settings.targetFloor = settings.startFloor;
  const ex = G.startExpedition(s, settings);
  if (typeof ex === 'string') { toast(ex, true); return; }
  EX = ex;
  saveGame(s);
  gatePotions = [];
  units = {};
  screen = 'dungeon';
  render();
  drawParty();
  if (ex.settings.potions.length) logLine('sp', `물약을 마셨다: ${ex.settings.potions.map((id) => POTIONS.find((p) => p.id === id)!.name).join(', ')}`);
  playFloor();
}

function endRun() {
  if (!EX || !S) return;
  if (EX.settings.multi) { finishMulti(); return; }
  playToken++;
  const ex0 = EX;
  summary = G.finishExpedition(S, EX);
  if (CLOUD) Cloud.logEvent(ex0.settings.tower ? 'tower' : ex0.settings.raid ? 'raid' : ex0.settings.daily ? 'daily' : 'run', `${summary.reason} · ${summary.daily ?? floorName(ex0.floor)} · 골드 ${summary.gold}`);
  EX = null;
  screen = 'result';
  commit();
}

function viewResult() {
  const r = summary!;
  return `<div class="wrap" style="max-width:760px">
    <h2 style="margin-top:24px">${esc(r.reason)}</h2>
    <p class="mute">${r.daily ? esc(r.daily) : r.repeat ? `${floorName(r.floor)} ${r.runs}회 반복` : `${floorName(r.floor)}까지 진행`}${r.newMaxFloor ? ' · 최고 기록 갱신!' : ''}${r.reason.startsWith('파티 전멸') ? (r.insured ? ' · 보험 덕분에 잃은 건 없다.' : ' · 골드·장비는 절반만 건졌다.') : ''} · 마을에 돌아와 모두 회복했다</p>
    ${r.towerLines ? `<div class="panel raidres">${r.towerLines.map((l) => `<div>${esc(l)}</div>`).join('')}<div class="row" style="gap:8px;margin-top:8px"><button class="btn sm" data-a="towerGo">다시 도전</button><button class="btn ghost sm" data-a="go" data-to="tower">무한 탑으로</button></div></div>` : ''}
    ${r.raidLines ? `<div class="panel raidres">${r.raidLines.map((l) => `<div>${esc(l)}</div>`).join('')}<button class="btn ghost sm" data-a="go" data-to="raid" style="margin-top:8px">레이드로 돌아가기</button></div>` : ''}
    <div class="sum" style="margin:14px 0;${r.raidLines || r.towerLines ? 'display:none' : ''}">
      <div><span class="small mute">골드</span><b style="color:var(--gold)">+${fmt(r.gold)}</b></div>
      <div><span class="small mute">경험치</span><b>+${fmt(r.exp)}</b></div>
      <div><span class="small mute">강화석</span><b>+${r.stones}</b></div>
      <div><span class="small mute">축복 주문서</span><b>+${r.blessings}</b></div>
      <div><span class="small mute">제련석</span><b>+${r.refineStones ?? 0}</b></div>
      ${r.cores ? `<div><span class="small mute">군단장의 핵</span><b>+${r.cores}</b></div>` : ''}
      ${(r as { cardPacks?: number }).cardPacks ? `<div><span class="small mute">신비 카드 팩</span><b style="color:var(--gold)">+${(r as { cardPacks?: number }).cardPacks}</b></div>` : ''}
    </div>
    ${r.levelUps.length ? `<div class="panel"><h3>레벨 업</h3><p>${r.levelUps.map((l) => `${esc(l.name)} Lv.${l.to}`).join(' · ')}</p></div>` : ''}
    ${r.equips.length ? `<div class="sec"><h3>획득 장비</h3><div class="items">${r.equips.map((e) => `<div class="item"><div>${equipLine(e)}</div></div>`).join('')}</div></div>` : ''}
    ${r.report ? reportPanel(r) : ''}
    ${r.dailyRef ? dailyResultPanel(r.dailyRef) : ''}
    <div class="row" style="margin-top:18px"><button class="btn ${r.dailyRef ? 'ghost' : ''}" data-a="go" data-to="town">마을로</button></div>
  </div>`;
}

const fmtK = (n: number) => (n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e5 ? `${Math.round(n / 1e4).toLocaleString('ko-KR')}만` : fmt(Math.round(n)));
function reportPanel(r: G.ExpeditionSummary) {
  const rep = r.report!;
  const ms = rep.members;
  const maxD = Math.max(1, ...ms.map((m) => m.dealt)), maxT = Math.max(1, ...ms.map((m) => m.taken));
  const chars = Object.fromEntries((S?.roster ?? []).map((c) => [c.uid, c]));
  const rows = ms.map((m) => {
    const c = chars[m.id];
    const magP = m.taken ? Math.round((m.takenMag / m.taken) * 100) : 0;
    return `<tr><td class="rn">${c ? `<span class="ico">${avatar(c, 22)}</span>` : ''}${esc(m.name)}${m.deaths ? ` <span class="dead">💀${m.deaths > 1 ? m.deaths : ''}</span>` : ''}</td>
      <td><div class="rbar"><i style="width:${(m.dealt / maxD) * 100}%"></i></div>${fmtK(m.dealt)}</td>
      <td><div class="rbar t"><i style="width:${(m.taken / maxT) * 100}%"></i></div>${fmtK(m.taken)}${m.taken ? ` <span class="small mute">마법 ${magP}%</span>` : ''}</td>
      <td>${fmtK(m.healed + m.shielded)}</td></tr>`;
  }).join('');
  const hit = Object.entries(rep.hitters).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const totT = Object.values(rep.hitters).reduce((a, b) => a + b, 0) || 1;
  const diag = r.diag ?? [];
  return `<details class="panel report" ${r.lost ? 'open' : ''}><summary><h3>전투 리포트</h3><span class="small mute">${rep.fights.length}번 싸움 · ${r.lost ? '패배 분석 포함' : '단원별 기록'}</span></summary>
    <div class="rtbl"><table><thead><tr><th>단원</th><th>준 피해</th><th>받은 피해</th><th>회복</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${hit.length ? `<p class="small" style="margin:10px 0 4px"><b>가장 아팠던 공격</b></p><ol class="hitlist">${hit.map(([k, v]) => `<li>${esc(k)} <span class="mute">${fmtK(v)} (${Math.round((v / totT) * 100)}%)</span></li>`).join('')}</ol>` : ''}
    ${diag.length ? `<div class="diag ${r.lost ? 'bad' : ''}"><b>${r.lost ? '패배 분석' : '개선 팁'}</b><ul>${diag.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : r.lost ? '' : ''}
  </details>`;
}

function dailyResultPanel(ref: { id: string; stage: number; won: boolean }) {
  const s = S!;
  const d = DAILY_BY_ID[ref.id];
  const left = G.dailyLeft(s, d.id);
  const cleared = G.dailyState(s).cleared[d.id] ?? 0;
  const next = ref.stage + 1;
  const nextOpen = next <= DAILY_STAGES && G.stageOpen(s, d, next);
  const canSweep = cleared >= ref.stage;
  return `<div class="panel dres">
    <div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(d.name)}</h3><span class="tag ${left ? '' : 'mute'}">오늘 남은 입장 ${left}/${DAILY_LIMIT}</span></div>
    ${ref.won && canSweep ? `<p class="small" style="margin:6px 0 0;color:var(--ok)">✔ ${ref.stage}단계 <b>소탕 가능</b> — 이제 전투 없이 바로 보상을 받을 수 있어요</p>` : ''}
    <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
      ${canSweep ? `<button class="btn" data-a="dailySweep" data-id="${d.id}" data-v="${ref.stage}" ${left ? '' : 'disabled'}>${ref.stage}단계 소탕</button>` : ''}
      <button class="btn ${canSweep ? 'ghost' : ''}" data-a="dailyGo" data-id="${d.id}" data-v="${ref.stage}" ${left ? '' : 'disabled'}>${ref.stage}단계 다시 도전</button>
      ${ref.won && nextOpen ? `<button class="btn ghost" data-a="dailyGo" data-id="${d.id}" data-v="${next}" ${left ? '' : 'disabled'}>${next}단계 도전</button>` : ''}
      <button class="btn ghost" data-a="go" data-to="daily">일일 던전 목록</button>
    </div>
    ${left ? '' : '<p class="small mute" style="margin:6px 0 0">오늘 입장 횟수를 다 썼어요 (자정 초기화)</p>'}
  </div>`;
}

// ───────── 모달 ─────────
function viewCharModal(uid: string) {
  const s = S!;
  const c = G.byUid(s, uid);
  if (!c) return '';
  const { stats, extra } = finalStats(c);
  const merc = c.mercId ? MERC_BY_ID[c.mercId] : null;
  const inParty = s.party.includes(c.uid);
  const skills = c.skillSlots.map((sl, i) => `<div class="sitem"><span class="n">${i + 1}</span><span class="t">${skillTip(sl.skillId)} <span class="small mute">MP ${SKILLS[sl.skillId].mp}${condText(sl.condition)}</span></span>
    <button class="btn ghost sm" data-a="skillUp" data-uid="${esc(uid)}" data-i="${i}" aria-label="위로" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn ghost sm" data-a="skillDown" data-uid="${esc(uid)}" data-i="${i}" aria-label="아래로" ${i === c.skillSlots.length - 1 ? 'disabled' : ''}>↓</button></div>`).join('');
  const passives = JOBS[c.jobId].passives.map((p) => `<div class="sitem"><span class="t"><b>${esc(p.name)}</b> <span class="small mute">${esc(p.desc)}</span></span><span class="small ${p.level <= c.level ? '' : 'mute'}">${p.level <= c.level ? '습득' : `Lv.${p.level}`}</span></div>`).join('');
  const nextSkills = JOBS[c.jobId].skills.filter((x) => x.level > c.level).map((x) => `${skillTip(x.skillId)}(Lv.${x.level})`).join(', ');
  const slots = (['weapon', 'armor', 'accessory'] as EquipSlot[]).map((sl) => {
    const e = c.equipment[sl];
    const cands = s.inventory.filter((x) => EQUIP_BY_ID[x.baseId].slot === sl && G.canWear(c, x));
    return `<div class="item"><div><span class="small mute">${SLOT_NAME[sl]}</span><br>${e ? equipLine(e) + enhanceCtl(e) : '<span class="mute">비어 있음</span>'}</div>
      <div class="grid" style="gap:6px">${e ? `<button class="btn ghost sm" data-a="unequip" data-uid="${esc(uid)}" data-slot="${sl}">해제</button>` : ''}
      ${cands.length ? `<select data-a="equipSel" data-uid="${esc(uid)}" aria-label="${SLOT_NAME[sl]} 장착"><option value="">장착할 장비…</option>${cands.map((x) => `<option value="${esc(x.uid)}">${esc(EQUIP_BY_ID[x.baseId].name)}${x.enhance ? ` +${x.enhance}` : ''} (${RARITY_NAME[x.rarity]})</option>`).join('')}</select>` : ''}</div></div>`;
  }).join('');
  const traits = [...c.traitIds, ...(c.uniqueTraitId ? [c.uniqueTraitId] : [])].map((t) => `<div class="sitem"><span class="t"><b>${esc(t)}</b> <span class="small mute">${esc(TRAITS[t]?.desc ?? '')}${c.awakening >= 5 ? ' (×1.5)' : ''}</span></span></div>`).join('') || '<p class="small mute">특성 없음 · 각성 3단계에서 하나 생깁니다</p>';
  const advCard = (j: JobId, can: boolean) => {
    const jd = JOBS[j];
    const apt = Object.entries(jd.aptMult ?? {}).map(([k, v]) => `${STAT_LABEL[k as StatKey]} ${(v as number) >= 1 ? '+' : ''}${Math.round(((v as number) - 1) * 100)}%`).join(', ');
    const from = ({ 2: 20, 3: 50, 4: 70, 5: 90 } as Record<number, number>)[jd.tier] ?? 1;
    const sk = jd.skills.filter((x) => x.level >= from).map((x) => `${skillTip(x.skillId)} <span class="small mute">Lv.${x.level}</span>`).join(' · ');
    const pa = jd.passives.filter((x) => x.level >= from).map((x) => `${tip(x.desc, esc(x.name), 'sk')} <span class="small mute">Lv.${x.level}</span>`).join(' · ');
    return `<div class="advc"><h3>${esc(jd.name)}</h3><p class="small">${esc(jd.desc)}</p>
      <div class="small mute">성장 성향: ${apt}</div>
      <div class="small">새 스킬: ${sk}</div>${pa ? `<div class="small">패시브: ${pa}</div>` : ''}
      ${can ? `<button class="btn" data-a="advance" data-uid="${esc(uid)}" data-job="${j}">${esc(jd.name)}(으)로 전직</button>` : ''}</div>`;
  };
  const advOpts = advanceOptions(c.jobId);
  const advLv = JOBS[c.jobId].tier < 5 ? ADVANCE_AT[JOBS[c.jobId].tier as 1 | 2 | 3 | 4] : 0;
  const adv = !advOpts.length ? '' : canAdvance(c)
    ? `<div class="sec"><h3>${JOBS[c.jobId].tier + 1}차 전직 가능!${advOpts.length > 1 ? ' 하나를 골라주세요' : ''}</h3><p class="small mute">스킬 이름을 누르거나 마우스를 올리면 효과가 보여요. 전직은 되돌릴 수 없어요.</p><div class="advs">${advOpts.map((j) => advCard(j, true)).join('')}</div></div>`
    : `<details class="sec"><summary>Lv.${advLv} ${JOBS[c.jobId].tier + 1}차 전직 미리보기</summary><div class="advs">${advOpts.map((j) => advCard(j, false)).join('')}</div></details>`;
  const ex = [['회피', extra.evade, '%'], ['스킬 데미지', extra.skillDmg, '%'], ['회복량', extra.healPower, '%'], ['받는 피해', extra.dmgTaken, '%']].filter(([, v]) => v).map(([n, v, u]) => `${n} ${Number(v) > 0 ? '+' : ''}${v}${u}`).join(' · ');
  return `<div class="modal" data-a="closeModal"><div class="mbox" role="dialog" aria-modal="true" aria-label="${esc(c.name)}" data-stop>
    <div class="mhead"><div class="ico">${avatar(c)}</div><div style="flex:1"><h2>${esc(c.name)} ${stars(c.grade)}</h2>
      <div class="mute small"><b class="cp">전투력 ${fmt(charPower(c))}</b> · ${GRADE_NAME[c.grade]} · ${esc(JOBS[c.jobId].name)} · Lv.${c.level}${c.awakening ? ` · 각성 ${c.awakening}/5` : ''}${merc ? ` · ${esc(merc.desc)}` : ''}</div></div>
      <button class="btn ghost sm" data-a="closeModal" aria-label="닫기">닫기</button></div>
    <p class="small" style="margin:0 0 10px">${esc(JOBS[c.jobId].desc)}</p>
    <div class="grid" style="gap:6px"><div class="small mute">경험치 ${fmt(c.exp)} / ${fmt(expToNext(c.level))}${c.level >= levelCap(c) ? (JOBS[c.jobId].tier < 5 ? ' · 전직 후 성장 가능' : ' · 최고 레벨') : ''}</div><div class="bar xp"><i style="width:${pctW(c.exp, expToNext(c.level))}"></i></div>
</div>
    <div class="sec"><div class="stats">${STAT_KEYS.map((k) => `<div><span>${STAT_LABEL[k]}</span><b>${Math.round(stats[k])}${k === 'crit' ? '%' : ''}</b></div>`).join('')}</div>${ex ? `<div class="small mute">${ex}</div>` : ''}</div>
    ${adv}
    <div class="sec"><h3>특성</h3>${traits}</div>
    <div class="sec"><div class="row" style="justify-content:space-between"><h3>장비</h3><span class="row" style="gap:6px"><button class="btn ghost sm" data-a="unequipAll" data-uid="${esc(uid)}">전체 해제</button><button class="btn sm" data-a="autoEquip" data-uid="${esc(uid)}">자동 장착</button></span></div><p class="small mute" style="margin:0">자동 장착: 가방 장비 중 전투력이 가장 높아지는 걸로 바꿔요. 전체 해제: 끼고 있는 장비를 모두 가방에 넣어요.</p><div class="items">${slots}</div>${setStatus(c)}</div>
    <div class="sec"><h3>스킬 우선순위</h3><p class="small mute">위에서부터 조건이 맞고 MP가 되는 스킬을 씁니다.${nextSkills ? ` 다음 해금: ${nextSkills}` : ''}</p><div class="slist">${skills}</div></div>
    <div class="sec"><h3>패시브</h3><div class="slist">${passives}</div></div>
    <div class="row" style="margin-top:16px">
      <button class="btn ${inParty ? 'ghost' : ''}" data-a="toggleParty" data-uid="${esc(uid)}">${inParty ? '파티에서 빼기' : '파티에 넣기'}</button>
      ${confirmDismiss === uid
        ? '' : `<button class="btn danger sm" data-a="askDismiss" data-uid="${esc(uid)}">방출</button>`}
    </div>
    ${confirmDismiss === uid ? `<div class="confirm" role="alertdialog" aria-label="방출 확인">
      <p><b>${esc(c.name)}</b>을(를) 정말 방출할까요?</p>${c.isHero ? '<p class="small" style="color:var(--gold)">주인공은 길드에서 다시 고용할 수 없어요.</p>' : ''}
      <p class="small mute">레벨 ${c.level}${c.awakening ? `, 각성 ${c.awakening}단계` : ''}는 사라지고 되돌릴 수 없어요. 끼고 있던 장비는 가방으로 돌아옵니다.</p>
      <div class="row"><button class="btn danger" data-a="dismiss" data-uid="${esc(uid)}">방출하기</button><button class="btn ghost" data-a="cancelDismiss">취소</button></div>
    </div>` : ''}
  </div></div>`;
}
function condText(cond?: { type: string; [k: string]: any }) {
  if (!cond) return '';
  switch (cond.type) {
    case 'allyHpBelow': return ` · 아군 HP ${cond.pct}% 미만`;
    case 'selfHpBelow': return cond.pct > 100 ? '' : ` · 자신 HP ${cond.pct}% 미만`;
    case 'enemyCount': return ` · 적 ${cond.min}명 이상`;
    case 'bossOnly': return ' · 보스전';
    case 'notActive': return ' · 효과 없을 때';
    default: return '';
  }
}

function viewSaveModal() {
  return `<div class="modal" data-a="closeModal"><div class="mbox" role="dialog" aria-modal="true" aria-label="저장 관리" data-stop>
    <div class="mhead"><h2 style="flex:1">저장 관리</h2><button class="btn ghost sm" data-a="closeModal">닫기</button></div>
    <p class="small mute">${remoteReady() ? '계정에 자동 저장되고 있어요. 다른 기기에서도 이어할 수 있습니다.' : '이 브라우저에 자동 저장되고 있어요. 다른 곳에서 이어하려면 세이브 코드를 복사해 두세요.'}</p>
    ${S ? `<div class="field"><label for="saveOut">세이브 코드</label><textarea id="saveOut" rows="3" readonly>${esc(exportSave(S))}</textarea></div><div class="row" style="margin:8px 0 16px"><button class="btn sm" data-a="copySave">복사</button></div>` : ''}
    <div class="field"><label for="saveIn">세이브 코드 붙여넣기</label><textarea id="saveIn" rows="3"></textarea></div>
    <div class="row" style="margin-top:8px"><button class="btn sm" data-a="importSave">불러오기</button>${S ? '<button class="btn danger sm" data-a="wipe">처음부터 다시</button>' : ''}</div>
  </div></div>`;
}

// ───────── 렌더 ─────────
/** 다시 그려도 스크롤 위치 유지 (같은 창·같은 화면일 때) */
let lastView = '';
function keepScroll(draw: () => void) {
  const key = screen;
  const sameScreen = key === lastView;
  const prevModal = lastModalKey;
  const winY = window.scrollY;
  const boxY = document.querySelector('.mbox')?.scrollTop ?? 0;
  draw();
  lastView = key;
  const box = document.querySelector('.mbox');
  if (box && modal && prevModal === JSON.stringify(modal)) box.scrollTop = boxY;
  if (sameScreen && Math.abs(window.scrollY - winY) > 1) window.scrollTo(0, winY);
}
function render() { keepScroll(renderNow); }
function renderNow() {
  if (screen === 'dungeon') {
    if (!document.getElementById('log')) app.innerHTML = topbar() + viewDungeon();
    else { const t = document.querySelector('.top'); if (t) t.outerHTML = topbar(); }
    renderModal(); renderDctl(); renderToast();
    return;
  }
  const body = !S || screen === 'title' ? viewTitle()
    : screen === 'town' ? viewTown() : screen === 'party' ? viewParty() : screen === 'guild' ? viewGuild() : screen === 'smith' ? viewSmith() : screen === 'refinery' ? viewRefinery() : screen === 'pets' ? viewPets() : screen === 'forge' ? viewForge() : screen === 'daily' ? viewDaily() : screen === 'raid' ? viewRaid()
    : screen === 'shop' ? viewShop() : screen === 'storage' ? viewStorage() : screen === 'training' ? viewTraining() : screen === 'temple' ? viewTemple() : screen === 'gate' ? viewGate() : screen === 'tower' ? viewTower() : screen === 'codex' ? viewCodex() : screen === 'admin' ? viewAdmin() : screen === 'notice' ? viewNotice() : screen === 'cards' ? viewCards() : screen === 'rank' ? viewRank() : screen === 'world' ? viewWorld() : screen === 'multi' ? viewMulti() : viewResult();
  app.innerHTML = (screen === 'title' ? '' : topbar()) + body;
  document.querySelector('.hubtabs .on')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  renderModal();
  renderToast();
  checkPower();
  renderChat();
  renderInvite();
  renderUpdate();
}

/** 전투력 변동 알림: 마을 화면에서 파티 전투력이 바뀌면 +/− 표시 */
let pwRef: { s: unknown; v: number } | null = null;
let pwPop: { from: number; to: number } | null = null;
let pwTimer = 0;
function checkPower() {
  if (!S || screen === 'title' || screen === 'dungeon') { if (!S) pwRef = null; renderPower(); return; }
  const v = G.statePower(S);
  if (pwRef && pwRef.s === S && pwRef.v !== v) {
    pwPop = { from: pwPop ? pwPop.from : pwRef.v, to: v };
    if (pwPop.from === pwPop.to) pwPop = null;
    clearTimeout(pwTimer);
    pwTimer = window.setTimeout(() => { pwPop = null; renderPower(); }, 2400);
  }
  pwRef = { s: S, v };
  renderPower();
}
function renderPower() {
  document.querySelector('.pwpop')?.remove();
  if (!pwPop || !S || screen === 'title') return;
  const d = pwPop.to - pwPop.from, up = d > 0;
  app.insertAdjacentHTML('beforeend', `<div class="pwpop ${up ? 'up' : 'down'}" role="status"><span class="small">전투력</span> ${fmt(pwPop.from)} → <b>${fmt(pwPop.to)}</b> <em>${up ? '▲' : '▼'} ${up ? '+' : '−'}${fmt(Math.abs(d))}</em></div>`);
}
function renderModal() {
  const boxY = document.querySelector('.mbox')?.scrollTop;
  const sameModal = modal && lastModalKey === JSON.stringify(modal);
  document.querySelector('.modal')?.remove();
  lastModalKey = modal ? JSON.stringify(modal) : '';
  if (!modal) return;
  app.insertAdjacentHTML('beforeend', modal.kind === 'char' ? viewCharModal(modal.uid) : viewSaveModal());
  if (sameModal && boxY != null) { const b = document.querySelector('.mbox'); if (b) b.scrollTop = boxY; }
}
let lastModalKey = '';

// ───────── 이벤트 ─────────
app.addEventListener('click', (ev) => {
  const target = ev.target as HTMLElement;
  // 툴팁: 탭으로 열고 닫기 (버튼 안의 태그는 버튼 동작 우선)
  const tipEl = target.closest<HTMLElement>('[data-tip]');
  document.querySelectorAll('.tip-on').forEach((x) => { if (x !== tipEl) x.classList.remove('tip-on'); });
  if (tipEl && !tipEl.closest('button')) { tipEl.classList.toggle('tip-on'); return; }
  const el = target.closest<HTMLElement>('[data-a]');
  if (!el) return;
  if (el.dataset.a === 'closeModal' && target.closest('[data-stop]') && !target.closest('button')) return;
  if (el.tagName === 'SELECT') return;
  const d = el.dataset;
  const s = S;
  curAction = d.a ?? '';
  switch (d.a) {
    case 'newGame': {
      const name = (document.getElementById('heroName') as HTMLInputElement).value.trim().slice(0, 8) || '용사';
      S = G.newGame(name); screen = 'town'; commit(); break;
    }
    case 'continue': S = lastSave; screen = 'town'; commit(); break;
    case 'go': if (d.to === 'forge' && screen === 'raid') forgeSet = RAID_SET;
      screen = d.to as Screen; modal = null; boardConfirm = null; if (screen === 'gate') gateRegion = null; render(); window.scrollTo(0, 0); break;
    case 'openChar': confirmDismiss = null; modal = { kind: 'char', uid: d.uid! }; renderModal(); break;
    case 'openSave': modal = { kind: 'save' }; renderModal(); break;
    case 'closeModal': modal = null; render(); break;
    case 'refresh': case 'refreshAll': {
      const which = d.a === 'refresh' ? { kind: 'one' as const, i: Number(d.i) } : { kind: 'all' as const };
      if (rareTargets(which).length) { boardConfirm = which; render(); document.querySelector('.confirm')?.scrollIntoView({ block: 'nearest' }); }
      else doRefresh(which);
      break;
    }
    case 'confirmRefresh': if (boardConfirm) doRefresh(boardConfirm); break;
    case 'cancelRefresh': boardConfirm = null; render(); break;
    case 'lock': G.toggleLock(s!, Number(d.i)); boardConfirm = null; commit(); break;
    case 'hire': commit(G.hireSlot(s!, Number(d.i))); break;
    case 'upgradeGuild': commit(G.upgradeGuild(s!)); break;
    case 'toggleParty': commit(G.togglePartyMember(s!, d.uid!)); break;
    case 'setRow': commit(G.setRow(s!, d.uid!, d.v as Row)); break;
    case 'setTarget': commit(G.setTarget(s!, d.uid!, d.v as TargetPref)); break;
    case 'askDismiss': confirmDismiss = d.uid!; renderModal(); document.querySelector('.confirm')?.scrollIntoView({ block: 'nearest' }); break;
    case 'cancelDismiss': confirmDismiss = null; renderModal(); break;
    case 'dismiss': confirmDismiss = null; modal = null; commit(G.dismiss(s!, d.uid!)); break;
    case 'advance': commit(G.advance(s!, d.uid!, d.job as any)); break;
    case 'skillUp': G.moveSkill(s!, d.uid!, Number(d.i), -1); commit(); break;
    case 'skillDown': G.moveSkill(s!, d.uid!, Number(d.i), 1); commit(); break;
    case 'unequipE': commit(G.unequip(s!, d.uid!, d.slot as EquipSlot)); break;
    case 'unequip': commit(G.unequip(s!, d.uid!, d.slot as EquipSlot)); break;
    case 'enhance': commit(G.enhanceEquip(s!, d.e!, useBlessing)); if (s && s.blessings === 0) useBlessing = false; break;
    case 'dismantle': commit(G.dismantle(s!, d.e!)); break;
    case 'toggleBless': useBlessing = (el as HTMLInputElement).checked; render(); break;
    case 'buyPotion': commit(G.buyPotion(s!, d.id!, Number(d.n ?? 1))); break;
    case 'buyBless': commit(G.buyBlessing(s!, Number(d.n ?? 1))); break;
    case 'buyEquip': commit(G.buyEquip(s!, d.id!, Number(d.r) as Rarity)); break;
    case 'sell': commit(G.sellEquip(s!, d.e!)); break;
    case 'pickPotion': {
      const id = d.id!;
      if (gatePotions.includes(id)) gatePotions = gatePotions.filter((x) => x !== id);
      else if (gatePotions.length < MAX_POTIONS) gatePotions.push(id);
      else toast(`물약은 최대 ${MAX_POTIONS}종까지`, true);
      render(); break;
    }
    case 'depart': startRun(); break;
    case 'pickFloor': if (s) { s.settings.startFloor = Number(d.v); if (s.settings.targetFloor < s.settings.startFloor) s.settings.targetFloor = Math.min(MAX_FLOOR, s.settings.startFloor + 2); commit(); } break;
    case 'unequipAll': commit(G.unequipAll(s!, d.uid!)); break;
    case 'unequipParty': commit(G.unequipParty(s!)); break;
    case 'autoEquip': commit(G.autoEquip(s!, d.uid!)); break;
    case 'autoEquipParty': commit(G.autoEquipParty(s!)); break;
    case 'buyDeal': commit(G.buyDeal(s!, Number(d.i))); break;
    case 'buyStones': commit(G.buyStones(s!, Number(d.n))); break;
    case 'train': commit(G.train(s!, d.uid!)); break;
    case 'reroll': commit(G.rerollTrait(s!, d.uid!, Number(d.i))); break;
    case 'refine': commit(G.refine(s!, d.e!)); break;
    case 'craft': commit(G.craftSet(s!, d.id!)); break;
    case 'forgeSet': forgeSet = d.v!; render(); break;
    case 'forgeJob': forgeJob = d.v as BaseJob; render(); break;
    case 'buyEgg': commit(G.buyEggs(s!, Number(d.n ?? 1))); break;
    case 'petUse': petSel = null; commit(G.setActivePet(s!, d.id!)); break;
    case 'petSel': petSel = petSel === d.id ? null : d.id!; render(); break;
    case 'petOdds': petOdds = !petOdds; render(); break;
    case 'petSellLow': commit(G.sellPetsUpTo(s!, 2)); break;
    case 'petSell': petSel = null; commit(G.sellPet(s!, d.id!)); break;
    case 'optLock': commit(G.toggleOptionLock(s!, d.e!, Number(d.i))); break;
    case 'refineView': refineView = d.v as GroupView; render(); break;
    case 'partyIn': commit(G.togglePartyMember(s!, d.uid!)); break;
    case 'partyOut': commit(G.togglePartyMember(s!, d.uid!)); break;
    case 'partyFilter': partyFilter = d.v as PartyFilter; render(); break;
    case 'bulkR': { const r = Number(d.r) as Rarity; if (bulkR.has(r)) bulkR.delete(r); else bulkR.add(r); render(); break; }
    case 'bulkKeep': bulkKeepEnh = (el as HTMLInputElement).checked; render(); break;
    case 'bulkSell': case 'bulkDis': {
      if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = '한 번 더 누르면 실행'; break; }
      const f = { rarities: [...bulkR], keepEnhanced: bulkKeepEnh };
      commit(d.a === 'bulkSell' ? G.bulkSell(s!, f) : G.bulkDismantle(s!, f)); break;
    }
    case 'towerGo': startTowerRun(); break;
    case 'authMode': authMode = d.v as 'login' | 'signup'; authErr = ''; render(); break;
    case 'logout': stopSocial(); Cloud.signOut().then(() => { S = null; lastSave = null; screen = 'title'; render(); }); break;
    case 'rankKind': rankKind = d.v as Cloud.RankKind; render(); break;
    case 'rankRefresh': loadRanks(true); break;
    case 'chatToggle': chatOpen = !chatOpen; if (chatOpen && chatTab === 'chat') chatUnread = 0; renderChat(); break;
    case 'chatTab': chatTab = d.v as 'chat' | 'friends' | 'online'; if (chatTab === 'chat') chatUnread = 0; renderChat(); break;
    case 'friendAdd': Cloud.requestFriend(d.v!).then(async (e) => { if (e) toast(e, true); else { toast('친구 요청을 보냈어요'); friends = await Cloud.loadFriends(); renderChat(); } }); break;
    case 'friendAccept': Cloud.acceptFriend(Number(d.v)).then(async () => { friends = await Cloud.loadFriends(); renderChat(); toast('친구가 됐어요'); }); break;
    case 'friendRemove': Cloud.removeFriend(Number(d.v)).then(async () => { friends = await Cloud.loadFriends(); renderChat(); }); break;
    case 'wbAttack': wbAttack(); break;
    case 'wbRefresh': loadWB(true); break;
    case 'wbClaim': wbClaim(Number(d.v)); break;
    case 'mMax': mMax = Number(d.v); render(); break;
    case 'mRooms': refreshRooms(); break;
    case 'mCreate': (async () => { mBusy = true; render(); const r = await Cloud.createRoom(mFloor, mMax); mBusy = false; if (r.error) { toast(r.error, true); render(); return; } await enterRoom(r.id!); })(); break;
    case 'mJoin': (async () => { const e = await Cloud.joinRoom(d.v!); if (e) { toast(e, true); refreshRooms(); return; } await enterRoom(d.v!); })(); break;
    case 'mLeave': (async () => { const host = roomSt?.room.host === Cloud.session?.user.id; await Cloud.leaveRoom(myRoom!, host); myRoom = null; roomSt = null; roomLog = []; Cloud.watchRoom(null, () => {}); refreshRooms(); })(); break;
    case 'mPick': {
      const uid = d.uid!; const isHost = roomSt?.room.host === Cloud.session?.user.id;
      const max = slotsFor(Math.max(roomSt?.members.length ?? 2, 2), isHost);
      if (mPick.includes(uid)) mPick = mPick.filter((x) => x !== uid);
      else if (mPick.length < max) mPick = [...mPick, uid];
      else { toast(`${max}명까지 데려갈 수 있어요`, true); break; }
      render(); mSync(false); break;
    }
    case 'mReady': { const meM = roomSt?.members.find((m) => m.user_id === Cloud.session?.user.id); if (!mPick.length) { toast('데려갈 단원을 골라주세요', true); break; } if (S) saveGameNow(S); mSync(!meM?.ready); break; }
    case 'mStart': (async () => { if (!mPick.length) { toast('데려갈 단원을 골라주세요', true); return; } mBusy = true; render(); await mSync(true); if (S) await saveGameNow(S); const r = await Cloud.multiCall({ action: 'start', room: myRoom }); mBusy = false; if (r?.error) { toast(r.error, true); render(); return; } refreshRoom(); })(); break;
    case 'mKick': if (myRoom) Cloud.kickMember(myRoom, d.v!).then(() => refreshRoom()); break;
    case 'mDelete': Cloud.deleteRoom(d.v!).then(() => { toast('방을 삭제했어요'); refreshRooms(); }); break;
    case 'mSpeed': if (myRoom) Cloud.setRoomSpeed(myRoom, Number(d.v)).then(() => refreshRoom()); break;
    case 'mInvite': if (myRoom && roomSt) { Cloud.sendInvite(d.v!, myRoom, roomSt.room.floor); toast('초대를 보냈어요'); } break;
    case 'mInviteJoin': (async () => { invitePending = null; renderInvite(); const e = await Cloud.joinRoom(d.v!); if (e) { toast(e, true); return; } screen = 'multi'; await enterRoom(d.v!); render(); })(); break;
    case 'mInviteNo': invitePending = null; renderInvite(); break;
    case 'codexGrade': codexGrade = Number(d.v) as Grade | 0; render(); break;
    case 'adTab': adTab = d.v as typeof adTab; render(); adLoad(adTab); break;
    case 'adRefresh': adLoad(adTab, true); break;
    case 'adSort': adSort = d.v as typeof adSort; render(); break;
    case 'adUser': adOpenUser(d.v!); break;
    case 'adClose': adSel = null; render(); break;
    case 'adUTab': adUTab = d.v as typeof adUTab; render(); break;
    case 'noop': break;
    case 'adMute': { const u = adUsers.find((x) => x.id === d.v); if (u) Cloud.adminSet(u.id, !u.muted, u.is_admin).then((e) => { if (e) toast(e, true); else { u.muted = !u.muted; toast(u.muted ? '채팅 금지' : '채팅 금지 해제'); render(); } }); break; }
    case 'adAdmin': { const u = adUsers.find((x) => x.id === d.v); if (u) Cloud.adminSet(u.id, u.muted, !u.is_admin).then((e) => { if (e) toast(e, true); else { u.is_admin = !u.is_admin; toast(u.is_admin ? '관리자 지정' : '관리자 해제'); render(); } }); break; }
    case 'adDelChat': Cloud.adminDeleteChat(Number(d.v)).then(() => { adChats = adChats.filter((m) => m.id !== Number(d.v)); chatMsgs = chatMsgs.filter((m) => m.id !== Number(d.v)); render(); toast('삭제했어요'); }); break;
    case 'reload': if (S) saveGameNow(S).finally(() => location.reload()); else location.reload(); break;
    case 'noticeTab': noticeTab = d.v as typeof noticeTab; render(); break;
    case 'noticeNew': noticeEdit = { kind: 'patch', title: '', body: '', pinned: false }; render(); break;
    case 'noticeCancel': noticeEdit = null; render(); break;
    case 'noticeEditBtn': noticeEdit = { ...notices.find((n) => n.id === Number(d.v)) }; render(); window.scrollTo(0, 0); break;
    case 'noticeDel': if (confirmDel === d.v) { Cloud.deleteNotice(Number(d.v)).then(() => { confirmDel = ''; toast('삭제했어요'); loadNoticesNow(); }); } else { confirmDel = d.v!; toast('한 번 더 누르면 삭제돼요'); } break;
    case 'autoGrade': autoGrade = Number(d.v) as 4 | 5; render(); break;
    case 'autoTries': autoTries = Number(d.v); render(); break;
    case 'autoRefresh': boardConfirm = null; curAction = 'autoRefresh'; commit(G.autoRefresh(s!, autoGrade, autoTries)); break;
    case 'autoEnh': curAction = 'autoEnh'; commit(G.autoEnhance(s!, d.e!, Number(d.v), useBlessing)); if (s && s.blessings === 0) useBlessing = false; break;
    case 'cardTab': cardTab = d.v as typeof cardTab; cardSel = null; render(); break;
    case 'cardSetF': cardSet = d.v!; render(); break;
    case 'cardSel': cardSel = cardSel === d.v ? null : d.v!; render(); if (cardSel) document.querySelector('.cdetail')?.scrollIntoView({ block: 'nearest' }); break;
    case 'cardDeck': curAction = 'cardDeck'; commit(G.toggleDeck(s!, d.v!)); break;
    case 'cardAwaken': curAction = 'cardAwaken'; commit(G.awakenCard(s!, d.v!)); break;
    case 'cardOpen': curAction = 'cardOpen'; commit(G.openCardPacks(s!, Number(d.v))); break;
    case 'claimQuest': commit(G.claimQuest(s!)); break;
    case 'whFilter': whFilter = d.v as WhFilter; render(); break;
    case 'whOpen': whOpen = whOpen === d.e ? null : d.e!; render(); break;
    case 'smithView': smithView = d.v as GroupView; render(); break;
    case 'setMode': if (s) { s.settings.mode = d.v as 'advance' | 'repeat'; commit(); } break;
    case 'raidDiff': raidDiff = d.v as RaidDiff; render(); break;
    case 'raidGo': startRaidRun(); break;
    case 'dailyStage': dailyStage[d.id!] = Number(d.v); render(); break;
    case 'dailySweep': commit(G.sweepDaily(s!, d.id!, Number(d.v))); break;
    case 'dailyGo': startDailyRun(d.id!, Number(d.v)); break;
    case 'pickRegion': if (s) {
      gateRegion = d.v || null;
      const r = REGIONS.find((x) => x.id === gateRegion);
      if (r?.floors) { s.settings.startFloor = Math.max(r.floors[0], Math.min(r.floors[1], G.maxStartFloor(s))); s.settings.targetFloor = Math.min(r.floors[1], s.settings.startFloor + 2); }
      render(); window.scrollTo(0, 0);
    } break;
    case 'speed': speed = Number(d.v) as 1 | 2 | 0; document.querySelectorAll('.speed button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.v === d.v)); break;
    case 'toggleAuto':
      if (EX) {
        EX.settings.auto = (el as HTMLInputElement).checked;
        if (EX.settings.auto && phase === 'between' && lastFloor) afterFloor(lastFloor);
      }
      break;
    case 'nextFloor': if (EX) { EX.next(); playFloor(); } break;
    case 'retreat': if (EX) { EX.finish('manual'); phase = 'done'; endRun(); } break;
    case 'endRun': endRun(); break;
    case 'copySave': {
      const t = document.getElementById('saveOut') as HTMLTextAreaElement;
      navigator.clipboard?.writeText(t.value).then(() => toast('복사했어요'), () => { t.select(); toast('코드를 선택했어요. 직접 복사해 주세요'); });
      break;
    }
    case 'importSave': {
      const v = (document.getElementById('saveIn') as HTMLTextAreaElement).value;
      const loaded = importSave(v);
      if (!loaded) { toast('코드를 읽을 수 없어요', true); break; }
      S = loaded; modal = null; screen = 'town'; commit({ ok: true, msg: '불러왔어요' }); break;
    }
    case 'wipe':
      if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = '정말 지울까요? 한 번 더 누르기'; break; }
      wipeSave(); S = null; lastSave = null; modal = null; screen = 'title'; render(); break;
  }
});

app.addEventListener('input', (ev) => {
  const t = ev.target as HTMLInputElement;
  if (t.id === 'chatIn') chatDraft = t.value;
  if (t.id === 'friendIn') friendDraft = t.value;
  if (t.id === 'roomIn') roomDraft = t.value;
  if (t.id === 'adQ') { adQ = t.value; const pos = t.selectionStart; render(); const n = document.getElementById('adQ') as HTMLInputElement | null; if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
});
app.addEventListener('submit', (ev) => {
  const f = ev.target as HTMLElement;
  if (f.dataset.form === 'auth') { ev.preventDefault(); if (!authBusy) submitAuth(); }
  if (f.dataset.form === 'chat') { ev.preventDefault(); submitChat(); }
  if (f.dataset.form === 'notice') {
    ev.preventDefault();
    const fd = new FormData(f as HTMLFormElement);
    const n = { id: noticeEdit?.id, kind: String(fd.get('kind')), title: String(fd.get('title') ?? '').trim(), body: String(fd.get('body') ?? ''), pinned: fd.get('pinned') === 'on' };
    if (!n.title) { toast('제목을 넣어주세요', true); return; }
    Cloud.saveNotice(n).then((e) => { if (e) toast(e, true); else { noticeEdit = null; toast(n.id ? '수정했어요' : '공지를 올렸어요'); loadNoticesNow(); } });
  }
  if (f.dataset.form === 'adgift' && adSel) {
    ev.preventDefault();
    const fd = new FormData(f as HTMLFormElement);
    const g = Object.fromEntries(['gold', 'stones', 'blessings', 'refineStones', 'cores', 'scales'].map((k) => [k, Math.max(0, Math.floor(Number(fd.get(k)) || 0))])) as { gold: number; stones: number; blessings: number; refineStones: number; cores: number; scales: number };
    if (!Object.values(g).some((v) => v > 0)) { toast('지급할 수량을 넣어주세요', true); return; }
    const who = adUsers.find((u) => u.id === adSel)?.username ?? '';
    Cloud.adminGift(adSel, g).then((e) => { if (e) toast(e, true); else { toast(`${who}에게 지급 완료`); if (adSel === Cloud.session?.user.id) toast('내 계정에 지급했어요. 새로고침하면 반영돼요'); adOpenUser(adSel!); adLoad('users', true); } });
  }
  if (f.dataset.form === 'room') {
    ev.preventDefault();
    const inp = document.getElementById('roomIn') as HTMLInputElement; const v = inp.value; if (!v.trim() || !myRoom) return;
    inp.value = ''; roomDraft = '';
    Cloud.sendChat(v, `room:${myRoom}`).then((e) => { if (e) { toast(e, true); inp.value = v; roomDraft = v; } });
  }
  if (f.dataset.form === 'friend') { ev.preventDefault(); submitFriend(); }
});
app.addEventListener('change', (ev) => {
  const sel = ev.target as HTMLSelectElement;
  if (sel.dataset?.m === 'floor') { mFloor = Number(sel.value); return; }
  if (sel.dataset?.ad === 'kind') { adKind = sel.value; adLoad('log', true); return; }
  const el = ev.target as HTMLElement;
  const key = el.dataset.g as keyof ExpeditionSettings | undefined;
  if (key && S) {
    const st = S.settings as any;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') st[key] = el.checked;
    else if (key === 'auto') st.auto = (el as HTMLSelectElement).value === '1';
    else st[key] = Number((el as HTMLSelectElement).value);
    if (key === 'startFloor' && st.targetFloor < st.startFloor) st.targetFloor = Math.min(MAX_FLOOR, st.startFloor + 2);
    commit();
    return;
  }
  if (el.dataset.a === 'equipToSel' && S) {
    const v = (el as HTMLSelectElement).value;
    if (v) commit(G.equipTo(S, el.dataset.e!, v));
    return;
  }
  if (el.dataset.a === 'equipSel' && S) {
    const v = (el as HTMLSelectElement).value;
    if (v) commit(G.equip(S, el.dataset.uid!, v));
  }
});

app.addEventListener('toggle', (ev) => {
  const el = ev.target as HTMLElement;
  if (el.hasAttribute?.('data-bulk')) bulkOpen = (el as HTMLDetailsElement).open;
  if (el.hasAttribute?.('data-drops')) dropOpen = (el as HTMLDetailsElement).open;
}, true);

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && modal) { modal = null; render(); }
});

// ───────── 시작 ─────────
/** 새 버전 알림 (서버 버전에서만): 5분마다 version.json 확인 */
let newVersion = false;
function checkVersion() {
  if (!CLOUD) return;
  fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()).then((v) => {
    if (v?.build && v.build !== __BUILD__ && !newVersion) { newVersion = true; renderUpdate(); }
  }).catch(() => {});
}
function renderUpdate() {
  document.querySelector('.updbar')?.remove();
  if (newVersion) app.insertAdjacentHTML('beforeend', '<button class="updbar" data-a="reload">✨ 새 버전이 나왔어요 · 눌러서 새로고침</button>');
}
setInterval(checkVersion, 300000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });

async function boot() {
  render();
  await initRemote();
  lastSave = await loadGame();
  render();
  startSocial();
}
boot();
