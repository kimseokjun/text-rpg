/** 꾸미기: 용병단장 아바타(전체) + 용병(망토·오라·이름표·등장 효과) */
import type { R4BossId, R4Diff } from './raid4';

/** 용병단장 아바타 외형 (색은 #hex, 부위는 픽셀 부품 이름) */
export type AvatarBody = 'warrior' | 'mage' | 'archer' | 'priest';
export interface AvatarLook {
  body: AvatarBody; hair: string; hairColor: string; skin: string; head: string; outfit: string; trim: string;
  weapon: string; shield: string; beard: boolean; cape: string | null; wings: string | null;
}
/** 아바타에 단 꾸미기 (오라·이름표·등장 효과는 아이템 id) */
export interface AvatarState { look: Partial<AvatarLook>; aura?: string | null; plate?: string | null; ent?: string | null; capeId?: string | null; wingsId?: string | null; hairId?: string | null; headId?: string | null }
export type MercCos = Partial<Record<'cape' | 'aura' | 'plate' | 'ent', string>>;

export type CosKind = 'hairColor' | 'head' | 'cape' | 'wings' | 'aura' | 'plate' | 'ent';
export interface CosItem { id: string; kind: CosKind; name: string; value: string; price?: number; src?: string; desc?: string }
const C = (kind: CosKind, key: string, name: string, value: string, o: { price?: number; src?: string; desc?: string } = {}): CosItem => ({ id: `${kind}:${key}`, kind, name, value, ...o });

export const COS_KIND_KO: Record<CosKind, string> = { hairColor: '머리색', head: '모자', cape: '망토', wings: '날개', aura: '오라', plate: '이름표', ent: '등장 효과' };
/** 용병에게도 달 수 있는 것 */
export const MERC_KINDS: CosKind[] = ['cape', 'aura', 'plate', 'ent'];

