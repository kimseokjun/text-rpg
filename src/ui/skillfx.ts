/** 스킬별 이펙트: 스킬 이름 → 연출 방식·색. 레이드 무대(r4stage)에서 사용 */

export type FxStyle =
  | 'slash' | 'spin' | 'quake' | 'orb' | 'shard' | 'bolt' | 'chain' | 'meteor' | 'starfall' | 'nova' | 'arrow' | 'volley' | 'skyArrow'
  | 'poison' | 'hammer' | 'breath' | 'drain' | 'trap' | 'seal'
  | 'heal' | 'barrier' | 'aura' | 'summon' | 'taunt' | 'blizzard' | 'dark';
export interface FxSpec { style: FxStyle; c1: string; c2: string; big?: boolean; icon?: string }

const F = (style: FxStyle, c1: string, c2: string, o: { big?: boolean; icon?: string } = {}): FxSpec => ({ style, c1, c2, ...o });
const FIRE = ['#ffd080', '#ff4a1a'], ICE = ['#e8faff', '#4ab0ff'], HOLY = ['#fff8d0', '#ffd24a'], DARK = ['#d8a0ff', '#5a1aa0'], BLOOD = ['#ff9aa8', '#b0102a'], NATURE = ['#d8ffb0', '#4ac04a'], STEEL = ['#ffffff', '#a8c8e8'], BOLT = ['#fffbd0', '#ffe040'], ARC = ['#f0d0ff', '#a050ff'];

