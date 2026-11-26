import type { SkillDef } from '../core/types';

const pct = (key: any, value: number) => ({ key, kind: 'pct' as const, value });

export const SKILLS: Record<string, SkillDef> = {
  // ───── 전사 ─────
  smash: { id: 'smash', name: '강타', mp: 6, effects: [{ type: 'damage', scale: 'atk', power: 1.5, target: 'single' }] },
  sweep: {
    id: 'sweep', name: '휩쓸기', mp: 10,
    effects: [{ type: 'damage', scale: 'atk', power: 0.8, target: 'all' }],
    defaultCondition: { type: 'enemyCount', min: 2 },
  },
  ironWall: {
    id: 'ironWall', name: '철벽', mp: 8,
    effects: [{ type: 'buff', target: 'self', mods: [pct('def', 30)], turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },
  // 나이트
  taunt: {
    id: 'taunt', name: '도발', mp: 8,
    effects: [{ type: 'taunt', turns: 2 }, { type: 'buff', target: 'self', mods: [pct('def', 20)], turns: 2 }],
    defaultCondition: { type: 'notActive' },
  },
  // 버서커
  bloodStrike: {
    id: 'bloodStrike', name: '피의 일격', mp: 0,
    effects: [{ type: 'damage', scale: 'atk', power: 2.5, target: 'single', hpCostPct: 10 }],
    defaultCondition: { type: 'selfHpBelow', pct: 101 },
  },

  // ───── 마법사 ─────
  fireball: {
    id: 'fireball', name: '파이어볼', mp: 8,
    effects: [{ type: 'damage', scale: 'mag', power: 1.6, target: 'single', status: { type: 'burn', turns: 3, chance: 50 } }],
  },
  thunder: {
    id: 'thunder', name: '썬더', mp: 12,
    effects: [{ type: 'damage', scale: 'mag', power: 0.9, target: 'all' }],
    defaultCondition: { type: 'enemyCount', min: 2 },
  },
  manaShield: {
    id: 'manaShield', name: '마나 실드', mp: 10,
    effects: [{ type: 'buff', target: 'self', mods: [], turns: 3, flag: 'manaShield' }],
    defaultCondition: { type: 'selfHpBelow', pct: 50 },
  },
  meteor: {
    id: 'meteor', name: '메테오', mp: 22,
    effects: [{ type: 'damage', scale: 'mag', power: 2.0, target: 'all', status: { type: 'burn', turns: 2, chance: 30 } }],
    defaultCondition: { type: 'enemyCount', min: 2 },
  },
  drainLife: {
    id: 'drainLife', name: '생명 흡수', mp: 10,
    effects: [{ type: 'damage', scale: 'mag', power: 1.4, target: 'single', lifestealPct: 50 }],
  },
  curse: {
    id: 'curse', name: '저주', mp: 10,
    effects: [{ type: 'debuff', target: 'all', mods: [pct('def', -30), pct('res', -30)], turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },

  // ───── 궁수 ─────
  aimedShot: { id: 'aimedShot', name: '조준 사격', mp: 6, effects: [{ type: 'damage', scale: 'atk', power: 1.4, target: 'single', critBonus: 20 }] },
  rapidFire: { id: 'rapidFire', name: '연사', mp: 9, effects: [{ type: 'damage', scale: 'atk', power: 0.5, target: 'single', hits: 3 }] },
  poisonArrow: {
    id: 'poisonArrow', name: '독화살', mp: 7,
    effects: [{ type: 'damage', scale: 'atk', power: 1.0, target: 'single', status: { type: 'poison', turns: 3, chance: 80 } }],
  },
  // ── 방해 스킬 (각 기본 직업 15레벨): 4인 레이드 전멸기 끊기 ──
  shieldBash: { id: 'shieldBash', name: '방패 치기', mp: 10, effects: [{ type: 'damage', scale: 'atk', power: 1.2, target: 'single', status: { type: 'stun', turns: 1, chance: 50 }, interrupt: 40 }] },
  frostBind: { id: 'frostBind', name: '빙결', mp: 12, effects: [{ type: 'damage', scale: 'mag', power: 1.2, target: 'single', status: { type: 'stun', turns: 1, chance: 45 }, interrupt: 40 }] },
  silenceArrow: { id: 'silenceArrow', name: '침묵 화살', mp: 10, effects: [{ type: 'damage', scale: 'atk', power: 1.3, target: 'single', status: { type: 'silence', turns: 2, chance: 60 }, interrupt: 35 }] },
  sealPrayer: { id: 'sealPrayer', name: '봉인의 기도', mp: 10, effects: [{ type: 'debuff', target: 'single', mods: [], turns: 1, status: { type: 'silence', turns: 2, chance: 75 }, interrupt: 35 }] },
  cleanse: { id: 'cleanse', name: '정화', mp: 12, effects: [{ type: 'cleanse', pctMaxHp: 12 }] },
  vitalShot: { id: 'vitalShot', name: '급소 사격', mp: 12, effects: [{ type: 'damage', scale: 'atk', power: 1.8, target: 'single', guaranteedCrit: true }] },
  trap: {
    id: 'trap', name: '함정 설치', mp: 10,
    effects: [{ type: 'debuff', target: 'single', mods: [], turns: 1, status: { type: 'stun', turns: 1, chance: 70 }, interrupt: 40 }],
  },
  summonWolf: {
    id: 'summonWolf', name: '늑대 소환', mp: 14,
    effects: [{ type: 'buff', target: 'self', mods: [], turns: 3, flag: 'extraHit' }],
    defaultCondition: { type: 'notActive' },
  },

  // ───── 성직자 ─────
  holyLight: { id: 'holyLight', name: '홀리 라이트', mp: 7, effects: [{ type: 'damage', scale: 'mag', power: 1.3, target: 'single', undeadBonus: 1.0 }] },
  heal: {
    id: 'heal', name: '치유', mp: 9,
    effects: [{ type: 'heal', target: 'lowestAlly', pctMaxHp: 25 }],
    defaultCondition: { type: 'allyHpBelow', pct: 60 },
  },
  bless: {
    id: 'bless', name: '축복', mp: 12,
    effects: [{ type: 'buff', target: 'party', mods: [pct('atk', 15), pct('mag', 15)], turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },
  judgment: { id: 'judgment', name: '심판의 망치', mp: 10, effects: [{ type: 'damage', scale: 'atk+mag', power: 1.2, target: 'single', undeadBonus: 0.5 }] },
  greatHeal: {
    id: 'greatHeal', name: '대치유', mp: 18,
    effects: [{ type: 'heal', target: 'party', pctMaxHp: 30 }],
    defaultCondition: { type: 'allyHpBelow', pct: 50 },
  },

  // ───── 3차 전직 ─────
  vowOfImmortality: {
    id: 'vowOfImmortality', name: '불멸의 맹세', mp: 20,
    effects: [{ type: 'buff', target: 'party', mods: [pct('dmgTaken', -25)], turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },
  bloodStorm: {
    id: 'bloodStorm', name: '피의 폭풍', mp: 0,
    effects: [{ type: 'damage', scale: 'atk', power: 1.8, target: 'all', hpCostPct: 15 }],
    defaultCondition: { type: 'enemyCount', min: 2 },
  },
  arcaneNova: {
    id: 'arcaneNova', name: '아케인 노바', mp: 32,
    effects: [{ type: 'damage', scale: 'mag', power: 2.6, target: 'all' }],
  },
  skeletonLegion: {
    id: 'skeletonLegion', name: '해골 군단', mp: 24,
    effects: [{ type: 'buff', target: 'self', mods: [], turns: 3, flag: 'skeletons' }],
    defaultCondition: { type: 'notActive' },
  },
  skyArrow: {
    id: 'skyArrow', name: '천공의 화살', mp: 22,
    effects: [{ type: 'damage', scale: 'atk', power: 3.2, target: 'single', guaranteedCrit: true }],
  },
  beastRoar: {
    id: 'beastRoar', name: '야수의 포효', mp: 18,
    effects: [{ type: 'buff', target: 'party', mods: [pct('atk', 25)], turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },
  holyJudgment: {
    id: 'holyJudgment', name: '신성 심판', mp: 26,
    effects: [{ type: 'damage', scale: 'atk+mag', power: 1.5, target: 'all', undeadBonus: 1.0 }],
  },
  sanctuary: {
    id: 'sanctuary', name: '성역', mp: 30,
    effects: [
      { type: 'heal', target: 'party', pctMaxHp: 40 },
      { type: 'buff', target: 'party', mods: [pct('dmgTaken', -20)], turns: 2 },
    ],
    defaultCondition: { type: 'allyHpBelow', pct: 45 },
  },
  // ───── 보호막 (성직자) ─────
  barrier: {
    id: 'barrier', name: '보호막', mp: 12,
    effects: [{ type: 'shield', target: 'party', pctMaxHp: 20, turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },
  divineBarrier: {
    id: 'divineBarrier', name: '신성한 방벽', mp: 22,
    effects: [{ type: 'shield', target: 'party', pctMaxHp: 30, turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },
  // ───── 4차 ─────
  aegis: {
    id: 'aegis', name: '아이기스', mp: 26,
    effects: [{ type: 'taunt', turns: 2 }, { type: 'buff', target: 'party', mods: [pct('dmgTaken', -30)], turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },
  warCry: {
    id: 'warCry', name: '전쟁의 함성', mp: 24,
    effects: [{ type: 'damage', scale: 'atk', power: 2.2, target: 'all' }, { type: 'buff', target: 'party', mods: [pct('atk', 15)], turns: 2 }],
  },
  chainLightning: {
    id: 'chainLightning', name: '연쇄 번개', mp: 36,
    effects: [{ type: 'damage', scale: 'mag', power: 3.0, target: 'all', status: { type: 'stun', turns: 1, chance: 15 }, interrupt: 15 }],
  },
  deathCurse: {
    id: 'deathCurse', name: '죽음의 저주', mp: 28,
    effects: [{ type: 'debuff', target: 'all', mods: [pct('def', -40), pct('res', -40)], turns: 3, status: { type: 'poison', turns: 3, chance: 100 } }],
    defaultCondition: { type: 'notActive' },
  },
  galeShot: {
    id: 'galeShot', name: '폭풍 화살', mp: 26,
    effects: [{ type: 'damage', scale: 'atk', power: 1.5, target: 'single', hits: 3, critBonus: 25 }],
  },
  stampede: {
    id: 'stampede', name: '대지의 진군', mp: 28,
    effects: [{ type: 'damage', scale: 'atk', power: 2.0, target: 'all', status: { type: 'stun', turns: 1, chance: 25 }, interrupt: 15 }],
  },
  holyBlade: {
    id: 'holyBlade', name: '성검 일섬', mp: 26,
    effects: [{ type: 'damage', scale: 'atk+mag', power: 2.6, target: 'single', undeadBonus: 1.0, lifestealPct: 30 }],
  },
  grandHeal: {
    id: 'grandHeal', name: '대치유', mp: 32,
    effects: [{ type: 'heal', target: 'party', pctMaxHp: 55 }],
    defaultCondition: { type: 'allyHpBelow', pct: 55 },
  },
  // ───── 5차 ─────
  titanWall: {
    id: 'titanWall', name: '거신의 성벽', mp: 34,
    effects: [{ type: 'taunt', turns: 2 }, { type: 'buff', target: 'party', mods: [pct('dmgTaken', -45), pct('def', 20)], turns: 2 }],
    defaultCondition: { type: 'notActive' },
  },
  carnage: {
    id: 'carnage', name: '학살의 춤', mp: 0,
    effects: [{ type: 'damage', scale: 'atk', power: 3.4, target: 'all', hpCostPct: 10, lifestealPct: 25 }],
  },
  starfall: {
    id: 'starfall', name: '별의 낙하', mp: 46,
    effects: [{ type: 'damage', scale: 'mag', power: 4.0, target: 'all', status: { type: 'burn', turns: 3, chance: 60 } }],
  },
  armyOfDead: {
    id: 'armyOfDead', name: '망자의 군세', mp: 40,
    effects: [{ type: 'damage', scale: 'mag', power: 2.2, target: 'all' }, { type: 'buff', target: 'self', mods: [], turns: 3, flag: 'skeletons' }],
  },
  divineArrow: {
    id: 'divineArrow', name: '신살의 화살', mp: 34,
    effects: [{ type: 'damage', scale: 'atk', power: 5.5, target: 'single', guaranteedCrit: true }],
  },
  dragonBreath: {
    id: 'dragonBreath', name: '용의 숨결', mp: 38,
    effects: [{ type: 'damage', scale: 'atk+mag', power: 2.0, target: 'all', status: { type: 'burn', turns: 3, chance: 70 } }],
  },
  judgmentDay: {
    id: 'judgmentDay', name: '심판의 날', mp: 42,
    effects: [{ type: 'damage', scale: 'atk+mag', power: 2.4, target: 'all', undeadBonus: 1.0 }, { type: 'heal', target: 'party', pctMaxHp: 20 }],
  },
  heavensGrace: {
    id: 'heavensGrace', name: '천상의 은총', mp: 44,
    effects: [{ type: 'heal', target: 'party', pctMaxHp: 60 }, { type: 'buff', target: 'party', mods: [pct('dmgTaken', -30)], turns: 2 }],
    defaultCondition: { type: 'allyHpBelow', pct: 50 },
  },


  // ───── 몬스터 ─────
  m_poisonBite: { id: 'm_poisonBite', name: '독 물기', mp: 0, effects: [{ type: 'damage', scale: 'atk', power: 1.0, target: 'single', status: { type: 'poison', turns: 3, chance: 50 } }] },
  m_shieldBash: { id: 'm_shieldBash', name: '방패 치기', mp: 0, effects: [{ type: 'damage', scale: 'atk', power: 1.2, target: 'single', status: { type: 'stun', turns: 1, chance: 20 } }] },
  m_summonSkeleton: {
    id: 'm_summonSkeleton', name: '해골 소환', mp: 0,
    effects: [{ type: 'summon', monsterId: 'skeleton', count: 2 }],
    defaultCondition: { type: 'enemyCount', min: 99 }, // 적(=플레이어 파티) 기준이 아니라 엔진에서 특수 처리
  },
  m_graveCurse: {
    id: 'm_graveCurse', name: '묘지의 저주', mp: 0,
    effects: [
      { type: 'damage', scale: 'mag', power: 0.7, target: 'all' },
      { type: 'debuff', target: 'all', mods: [pct('atk', -15)], turns: 2 },
    ],
  },
  m_heal: { id: 'm_heal', name: '어둠의 기도', mp: 0, effects: [{ type: 'heal', target: 'lowestAlly', pctMaxHp: 20 }], defaultCondition: { type: 'allyHpBelow', pct: 50 } },
  m_backstab: { id: 'm_backstab', name: '암습', mp: 0, effects: [{ type: 'damage', scale: 'atk', power: 1.6, target: 'single', critBonus: 25 }] },
  m_warCry: {
    id: 'm_warCry', name: '전투 함성', mp: 0,
    effects: [{ type: 'buff', target: 'party', mods: [pct('atk', 20)], turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },
  m_darkNova: {
    id: 'm_darkNova', name: '암흑 파동', mp: 0,
    effects: [{ type: 'damage', scale: 'mag', power: 1.0, target: 'all', status: { type: 'burn', turns: 2, chance: 40 } }],
  },
  m_judgmentOfVoid: { id: 'm_judgmentOfVoid', name: '공허의 심판', mp: 0, effects: [{ type: 'damage', scale: 'mag', power: 2.0, target: 'single' }] },
  // 11~50층
  m_bomb: { id: 'm_bomb', name: '폭약 투척', mp: 0, effects: [{ type: 'damage', scale: 'atk', power: 0.8, target: 'all', status: { type: 'burn', turns: 2, chance: 40 } }] },
  m_slam: { id: 'm_slam', name: '내려찍기', mp: 0, effects: [{ type: 'damage', scale: 'atk', power: 1.6, target: 'single', status: { type: 'stun', turns: 1, chance: 30 } }] },
  m_poisonCloud: { id: 'm_poisonCloud', name: '독안개', mp: 0, effects: [{ type: 'damage', scale: 'mag', power: 0.6, target: 'all', status: { type: 'poison', turns: 3, chance: 60 } }] },
  m_witchCurse: {
    id: 'm_witchCurse', name: '마녀의 저주', mp: 0,
    effects: [{ type: 'debuff', target: 'all', mods: [pct('atk', -20), pct('mag', -20)], turns: 2 }],
    defaultCondition: { type: 'notActive' },
  },
  m_freeze: { id: 'm_freeze', name: '빙결', mp: 0, effects: [{ type: 'damage', scale: 'mag', power: 0.7, target: 'all', status: { type: 'stun', turns: 1, chance: 25 } }] },
  m_frostStrike: { id: 'm_frostStrike', name: '서리 강타', mp: 0, effects: [{ type: 'damage', scale: 'atk', power: 1.4, target: 'single', status: { type: 'stun', turns: 1, chance: 35 } }] },
  m_lavaBurst: { id: 'm_lavaBurst', name: '용암 분출', mp: 0, effects: [{ type: 'damage', scale: 'mag', power: 1.1, target: 'all', status: { type: 'burn', turns: 3, chance: 50 } }] },
  m_web: { id: 'm_web', name: '거미줄', mp: 0, effects: [{ type: 'debuff', target: 'single', mods: [], turns: 1, status: { type: 'stun', turns: 1, chance: 60 } }] },
  m_shadowVeil: {
    id: 'm_shadowVeil', name: '그림자 장막', mp: 0,
    effects: [{ type: 'buff', target: 'party', mods: [{ key: 'evade', kind: 'flat', value: 15 }], turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },
  m_tidal: { id: 'm_tidal', name: '해일', mp: 0, effects: [{ type: 'damage', scale: 'mag', power: 1.3, target: 'all' }] },
  m_ironWall: {
    id: 'm_ironWall', name: '철벽 진형', mp: 0,
    effects: [{ type: 'buff', target: 'party', mods: [pct('def', 30), pct('res', 30)], turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },
  m_critStrike: { id: 'm_critStrike', name: '파멸의 일격', mp: 0, effects: [{ type: 'damage', scale: 'atk', power: 2.2, target: 'single', critBonus: 30 }] },
  m_critAura: {
    id: 'm_critAura', name: '살의의 오라', mp: 0,
    effects: [{ type: 'buff', target: 'party', mods: [{ key: 'crit', kind: 'flat', value: 20 }], turns: 3 }],
    defaultCondition: { type: 'notActive' },
  },
  m_chaosCurse: {
    id: 'm_chaosCurse', name: '혼돈의 저주', mp: 0,
    effects: [{ type: 'damage', scale: 'mag', power: 0.9, target: 'all' }, { type: 'debuff', target: 'all', mods: [pct('def', -25), pct('res', -25)], turns: 2 }],
  },
  m_summonGolem: { id: 'm_summonGolem', name: '골렘 소환', mp: 0, effects: [{ type: 'summon', monsterId: 'caveGolem', count: 1 }] },
  m_summonVine: { id: 'm_summonVine', name: '덩굴 소환', mp: 0, effects: [{ type: 'summon', monsterId: 'rotVine', count: 2 }] },
  m_summonSpider: { id: 'm_summonSpider', name: '새끼 부화', mp: 0, effects: [{ type: 'summon', monsterId: 'venomSpider', count: 2 }] },
  m_summonPriest: { id: 'm_summonPriest', name: '심해의 부름', mp: 0, effects: [{ type: 'summon', monsterId: 'abyssShaman', count: 1 }] },
  m_summonShade: { id: 'm_summonShade', name: '그림자 분열', mp: 0, effects: [{ type: 'summon', monsterId: 'shadowClone', count: 2 }] },
  // 51~70층 마왕성
  m_cleave: { id: 'm_cleave', name: '참격', mp: 0, effects: [{ type: 'damage', scale: 'atk', power: 1.1, target: 'front' }] },
  m_snipe: { id: 'm_snipe', name: '저격', mp: 0, effects: [{ type: 'damage', scale: 'atk', power: 1.0, target: 'back', critBonus: 15 }] },
  m_drain: { id: 'm_drain', name: '흡혈', mp: 0, effects: [{ type: 'damage', scale: 'atk', power: 1.3, target: 'single', lifestealPct: 60 }] },
  m_bloodRain: { id: 'm_bloodRain', name: '피의 비', mp: 0, effects: [{ type: 'damage', scale: 'mag', power: 0.9, target: 'all', lifestealPct: 20 }] },
  m_arcaneStorm: { id: 'm_arcaneStorm', name: '금지된 주문', mp: 0, effects: [{ type: 'damage', scale: 'mag', power: 1.4, target: 'all' }] },
  m_nightmare: { id: 'm_nightmare', name: '악몽', mp: 0, effects: [{ type: 'damage', scale: 'mag', power: 0.8, target: 'all', status: { type: 'stun', turns: 1, chance: 20 } }] },
  m_doomRain: { id: 'm_doomRain', name: '파멸의 비', mp: 0, effects: [{ type: 'damage', scale: 'mag', power: 1.5, target: 'back', status: { type: 'burn', turns: 2, chance: 50 } }] },
  m_summonBats: { id: 'm_summonBats', name: '박쥐 떼', mp: 0, effects: [{ type: 'summon', monsterId: 'vampireBat', count: 2 }] },
  m_summonTentacle: { id: 'm_summonTentacle', name: '촉수 재생', mp: 0, effects: [{ type: 'summon', monsterId: 'tentacle', count: 1 }] },
  m_hellfire: { id: 'm_hellfire', name: '지옥불', mp: 0, effects: [{ type: 'damage', scale: 'mag', power: 1.2, target: 'all', status: { type: 'burn', turns: 3, chance: 70 } }] },
  m_fallenLight: { id: 'm_fallenLight', name: '타락한 빛', mp: 0, effects: [{ type: 'heal', target: 'lowestAlly', pctMaxHp: 6 }, { type: 'damage', scale: 'mag', power: 1.0, target: 'all' }] },
  m_summonGuard: { id: 'm_summonGuard', name: '근위병 호출', mp: 0, effects: [{ type: 'summon', monsterId: 'doomGuard', count: 1 }] },
};

// ───────── 스킬 설명 (툴팁용, 효과 정의에서 자동 생성) ─────────
const STAT_KO: Record<string, string> = { hp: 'HP', mp: 'MP', atk: '공격력', mag: '마력', def: '방어력', res: '마법저항', agi: '민첩', crit: '치명타율', dmgTaken: '받는 피해' };
const SCALE_KO = { atk: '공격력', mag: '마력', 'atk+mag': '공격력+마력' } as const;
const STATUS_KO = { poison: '독', burn: '화상', stun: '기절', silence: '침묵' } as const;
const pctText = (v: number) => `${Math.round(v * 100)}%`;

export function describeSkill(sk: SkillDef): string {
  const parts = sk.effects.map((e) => {
    switch (e.type) {
      case 'damage': {
        let t = `${({ all: '적 전체', single: '적 하나', front: '전열 전체', back: '후열 전체' } as Record<string, string>)[e.target]}에게 ${SCALE_KO[e.scale]} ${pctText(e.power)}${e.hits ? ` × ${e.hits}회` : ''} 피해`;
        if (e.critBonus) t += `, 치명타율 +${e.critBonus}%p`;
        if (e.guaranteedCrit) t += ', 치명타 확정';
        if (e.undeadBonus) t += `, 언데드·마족에게 ${pctText(1 + e.undeadBonus)} 위력`;
        if (e.hpCostPct) t += ` (자신 HP ${e.hpCostPct}% 소모)`;
        if (e.lifestealPct) t += `, 준 피해의 ${e.lifestealPct}% 회복`;
        if (e.status) t += `, ${e.status.chance}% 확률로 ${STATUS_KO[e.status.type]} ${e.status.turns}턴`;
        if (e.interrupt) t += ` · 레이드 보스 시전 끊기 ${e.interrupt}`;
        return t;
      }
      case 'heal': return `${e.target === 'party' ? '아군 전체' : 'HP가 가장 낮은 아군'} 최대 HP ${e.pctMaxHp}% 회복`;
      case 'shield': return `${e.turns}턴간 ${e.target === 'party' ? '아군 전체' : 'HP가 가장 낮은 아군'}에게 최대 HP ${e.pctMaxHp}%만큼 피해를 막는 보호막 (회복량 보너스 적용)`;
      case 'buff': {
        const who = e.target === 'party' ? '아군 전체' : '자신';
        if (e.flag === 'manaShield') return `${e.turns}턴간 받는 피해를 MP로 대신 받음`;
        if (e.flag === 'extraHit') return `${e.turns}턴간 늑대가 매 턴 추가 공격 (공격력 60%)`;
        if (e.flag === 'skeletons') return `${e.turns}턴간 해골 2구가 매 턴 추가 공격 (마력 50%씩)`;
        return `${e.turns}턴간 ${who} ${e.mods.map((m) => `${STAT_KO[m.key] ?? m.key} ${m.value > 0 ? '+' : ''}${m.value}%`).join(', ')}`;
      }
      case 'debuff': {
        const who = e.target === 'all' ? '적 전체' : '적 하나';
        const mods = e.mods.map((m) => `${STAT_KO[m.key] ?? m.key} ${m.value}%`).join(', ');
        const st = e.status ? `${e.status.chance}% 확률로 ${STATUS_KO[e.status.type]} ${e.status.turns}턴` : '';
        return `${who}${mods ? ` ${e.turns}턴간 ${mods}` : ''}${mods && st ? ', ' : ' '}${st}${e.interrupt ? ` · 레이드 보스 시전 끊기 ${e.interrupt}` : ''}`.trim();
      }
      case 'taunt': return `${e.turns}턴간 적의 공격을 자신에게 끌어옴`;
      case 'summon': return `소환`;
    }
  });
  return `${parts.join(' / ')} · MP ${sk.mp}`;
}