export const COSMETICS: CosItem[] = [
  // 특별 머리색 (기본 색은 무료)
  C('hairColor', 'pink', '벚꽃', '#e85a8a', { price: 300000 }), C('hairColor', 'cyan', '빙하', '#4ac0d8', { price: 300000 }),
  C('hairColor', 'white', '은백', '#f0f0f8', { price: 300000 }), C('hairColor', 'red', '진홍', '#c8302a', { price: 300000 }),
  // 특별 모자 (기본: 없음·후드·두건·서클릿·마법사 모자·투구)
  C('head', 'feather', '깃털 모자', 'feather', { price: 500000 }), C('head', 'mitre', '주교관', 'mitre', { price: 500000 }),
  C('head', 'hornhelm', '뿔 투구', 'hornhelm', { price: 800000 }), C('head', 'greathelm', '대형 투구', 'greathelm', { price: 800000 }),
  C('head', 'crown', '왕관', 'crown', { price: 3000000 }),
  // 망토
  C('cape', 'crimson', '진홍 망토', '#9a2a2a', { price: 500000 }), C('cape', 'royal', '왕실 망토', '#2a4aa0', { price: 500000 }),
  C('cape', 'forest', '숲 망토', '#2a6a3a', { price: 500000 }), C('cape', 'night', '칠흑 망토', '#1e1628', { price: 800000 }),
  C('cape', 'white', '순백 망토', '#ece6d8', { price: 800000 }), C('cape', 'gold', '황금 망토', '#d8ac3f', { price: 1500000 }),
  C('cape', 'abyss', '심연의 망토', '#3a1a6a', { src: 'raid:abaddon:normal', desc: '아바돈 처치' }),
  C('cape', 'frost', '서리 망토', '#7ac8f0', { src: 'raid:frost:normal', desc: '니플헤임 처치' }),
  C('cape', 'blood', '핏빛 망토', '#8a0a20', { src: 'raid:blood:normal', desc: '세레네 처치' }),
  // 날개 (아바타 전용)
  C('wings', 'angel', '천사의 날개', '#f4f0e8', { price: 5000000 }), C('wings', 'fallen', '타락한 날개', '#3a1a5a', { price: 5000000 }),
  C('wings', 'flame', '불꽃 날개', '#e0503a', { price: 5000000 }),
  C('wings', 'abyss', '심연의 날개', '#5a2aa0', { src: 'raid:abaddon:hell', desc: '헬 아바돈 처치' }),
  C('wings', 'frost', '빙결의 날개', '#9ad8ff', { src: 'raid:frost:hell', desc: '헬 니플헤임 처치' }),
  C('wings', 'blood', '혈월의 날개', '#b0102a', { src: 'raid:blood:hell', desc: '헬 세레네 처치' }),
  // 오라 (발밑 빛)
  C('aura', 'gold', '황금 오라', '#ffd95e', { price: 1000000 }), C('aura', 'flame', '화염 오라', '#ff6a2a', { price: 1000000 }),
  C('aura', 'nature', '숲의 오라', '#5ae07a', { price: 1000000 }), C('aura', 'shadow', '그림자 오라', '#7a40ff', { price: 1500000 }),
  C('aura', 'star', '별빛 오라', '#bfe0ff', { src: 'ach:4', desc: '업적 점수 700점' }),
  C('aura', 'abyss', '심연 오라', '#7a2aff', { src: 'raid:abaddon:hard', desc: '하드 아바돈 처치' }),
  C('aura', 'frost', '서리 오라', '#6ac8ff', { src: 'raid:frost:hard', desc: '하드 니플헤임 처치' }),
  C('aura', 'blood', '핏빛 오라', '#ff2a4a', { src: 'raid:blood:hard', desc: '하드 세레네 처치' }),
  // 이름표
  C('plate', 'silver', '은빛 이름표', 'silver', { price: 300000 }), C('plate', 'royal', '왕실 이름표', 'royal', { price: 1500000 }),
  C('plate', 'gold', '황금 이름표', 'gold', { src: 'ach:3', desc: '업적 점수 450점' }),
  C('plate', 'abyss', '심연 이름표', 'abyss', { src: 'raid:abaddon:normal', desc: '아바돈 처치' }),
  C('plate', 'fish', '낚시왕 이름표', 'fish', { src: 'fish:legend', desc: '광장 낚시에서 전설 물고기 낚기' }),
  // 낚시 중 낮은 확률로 (숙련도가 높을수록 잘 나옴)
  C('cape', 'angler', '어부의 망토', '#3a6a8a', { src: 'fish:drop', desc: '광장 낚시 중 낮은 확률' }),
  C('cape', 'coral', '산호 망토', '#e8706a', { src: 'fish:drop', desc: '광장 낚시 중 낮은 확률' }),
  C('aura', 'wave', '물결 오라', '#4ac0ff', { src: 'fish:drop', desc: '광장 낚시 중 낮은 확률' }),
  C('aura', 'pearl', '진주 오라', '#f0e6ff', { src: 'fish:drop', desc: '광장 낚시 중 낮은 확률' }),
  C('hairColor', 'sea', '바다빛', '#2a8ad8', { src: 'fish:drop', desc: '광장 낚시 중 낮은 확률' }),
  C('plate', 'wave', '파도 이름표', 'wave', { src: 'fish:drop', desc: '광장 낚시 중 낮은 확률' }),
  C('plate', 'frost', '서리 이름표', 'frost', { src: 'raid:frost:normal', desc: '니플헤임 처치' }),
  C('plate', 'blood', '핏빛 이름표', 'blood', { src: 'raid:blood:normal', desc: '세레네 처치' }),
  // 등장 효과 (레이드·결투 시작할 때)
  C('ent', 'flash', '섬광 등장', 'flash', { price: 1000000 }), C('ent', 'flame', '화염 등장', 'flame', { price: 1500000 }),
  C('ent', 'holy', '성광 등장', 'holy', { price: 1500000 }), C('ent', 'shadow', '그림자 등장', 'shadow', { src: 'raid:abaddon:hell', desc: '헬 아바돈 처치' }),
];
export const COS_BY_ID: Record<string, CosItem> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));
/** 기본(무료) 모자 */
export const FREE_HEADS = ['none', 'hood', 'bandana', 'circlet', 'wizard', 'helm'];
/** 기본 옷 색 · 장식 색 */
export const OUTFIT_COLORS = ['#5b6fa0', '#7d8794', '#8a3a3a', '#4a5a4a', '#6a5a8a', '#8a6a3a', '#2f4f8f', '#8a2f4a', '#2f6a6a', '#4f7a3a', '#ece4d0', '#2a2430'];
export const TRIM_COLORS = ['#c89b3c', '#ffd95e', '#b4bcc8', '#e85a3a', '#4ac0d8', '#9a5ad8'];
/** 레이드 처치로 얻는 꾸미기 (그 보스 · 그 난이도 이상) */
export function raidCosmetics(boss: R4BossId, diff: R4Diff): CosItem[] {
  const rank = { normal: 0, hard: 1, hell: 2 }[diff];
  return COSMETICS.filter((c) => { const m = c.src?.match(/^raid:(\w+):(\w+)$/); return !!m && m[1] === boss && { normal: 0, hard: 1, hell: 2 }[m[2] as R4Diff] <= rank; });
}