/** 스킬 이름 → 이펙트 (보스 기술 포함) */
const BY_NAME: Record<string, FxSpec> = {
  // 전사
  강타: F('slash', STEEL[0], STEEL[1]), 휩쓸기: F('spin', STEEL[0], STEEL[1]), 철벽: F('aura', STEEL[0], '#8aa8c8', { icon: '🛡' }), '방패 치기': F('slash', '#e0f0ff', '#4a90d0', { icon: '💫' }),
  도발: F('taunt', '#ffb0a0', '#ff4030', { icon: '❗' }), '피의 일격': F('slash', BLOOD[0], BLOOD[1], { big: true }), '피의 폭풍': F('spin', BLOOD[0], BLOOD[1], { big: true }),
  '야수의 포효': F('aura', '#ffc890', '#e0601a', { icon: '🐾' }), 아이기스: F('barrier', HOLY[0], HOLY[1], { icon: '🛡' }), '전쟁의 함성': F('quake', '#ffd8a0', '#ff8a1a'),
  '대지의 진군': F('quake', '#e8d0a0', '#a06a2a', { big: true }), '성검 일섬': F('slash', HOLY[0], HOLY[1], { big: true }), '거신의 성벽': F('barrier', '#e8f0ff', '#7a9ad8', { icon: '🏰', big: true }),
  '학살의 춤': F('spin', '#ffd0d0', '#ff2040', { big: true }), '불멸의 맹세': F('aura', '#fff', '#ffd95e', { icon: '✨' }),
  // 마법사
  파이어볼: F('orb', FIRE[0], FIRE[1]), 썬더: F('bolt', BOLT[0], BOLT[1]), '마나 실드': F('barrier', '#c8e8ff', '#4a80ff'), 빙결: F('shard', ICE[0], ICE[1]),
  메테오: F('meteor', FIRE[0], FIRE[1], { big: true }), 저주: F('poison', ARC[0], '#6a2aa0'), '생명 흡수': F('drain', BLOOD[0], BLOOD[1]), '아케인 노바': F('nova', ARC[0], ARC[1], { big: true }),
  '해골 군단': F('summon', '#f0ead8', '#8a7a5a', { icon: '💀' }), '연쇄 번개': F('chain', BOLT[0], '#6ac8ff', { big: true }), '죽음의 저주': F('poison', '#c0a0d0', '#2a0a3a', { big: true }),
  '별의 낙하': F('starfall', '#fff', '#a0c8ff', { big: true }), '망자의 군세': F('summon', '#c0ffd0', '#2a6a4a', { icon: '👻', big: true }), '용의 숨결': F('breath', '#ffe0a0', '#ff5a10', { big: true }),
  // 궁수
  '조준 사격': F('arrow', '#fff2b0', '#ffd95e'), 연사: F('volley', '#fff2b0', '#ffc040'), 독화살: F('poison', NATURE[0], '#3a9a2a'), '침묵 화살': F('arrow', ARC[0], ARC[1], { icon: '🤐' }),
  '급소 사격': F('arrow', '#ffd0d0', '#ff3040', { big: true }), '함정 설치': F('trap', '#e0d0b0', '#8a6a3a'), '늑대 소환': F('summon', '#e0e8f0', '#7a8a9a', { icon: '🐺' }),
  '천공의 화살': F('skyArrow', '#e8f8ff', '#6ac8ff', { big: true }), '폭풍 화살': F('volley', NATURE[0], '#30c080', { big: true }), '신살의 화살': F('arrow', HOLY[0], HOLY[1], { big: true }),
  // 성직자
  '홀리 라이트': F('orb', HOLY[0], HOLY[1]), 치유: F('heal', '#d0ffd0', '#4ae07a'), 축복: F('aura', HOLY[0], HOLY[1], { icon: '✦' }), 보호막: F('barrier', '#d0f0ff', '#6ab8ff'),
  '봉인의 기도': F('seal', HOLY[0], '#c8a0ff'), '심판의 망치': F('hammer', HOLY[0], HOLY[1], { big: true }), 대치유: F('heal', '#e0ffe0', '#30d070', { big: true }),
  '신성한 방벽': F('barrier', HOLY[0], HOLY[1], { big: true }), '신성 심판': F('nova', HOLY[0], HOLY[1], { big: true }), 성역: F('heal', HOLY[0], HOLY[1], { big: true, icon: '✚' }),
  '심판의 날': F('meteor', '#fffbe0', '#ffd24a', { big: true }), '천상의 은총': F('heal', '#ffffff', '#ffe28a', { big: true, icon: '🕊' }),
  // 레이드 보스
  '심연 강타': F('slash', DARK[0], DARK[1], { big: true }), '공허의 숨결': F('breath', DARK[0], DARK[1], { big: true }), '심연의 표식': F('seal', '#ff9ab0', '#c01040'),
  '사도 소환': F('summon', DARK[0], DARK[1], { icon: '👁' }), '부식의 저주': F('poison', '#c0ff90', '#3a6a1a', { big: true }),
  '서리 강타': F('shard', ICE[0], ICE[1], { big: true }), 눈보라: F('blizzard', ICE[0], ICE[1], { big: true }), '얼음 감옥': F('shard', '#ffffff', '#8ad0ff', { big: true }),
  '흡혈 일격': F('drain', BLOOD[0], BLOOD[1], { big: true }), '핏빛 파도': F('breath', BLOOD[0], BLOOD[1], { big: true }), '박쥐 떼': F('summon', BLOOD[0], BLOOD[1], { icon: '🦇' }), 출혈: F('poison', BLOOD[0], BLOOD[1], { big: true }),
};

export function fxFor(skill: string, boss: boolean): FxSpec {
  return BY_NAME[skill] ?? (boss ? F('dark', DARK[0], DARK[1], { big: true }) : guess(skill));
}
/** 표에 없는 스킬은 이름으로 대충 */
function guess(s: string): FxSpec {
  if (/화살|사격|궁|샷/.test(s)) return F('arrow', '#fff2b0', '#ffd95e');
  if (/불|화염|파이어/.test(s)) return F('orb', FIRE[0], FIRE[1]);
  if (/얼음|서리|빙/.test(s)) return F('shard', ICE[0], ICE[1]);
  if (/번개|썬더/.test(s)) return F('bolt', BOLT[0], BOLT[1]);
  if (/치유|회복|힐/.test(s)) return F('heal', '#d0ffd0', '#4ae07a');
  if (/빛|성|신/.test(s)) return F('orb', HOLY[0], HOLY[1]);
  return F('slash', STEEL[0], STEEL[1]);
}
/** 이펙트 종류별 기본 (투사체 계열인지, 범위 연출을 한 번에 하는지) */
export const AREA: Partial<Record<FxStyle, true>> = { spin: true, quake: true, bolt: true, chain: true, meteor: true, starfall: true, nova: true, breath: true, blizzard: true };
export const SELF: Partial<Record<FxStyle, true>> = { aura: true, barrier: true, summon: true, taunt: true };
