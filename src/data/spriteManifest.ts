/** 자동 생성: python3 scripts/sprites.py — 직접 고치지 않는다. 값은 webp 픽셀 크기 (높이 기준 256) */
export interface SpriteInfo { w: number; h: number; aw?: number; ah?: number }
export const SPRITES: Record<string, SpriteInfo> = {
  'job/archer': {w: 197, h: 256, aw: 251, ah: 236},
  'job/mage': {w: 201, h: 256, aw: 294, ah: 236},
  'job/priest': {w: 192, h: 256, aw: 326, ah: 236},
  'job/warrior': {w: 210, h: 256, aw: 290, ah: 236},
  'mon/bat': {w: 407, h: 256},
  'mon/ghoul': {w: 251, h: 256},
  'mon/morten': {w: 230, h: 256, aw: 326, ah: 236},
  'mon/rat': {w: 440, h: 256},
  'mon/skeleton': {w: 277, h: 256},
  'mon/skeletonKnight': {w: 262, h: 256},
};
