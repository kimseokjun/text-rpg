import type { Passive, SkillSlot, Stats } from '../core/types';

export interface MonsterDef {
  id: string;
  name: string;
  /** 층 권장 레벨 기준치 대비 배율 (1.0 = 같은 레벨 일반 전사 수준) */
  stats: Stats;
  attackScale: 'atk' | 'mag';
  skills: SkillSlot[];
  skillChance: number;   // 매 턴 스킬 시도 확률 %
  evade?: number;
  tags: ('undead' | 'demon' | 'elite' | 'boss' | 'raid')[];
  passives?: Passive[];
  exp: number;
  gold: number;
  /** 보스 페이즈 2 (HP 50% 이하) */
  phase2?: { atkMagPct: number; text: string };
  /** 처치 시 스토리 */
  story?: string;
}

const s = (hp: number, atk: number, mag: number, def: number, res: number, agi: number, crit = 5, mp = 0): Stats =>
  ({ hp, mp, atk, mag, def, res, agi, crit });

export const MONSTERS: Record<string, MonsterDef> = {
  // ───── 구역 1: 버려진 지하묘지 ─────
  rat: { id: 'rat', name: '굶주린 쥐', stats: s(0.35, 0.6, 0, 0.4, 0.4, 1.0, 3), attackScale: 'atk', skills: [], skillChance: 0, tags: [], exp: 5, gold: 4 },
  skeleton: { id: 'skeleton', name: '해골 병사', stats: s(0.6, 0.75, 0, 1.0, 0.4, 0.7), attackScale: 'atk', skills: [], skillChance: 0, tags: ['undead'], exp: 9, gold: 7 },
  bat: { id: 'bat', name: '묘지 박쥐', stats: s(0.4, 0.65, 0, 0.4, 0.5, 1.6), attackScale: 'atk', skills: [], skillChance: 0, evade: 15, tags: [], exp: 7, gold: 5 },
  ghoul: {
    id: 'ghoul', name: '구울', stats: s(0.7, 0.8, 0, 0.6, 0.6, 0.8), attackScale: 'atk',
    skills: [{ skillId: 'm_poisonBite' }], skillChance: 35, tags: ['undead'], exp: 11, gold: 8,
  },
  skeletonKnight: {
    id: 'skeletonKnight', name: '해골 기사', stats: s(2.2, 1.0, 0, 1.4, 0.7, 0.7), attackScale: 'atk',
    skills: [{ skillId: 'm_shieldBash' }], skillChance: 35, tags: ['undead', 'elite'], exp: 40, gold: 35,
  },
  morten: {
    id: 'morten', name: '묘지기 모르텐', stats: s(7, 0.9, 1.15, 1.1, 1.1, 1.0, 8), attackScale: 'mag',
    skills: [{ skillId: 'm_summonSkeleton' }, { skillId: 'm_graveCurse' }], skillChance: 40,
    tags: ['undead', 'boss'], exp: 400, gold: 500,
    story: '모르텐이 쓰러지며 중얼거린다. "봉인은... 내가 푼 게 아니다... 아래에서... 누군가가..."',
  },

  // ───── 구역 2: 봉인의 신전 ─────
  monk: {
    id: 'monk', name: '타락한 수도승', stats: s(0.7, 0.6, 0.9, 0.6, 1.0, 0.9), attackScale: 'mag',
    skills: [{ skillId: 'm_heal', condition: { type: 'allyHpBelow', pct: 50 } }], skillChance: 60, tags: [], exp: 14, gold: 11,
  },
  statue: { id: 'statue', name: '석상 수호자', stats: s(1.0, 0.85, 0, 2.2, 0.5, 0.4), attackScale: 'atk', skills: [], skillChance: 0, tags: [], exp: 16, gold: 12 },
  assassin: {
    id: 'assassin', name: '그림자 암살자', stats: s(0.6, 1.05, 0, 0.5, 0.5, 1.6, 15), attackScale: 'atk',
    skills: [{ skillId: 'm_backstab' }], skillChance: 40, evade: 10, tags: [], exp: 15, gold: 12,
  },
  spirit: { id: 'spirit', name: '마력 정령', stats: s(0.7, 0.2, 1.0, 0.6, 2.2, 1.1), attackScale: 'mag', skills: [], skillChance: 0, tags: [], exp: 15, gold: 12 },
  templeGuard: {
    id: 'templeGuard', name: '신전 수호병', stats: s(2.6, 1.1, 0, 1.3, 1.3, 0.9), attackScale: 'atk',
    skills: [{ skillId: 'm_warCry', condition: { type: 'notActive' } }], skillChance: 50, tags: ['elite'], exp: 70, gold: 60,
  },
  velas: {
    id: 'velas', name: '타락한 대신관 벨라스', stats: s(12, 1.0, 1.3, 1.2, 1.2, 1.2, 10), attackScale: 'mag',
    skills: [{ skillId: 'm_darkNova' }, { skillId: 'm_judgmentOfVoid' }], skillChance: 55,
    tags: ['boss'], exp: 2500, gold: 3000,
    phase2: { atkMagPct: 40, text: '벨라스의 눈이 붉게 타오른다. "봉인 따위, 처음부터 필요 없었다!"' },
    story: '벨라스가 무너지며 신전 깊은 곳의 봉인석에 금이 간다. 그 너머, 더 깊은 곳으로 이어지는 낡은 광산 갱도가 드러난다.',
  },
  // ───── 11~15 잊힌 광산 ─────
  kobold: { id: 'kobold', name: '코볼트 광부', stats: s(0.4, 0.65, 0, 0.5, 0.4, 1.0), attackScale: 'atk', skills: [], skillChance: 0, tags: [], exp: 7, gold: 6 },
  caveGolem: { id: 'caveGolem', name: '동굴 골렘', stats: s(1.0, 0.8, 0, 2.2, 0.6, 0.4), attackScale: 'atk', skills: [], skillChance: 0, tags: [], exp: 14, gold: 11 },
  bomberKobold: { id: 'bomberKobold', name: '폭약 코볼트', stats: s(0.5, 0.7, 0, 0.5, 0.5, 1.0), attackScale: 'atk', skills: [{ skillId: 'm_bomb' }], skillChance: 45, tags: [], exp: 11, gold: 9 },
  crystalBat: { id: 'crystalBat', name: '수정 박쥐', stats: s(0.45, 0.7, 0, 0.5, 0.8, 1.6), attackScale: 'atk', skills: [], skillChance: 0, evade: 18, tags: [], exp: 10, gold: 8 },
  ironGolem: { id: 'ironGolem', name: '철갑 골렘', stats: s(2.4, 1.0, 0, 1.8, 0.8, 0.5), attackScale: 'atk', skills: [{ skillId: 'm_slam' }], skillChance: 35, tags: ['elite'], passives: ['reflect30'], exp: 45, gold: 40 },
  mineKing: {
    id: 'mineKing', name: '광산왕의 망령', stats: s(10, 1.1, 0.9, 1.4, 1.0, 0.9, 8), attackScale: 'atk',
    skills: [{ skillId: 'm_summonGolem' }, { skillId: 'm_slam' }], skillChance: 45, tags: ['undead', 'boss'], exp: 500, gold: 600,
    story: '망령이 흩어지며 남긴 말. "더 깊이... 늪 아래로 흐르는 검은 물이... 봉인을 녹이고 있다."',
  },
  // ───── 16~20 독안개 늪 ─────
  swampToad: { id: 'swampToad', name: '늪 두꺼비', stats: s(0.7, 0.75, 0, 0.6, 0.6, 0.8), attackScale: 'atk', skills: [{ skillId: 'm_poisonBite' }], skillChance: 45, tags: [], exp: 11, gold: 9 },
  rotVine: { id: 'rotVine', name: '썩은 덩굴', stats: s(0.6, 0.5, 0.8, 0.6, 0.8, 0.6), attackScale: 'mag', skills: [{ skillId: 'm_heal', condition: { type: 'allyHpBelow', pct: 50 } }], skillChance: 60, tags: [], exp: 11, gold: 9 },
  mosquito: { id: 'mosquito', name: '독침 모기떼', stats: s(0.4, 0.6, 0, 0.3, 0.4, 1.6), attackScale: 'atk', skills: [{ skillId: 'm_poisonBite' }], skillChance: 40, evade: 18, tags: [], exp: 10, gold: 8 },
  lizardman: { id: 'lizardman', name: '늪지 리자드맨', stats: s(0.8, 1.05, 0, 0.8, 0.5, 1.0), attackScale: 'atk', skills: [], skillChance: 0, tags: [], exp: 13, gold: 10 },
  lizardShaman: { id: 'lizardShaman', name: '리자드맨 주술사', stats: s(2.0, 0.6, 1.0, 1.0, 1.2, 0.9), attackScale: 'mag', skills: [{ skillId: 'm_heal', condition: { type: 'allyHpBelow', pct: 55 } }, { skillId: 'm_poisonCloud' }], skillChance: 55, tags: ['elite'], exp: 50, gold: 45 },
  swampWitch: {
    id: 'swampWitch', name: '늪의 마녀', stats: s(10, 0.6, 1.2, 1.0, 1.3, 1.1, 8), attackScale: 'mag',
    skills: [{ skillId: 'm_summonVine' }, { skillId: 'm_witchCurse' }, { skillId: 'm_poisonCloud' }], skillChance: 60, tags: ['boss'], exp: 600, gold: 700,
    story: '마녀가 웃으며 가라앉는다. "봉인? 이미 반쯤 열렸단다. 얼음 아래 잠든 거인이 먼저 깨어날 걸?"',
  },
  // ───── 21~25 얼음 심연 ─────
  frostWolf: { id: 'frostWolf', name: '서리 늑대', stats: s(0.6, 0.9, 0, 0.6, 0.6, 1.8), attackScale: 'atk', skills: [], skillChance: 0, tags: [], exp: 12, gold: 10 },
  iceSpirit: { id: 'iceSpirit', name: '얼음 정령', stats: s(0.7, 0.2, 1.0, 0.6, 2.2, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_freeze' }], skillChance: 35, tags: [], exp: 14, gold: 11 },
  yeti: { id: 'yeti', name: '설인', stats: s(1.6, 0.9, 0, 0.8, 0.8, 0.7), attackScale: 'atk', skills: [], skillChance: 0, tags: [], exp: 15, gold: 12 },
  iceArcher: { id: 'iceArcher', name: '빙결 궁수', stats: s(0.55, 1.05, 0, 0.5, 0.6, 1.3, 18), attackScale: 'atk', skills: [], skillChance: 0, tags: [], exp: 13, gold: 10 },
  frostKnight: { id: 'frostKnight', name: '서리 기사', stats: s(2.4, 1.0, 0, 1.5, 1.0, 0.8), attackScale: 'atk', skills: [{ skillId: 'm_frostStrike' }], skillChance: 40, tags: ['elite'], exp: 55, gold: 50 },
  frostGiant: {
    id: 'frostGiant', name: '서리 거인', stats: s(14, 1.1, 0.9, 1.2, 1.2, 0.8, 6), attackScale: 'atk',
    skills: [{ skillId: 'm_freeze' }, { skillId: 'm_frostStrike' }], skillChance: 50, tags: ['boss'], exp: 700, gold: 800,
    phase2: { atkMagPct: 30, text: '거인이 포효하자 동굴 전체가 얼어붙는다.' },
    story: '거인이 무너지며 얼음벽이 갈라진다. 그 너머에서 붉은 열기가 새어 나온다.',
  },
  // ───── 26~30 용암 대공동 ─────
  salamander: { id: 'salamander', name: '화염 도롱뇽', stats: s(0.7, 0.85, 0.6, 0.6, 0.8, 1.0), attackScale: 'atk', skills: [{ skillId: 'm_bomb' }], skillChance: 30, tags: [], exp: 13, gold: 11 },
  lavaGolem: { id: 'lavaGolem', name: '용암 골렘', stats: s(1.1, 0.85, 0, 2.0, 1.0, 0.4), attackScale: 'atk', skills: [], skillChance: 0, tags: [], passives: ['reflect30'], exp: 16, gold: 13 },
  imp: { id: 'imp', name: '불꽃 임프', stats: s(0.5, 0.3, 1.0, 0.5, 0.8, 1.2), attackScale: 'mag', skills: [{ skillId: 'm_lavaBurst' }], skillChance: 35, tags: ['demon'], exp: 13, gold: 11 },
  volcBat: { id: 'volcBat', name: '화산 박쥐', stats: s(0.5, 0.8, 0, 0.5, 0.8, 1.7), attackScale: 'atk', skills: [], skillChance: 0, evade: 18, tags: [], exp: 12, gold: 10 },
  ifrit: { id: 'ifrit', name: '이프리트', stats: s(2.4, 0.6, 1.2, 1.0, 1.3, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_lavaBurst' }], skillChance: 50, tags: ['elite', 'demon'], exp: 60, gold: 55 },
  flameLord: {
    id: 'flameLord', name: '화염 군주', stats: s(14, 0.8, 1.3, 1.2, 1.3, 1.1, 8), attackScale: 'mag',
    skills: [{ skillId: 'm_lavaBurst' }, { skillId: 'm_judgmentOfVoid' }], skillChance: 55, tags: ['boss', 'demon'], exp: 800, gold: 900,
    phase2: { atkMagPct: 40, text: '화염 군주의 갑옷이 녹아내리며 진짜 불꽃이 드러난다!' },
    story: '"여왕께서... 둥지에서 기다리신다..." 불꽃이 꺼지며 거미줄 가득한 통로가 열린다.',
  },
  // ───── 31~35 거미 여왕의 둥지 ─────
  venomSpider: { id: 'venomSpider', name: '독거미', stats: s(0.5, 0.8, 0, 0.5, 0.5, 1.2), attackScale: 'atk', skills: [{ skillId: 'm_poisonBite' }], skillChance: 50, tags: [], exp: 11, gold: 9 },
  webSpider: { id: 'webSpider', name: '그물 거미', stats: s(0.6, 0.7, 0, 0.6, 0.6, 1.1), attackScale: 'atk', skills: [{ skillId: 'm_web' }], skillChance: 40, tags: [], exp: 13, gold: 11 },
  eggCluster: { id: 'eggCluster', name: '거미 알 무리', stats: s(0.9, 0.1, 0, 0.8, 0.8, 0.2), attackScale: 'atk', skills: [{ skillId: 'm_summonSpider' }], skillChance: 70, tags: [], exp: 10, gold: 8 },
  spiderRider: { id: 'spiderRider', name: '암흑 거미 기수', stats: s(0.7, 1.1, 0, 0.6, 0.6, 1.3, 18), attackScale: 'atk', skills: [{ skillId: 'm_backstab' }], skillChance: 35, tags: [], exp: 14, gold: 12 },
  spiderPriest: { id: 'spiderPriest', name: '거미 사제', stats: s(2.2, 0.6, 1.0, 1.0, 1.2, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_heal', condition: { type: 'allyHpBelow', pct: 55 } }, { skillId: 'm_shadowVeil' }], skillChance: 55, tags: ['elite'], exp: 60, gold: 55 },
  spiderQueen: {
    id: 'spiderQueen', name: '거미 여왕', stats: s(13, 1.1, 1.0, 1.1, 1.1, 1.3, 10), attackScale: 'atk',
    skills: [{ skillId: 'm_summonSpider' }, { skillId: 'm_poisonCloud' }, { skillId: 'm_web' }], skillChance: 55, evade: 12, tags: ['boss'], exp: 900, gold: 1000,
    story: '여왕의 둥지 아래, 물에 잠긴 옛 도시의 첨탑이 보인다. 봉인을 만든 자들의 도시다.',
  },
  // ───── 36~40 수몰된 고대 도시 ─────
  drownedSoldier: { id: 'drownedSoldier', name: '익사한 병사', stats: s(0.8, 0.9, 0, 0.9, 0.5, 0.8), attackScale: 'atk', skills: [], skillChance: 0, tags: ['undead'], exp: 13, gold: 11 },
  abyssShaman: { id: 'abyssShaman', name: '심해 주술사', stats: s(0.65, 0.5, 0.9, 0.6, 1.1, 0.9), attackScale: 'mag', skills: [{ skillId: 'm_heal', condition: { type: 'allyHpBelow', pct: 50 } }], skillChance: 60, tags: [], exp: 14, gold: 12 },
  coralGolem: { id: 'coralGolem', name: '산호 골렘', stats: s(1.1, 0.85, 0, 1.8, 1.8, 0.4), attackScale: 'atk', skills: [], skillChance: 0, tags: [], exp: 16, gold: 13 },
  siren: { id: 'siren', name: '세이렌', stats: s(0.6, 0.4, 0.9, 0.6, 1.0, 1.2), attackScale: 'mag', skills: [{ skillId: 'm_web' }, { skillId: 'm_warCry', condition: { type: 'notActive' } }], skillChance: 45, tags: [], exp: 14, gold: 12 },
  seaKnight: { id: 'seaKnight', name: '해저 기사단장', stats: s(2.6, 1.1, 0, 1.4, 1.2, 0.9), attackScale: 'atk', skills: [{ skillId: 'm_warCry', condition: { type: 'notActive' } }, { skillId: 'm_ironWall' }], skillChance: 50, tags: ['elite'], exp: 65, gold: 60 },
  abyssWarden: {
    id: 'abyssWarden', name: '심해의 수호자', stats: s(15, 0.9, 1.3, 1.3, 1.3, 1.0, 8), attackScale: 'mag',
    skills: [{ skillId: 'm_tidal' }, { skillId: 'm_summonPriest' }], skillChance: 55, tags: ['boss'], exp: 1000, gold: 1100,
    phase2: { atkMagPct: 35, text: '수호자가 도시의 마지막 결계를 스스로 부순다. "함께 가라앉아라!"' },
    story: '수호자는 원래 봉인을 지키던 자였다. "균열이... 마족이 넘어오고 있다. 늦기 전에..."',
  },
  // ───── 41~45 혼돈의 균열 ─────
  lesserDemon: { id: 'lesserDemon', name: '하급 악마', stats: s(0.7, 1.05, 0, 0.7, 0.7, 1.1, 20), attackScale: 'atk', skills: [], skillChance: 0, tags: ['demon'], exp: 14, gold: 12 },
  hellhound: { id: 'hellhound', name: '지옥견', stats: s(0.65, 0.9, 0.5, 0.6, 0.6, 1.8), attackScale: 'atk', skills: [{ skillId: 'm_bomb' }], skillChance: 30, tags: ['demon'], exp: 14, gold: 12 },
  voidMage: { id: 'voidMage', name: '공허 마법사', stats: s(0.55, 0.2, 1.2, 0.5, 1.0, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_judgmentOfVoid' }], skillChance: 35, tags: ['demon'], exp: 15, gold: 13 },
  fallenKnight: { id: 'fallenKnight', name: '타락 기사', stats: s(1.0, 0.9, 0, 1.6, 1.0, 0.7), attackScale: 'atk', skills: [], skillChance: 0, tags: ['demon'], passives: ['reflect30'], exp: 16, gold: 13 },
  demonOfficer: { id: 'demonOfficer', name: '마족 장교', stats: s(2.6, 1.1, 0, 1.2, 1.2, 1.0, 15), attackScale: 'atk', skills: [{ skillId: 'm_critAura' }, { skillId: 'm_critStrike' }], skillChance: 50, tags: ['elite', 'demon'], exp: 70, gold: 65 },
  demonGeneral: {
    id: 'demonGeneral', name: '마장군', stats: s(15, 1.3, 0.8, 1.3, 1.2, 1.1, 15), attackScale: 'atk',
    skills: [{ skillId: 'm_critStrike' }, { skillId: 'm_critAura' }, { skillId: 'm_chaosCurse' }], skillChance: 55, tags: ['boss', 'demon'], exp: 1200, gold: 1300,
    phase2: { atkMagPct: 40, text: '마장군이 검을 땅에 꽂는다. "봉인된 분께서 곧 깨어나신다!"' },
    story: '균열 끝, 봉인의 핵이 맥동한다. 그 안의 무언가가 처음으로 너의 이름을 부른다.',
  },
  // ───── 46~50 봉인의 핵 ─────
  sealWarden: { id: 'sealWarden', name: '봉인 파수꾼', stats: s(1.1, 0.9, 0.6, 1.8, 1.8, 0.6), attackScale: 'atk', skills: [{ skillId: 'm_ironWall' }], skillChance: 30, tags: [], exp: 17, gold: 14 },
  chaosEcho: { id: 'chaosEcho', name: '혼돈의 메아리', stats: s(0.8, 0.9, 0.9, 0.8, 0.8, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_lavaBurst' }, { skillId: 'm_freeze' }, { skillId: 'm_poisonCloud' }, { skillId: 'm_graveCurse' }], skillChance: 45, tags: ['demon'], exp: 16, gold: 14 },
  coreSpirit: { id: 'coreSpirit', name: '핵 정령', stats: s(0.7, 0.2, 1.1, 0.6, 1.4, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_tidal' }], skillChance: 35, tags: [], exp: 16, gold: 13 },
  shadowClone: { id: 'shadowClone', name: '그림자 분신', stats: s(0.6, 1.05, 0, 0.5, 0.5, 1.6, 20), attackScale: 'atk', skills: [], skillChance: 0, evade: 15, tags: ['demon'], exp: 15, gold: 12 },
  sealProxy: { id: 'sealProxy', name: '봉인의 대리인', stats: s(2.8, 0.8, 1.1, 1.3, 1.3, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_heal', condition: { type: 'allyHpBelow', pct: 55 } }, { skillId: 'm_summonShade' }], skillChance: 55, tags: ['elite', 'demon'], exp: 80, gold: 75 },
  sealedOne: {
    id: 'sealedOne', name: '봉인된 자', stats: s(18, 1.2, 1.4, 1.4, 1.4, 1.2, 12), attackScale: 'mag',
    skills: [{ skillId: 'm_summonShade' }, { skillId: 'm_chaosCurse' }, { skillId: 'm_darkNova' }, { skillId: 'm_judgmentOfVoid' }], skillChance: 60, tags: ['boss', 'demon'], exp: 2000, gold: 3000,
    phase2: { atkMagPct: 50, text: '봉인이 완전히 깨진다. "천 년을 기다렸다. 너희가 내 마지막 열쇠였구나!"' },
    story: '봉인된 자가 빛 속으로 흩어진다. 그가 남긴 말이 귀에 맴돈다. "봉인은... 하나가 아니다. 진짜 주인은 성에서 기다리고 있다." 핵 너머로 검은 성벽이 솟아오른다.',
  },

  // ═════ 2부: 마왕성 ═════
  // ───── 51~55 잿빛 성벽 ─────
  gargoyle: { id: 'gargoyle', name: '가고일', stats: s(1.0, 0.95, 0, 2.2, 0.7, 0.9), attackScale: 'atk', skills: [], skillChance: 0, tags: ['demon'], exp: 18, gold: 15 },
  castleArcher: { id: 'castleArcher', name: '성벽 궁수', stats: s(0.6, 1.1, 0, 0.6, 0.6, 1.3, 20), attackScale: 'atk', skills: [{ skillId: 'm_snipe' }], skillChance: 40, tags: ['demon'], exp: 17, gold: 14 },
  hellKnight: { id: 'hellKnight', name: '지옥 기사', stats: s(1.1, 1.0, 0, 1.4, 0.9, 0.8), attackScale: 'atk', skills: [{ skillId: 'm_cleave' }], skillChance: 35, tags: ['demon'], exp: 19, gold: 16 },
  castleWarlock: { id: 'castleWarlock', name: '마성 술사', stats: s(0.65, 0.2, 1.1, 0.6, 1.7, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_darkNova' }], skillChance: 35, tags: ['demon'], exp: 18, gold: 15 },
  siegeGolem: { id: 'siegeGolem', name: '공성 골렘', stats: s(2.8, 1.1, 0, 2.0, 1.0, 0.5), attackScale: 'atk', skills: [{ skillId: 'm_cleave' }], skillChance: 40, tags: ['elite'], passives: ['reflect30'], exp: 90, gold: 80 },
  wardStone: { id: 'wardStone', name: '결계석', stats: s(3.6, 0.3, 0.7, 1.5, 1.5, 0.3), attackScale: 'mag', skills: [], skillChance: 0, tags: [], exp: 30, gold: 25 },
  granit: {
    id: 'granit', name: '성문지기 그라니트', stats: s(12, 1.2, 0.6, 1.6, 1.3, 0.8, 8), attackScale: 'atk',
    skills: [{ skillId: 'm_cleave' }, { skillId: 'm_slam' }], skillChance: 50, tags: ['boss', 'demon'], passives: ['bulwark'], exp: 2600, gold: 3200,
    phase2: { atkMagPct: 35, text: '그라니트가 성문을 등지고 버틴다. "이 문은 결코 열리지 않는다!"' },
    story: '거대한 성문이 무너진다. 그 너머로 핏빛 카펫이 깔린 긴 회랑이 끝없이 이어진다.',
  },
  // ───── 56~60 피의 회랑 ─────
  vampireBat: { id: 'vampireBat', name: '흡혈 박쥐', stats: s(0.5, 0.95, 0, 0.5, 0.7, 1.8), attackScale: 'atk', skills: [{ skillId: 'm_drain' }], skillChance: 35, evade: 20, tags: [], exp: 16, gold: 13 },
  bloodKnight: { id: 'bloodKnight', name: '혈기사', stats: s(1.1, 1.0, 0, 1.2, 0.9, 0.9), attackScale: 'atk', skills: [{ skillId: 'm_drain' }], skillChance: 30, tags: ['undead'], passives: ['rampage'], exp: 20, gold: 17 },
  thrallGhoul: { id: 'thrallGhoul', name: '노예 구울', stats: s(0.9, 0.9, 0, 0.8, 0.6, 0.9), attackScale: 'atk', skills: [{ skillId: 'm_poisonBite' }], skillChance: 50, tags: ['undead'], exp: 17, gold: 14 },
  bloodMage: { id: 'bloodMage', name: '혈마법사', stats: s(0.65, 0.2, 1.1, 0.6, 1.1, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_bloodRain' }], skillChance: 40, tags: [], exp: 18, gold: 15 },
  crimsonGuard: { id: 'crimsonGuard', name: '진홍 근위대', stats: s(2.6, 1.2, 0, 1.3, 1.1, 1.0, 12), attackScale: 'atk', skills: [{ skillId: 'm_drain' }, { skillId: 'm_warCry', condition: { type: 'notActive' } }], skillChance: 50, tags: ['elite', 'undead'], passives: ['rampage'], exp: 95, gold: 85 },
  carmilla: {
    id: 'carmilla', name: '피의 백작 카르밀라', stats: s(15, 1.25, 1.1, 1.2, 1.2, 1.3, 12), attackScale: 'atk',
    skills: [{ skillId: 'm_summonBats' }, { skillId: 'm_bloodRain' }, { skillId: 'm_drain' }], skillChance: 55, tags: ['boss', 'undead'], passives: ['rampage'], exp: 3000, gold: 3600,
    story: '카르밀라가 재가 되어 흩어진다. "주인님의 서고에는... 너희가 감당 못 할 주문이..." 회랑 끝, 거대한 서고의 문이 열린다.',
  },
  // ───── 61~65 금서의 서고 ─────
  grimoire: { id: 'grimoire', name: '살아있는 마도서', stats: s(0.7, 0.2, 1.2, 0.7, 2.4, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_judgmentOfVoid' }], skillChance: 35, tags: [], exp: 19, gold: 16 },
  inkGolem: { id: 'inkGolem', name: '잉크 골렘', stats: s(1.3, 0.2, 0.95, 0.6, 2.0, 0.5), attackScale: 'mag', skills: [{ skillId: 'm_poisonCloud' }], skillChance: 30, tags: [], exp: 20, gold: 17 },
  librarianGhost: { id: 'librarianGhost', name: '사서의 망령', stats: s(0.8, 0.2, 1.0, 0.7, 1.5, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_witchCurse' }], skillChance: 40, tags: ['undead'], exp: 18, gold: 15 },
  runeSentinel: { id: 'runeSentinel', name: '룬 파수병', stats: s(1.2, 1.0, 0, 1.9, 1.9, 0.6), attackScale: 'atk', skills: [{ skillId: 'm_cleave' }], skillChance: 30, tags: [], exp: 20, gold: 17 },
  archLibrarian: { id: 'archLibrarian', name: '대사서', stats: s(2.6, 0.4, 1.3, 1.0, 2.2, 1.0), attackScale: 'mag', skills: [{ skillId: 'm_heal', condition: { type: 'allyHpBelow', pct: 55 } }, { skillId: 'm_chaosCurse' }], skillChance: 55, tags: ['elite'], exp: 100, gold: 90 },
  cultist: { id: 'cultist', name: '광신도', stats: s(3.0, 0.3, 0.8, 1.0, 1.4, 0.8), attackScale: 'mag', skills: [], skillChance: 0, tags: [], passives: ['mender'], exp: 30, gold: 25 },
  morgath: {
    id: 'morgath', name: '금서의 주인 모르가스', stats: s(13, 0.4, 1.5, 0.9, 2.6, 1.1, 10), attackScale: 'mag',
    skills: [{ skillId: 'm_arcaneStorm' }, { skillId: 'm_judgmentOfVoid' }, { skillId: 'm_witchCurse' }], skillChance: 60, tags: ['boss'], exp: 3400, gold: 4000,
    phase2: { atkMagPct: 40, text: '모르가스가 금서를 펼친다. 글자들이 불꽃이 되어 쏟아진다!' },
    story: '"주인님께서... 옥좌에서 기다리신다..." 불타는 서고의 천장이 무너지며 옥좌로 향하는 계단이 드러난다.',
  },
  // ───── 66~70 마왕의 옥좌 ─────
  archDemon: { id: 'archDemon', name: '상급 악마', stats: s(0.9, 1.15, 0, 0.9, 0.9, 1.2, 22), attackScale: 'atk', skills: [{ skillId: 'm_critStrike' }], skillChance: 30, tags: ['demon'], exp: 21, gold: 18 },
  nightmare: { id: 'nightmare', name: '악몽', stats: s(0.7, 0.2, 1.1, 0.7, 1.3, 1.1), attackScale: 'mag', skills: [{ skillId: 'm_nightmare' }], skillChance: 35, tags: ['demon'], exp: 20, gold: 17 },
  doomGuard: { id: 'doomGuard', name: '파멸 근위병', stats: s(2.4, 1.05, 0, 1.8, 1.3, 0.7), attackScale: 'atk', skills: [{ skillId: 'm_cleave' }], skillChance: 40, tags: ['demon'], exp: 22, gold: 19 },
  succubus: { id: 'succubus', name: '서큐버스', stats: s(0.7, 0.3, 1.05, 0.7, 1.2, 1.3), attackScale: 'mag', skills: [{ skillId: 'm_witchCurse' }, { skillId: 'm_drain' }], skillChance: 40, evade: 10, tags: ['demon'], exp: 20, gold: 17 },
  demonDuke: { id: 'demonDuke', name: '마계 공작', stats: s(3.0, 1.2, 1.2, 1.4, 1.4, 1.1, 15), attackScale: 'mag', skills: [{ skillId: 'm_critStrike' }, { skillId: 'm_chaosCurse' }, { skillId: 'm_doomRain' }], skillChance: 55, tags: ['elite', 'demon'], exp: 120, gold: 110 },
  azazel: {
    id: 'azazel', name: '마왕 아자젤', stats: s(18, 1.35, 1.35, 1.5, 1.5, 1.2, 15), attackScale: 'mag',
    skills: [{ skillId: 'm_summonGuard' }, { skillId: 'm_cleave' }, { skillId: 'm_doomRain' }, { skillId: 'm_chaosCurse' }], skillChance: 60, tags: ['boss', 'demon'], passives: ['bulwark', 'rampage'], exp: 6000, gold: 8000,
    phase2: { atkMagPct: 50, text: '아자젤이 옥좌에서 일어선다. "천 년의 봉인을 깬 자들이여, 내 손으로 직접 끝내주마!"' },
    story: '아자젤이 무릎을 꿇으며 웃는다. "나는… 문지기였을 뿐이다." 옥좌 뒤의 벽이 갈라지고, 그 너머에서 진짜 마왕의 심장 소리가 울린다. — 마왕방이 열렸다.',
  },
  // ═════ 레이드: 군단장 벨리알 (주마다 형태가 바뀜) ═════
  treasureGoblin: { id: 'treasureGoblin', name: '보물 고블린', stats: s(1.0, 0.3, 0, 0.6, 0.6, 1.5), attackScale: 'atk', skills: [], skillChance: 0, evade: 12, tags: ['elite'], passives: ['flee'], exp: 60, gold: 60 },
  // ── 마왕방 (71~80층) ──
  voidWraith: { id: 'voidWraith', name: '공허의 망령', stats: s(0.8, 0.2, 1.2, 0.7, 1.5, 1.2), attackScale: 'mag', skills: [{ skillId: 'm_nightmare' }, { skillId: 'm_drain' }], skillChance: 40, evade: 10, tags: ['demon', 'undead'], exp: 26, gold: 22 },
  abyssKnight: { id: 'abyssKnight', name: '심연 기사', stats: s(2.6, 1.15, 0, 2.0, 1.4, 0.7), attackScale: 'atk', skills: [{ skillId: 'm_cleave' }], skillChance: 40, tags: ['demon'], exp: 27, gold: 23 },
  soulReaper: { id: 'soulReaper', name: '영혼 수확자', stats: s(0.9, 1.3, 0, 0.8, 0.9, 1.4, 25), attackScale: 'atk', skills: [{ skillId: 'm_critStrike' }], skillChance: 35, tags: ['demon'], exp: 26, gold: 22 },
  chaosHound: { id: 'chaosHound', name: '혼돈의 사냥개', stats: s(1.0, 1.1, 0.4, 0.9, 0.9, 1.6, 12), attackScale: 'atk', skills: [{ skillId: 'm_drain' }], skillChance: 30, tags: ['demon'], exp: 25, gold: 21 },
  voidArchon: { id: 'voidArchon', name: '공허의 집정관', stats: s(3.4, 1.2, 1.3, 1.5, 1.6, 1.1, 15), attackScale: 'mag', skills: [{ skillId: 'm_arcaneStorm' }, { skillId: 'm_chaosCurse' }], skillChance: 55, tags: ['elite', 'demon'], exp: 140, gold: 130 },
  shadowKing: {
    id: 'shadowKing', name: '그림자 군주 네르갈', stats: s(20, 1.4, 1.4, 1.6, 1.6, 1.2, 15), attackScale: 'mag',
    skills: [{ skillId: 'm_nightmare' }, { skillId: 'm_judgmentOfVoid' }, { skillId: 'm_doomRain' }], skillChance: 65, tags: ['boss', 'demon'], passives: ['rampage'], exp: 7000, gold: 9000,
    phase2: { atkMagPct: 45, text: '네르갈의 그림자가 둘로 갈라진다. "주인님께 가는 길은 내 시체 위에 있다."' },
    story: '그림자 군주가 흩어지며 마지막 문이 열린다. 공기가 무겁다. 심장 소리가 점점 가까워진다.',
  },
  fallenSeraph: { id: 'fallenSeraph', name: '타락 치천사', stats: s(1.0, 0.4, 1.3, 0.9, 1.6, 1.2, 10), attackScale: 'mag', skills: [{ skillId: 'm_hellfire' }], skillChance: 35, tags: ['demon'], exp: 29, gold: 25 },
  hellTitan: { id: 'hellTitan', name: '지옥 거인', stats: s(3.0, 1.25, 0, 1.9, 1.2, 0.6), attackScale: 'atk', skills: [{ skillId: 'm_cleave' }], skillChance: 40, tags: ['demon'], exp: 30, gold: 26 },
  mindFlayer: { id: 'mindFlayer', name: '정신 포식자', stats: s(0.9, 0.2, 1.25, 0.8, 1.4, 1.1), attackScale: 'mag', skills: [{ skillId: 'm_witchCurse' }, { skillId: 'm_nightmare' }], skillChance: 40, tags: ['demon'], exp: 28, gold: 24 },
  doomBringer: { id: 'doomBringer', name: '파멸의 전령', stats: s(1.1, 1.3, 0.6, 1.0, 1.0, 1.3, 20), attackScale: 'atk', skills: [{ skillId: 'm_critStrike' }], skillChance: 35, tags: ['demon'], exp: 29, gold: 25 },
  kingGuard: { id: 'kingGuard', name: '마왕 친위대장', stats: s(3.8, 1.3, 1.0, 1.7, 1.5, 1.0, 15), attackScale: 'atk', skills: [{ skillId: 'm_critStrike' }, { skillId: 'm_cleave' }], skillChance: 55, tags: ['elite', 'demon'], exp: 160, gold: 150 },
  lucifel: {
    id: 'lucifel', name: '마왕 루시펠', stats: s(26, 1.45, 1.45, 1.7, 1.7, 1.25, 18), attackScale: 'mag',
    skills: [{ skillId: 'm_judgmentOfVoid' }, { skillId: 'm_hellfire' }, { skillId: 'm_summonGuard' }, { skillId: 'm_chaosCurse' }], skillChance: 65, tags: ['boss', 'demon'], passives: ['bulwark', 'rampage'], exp: 9000, gold: 12000,
    phase2: { atkMagPct: 55, text: '루시펠의 여섯 날개가 펼쳐진다. "천 년을 기다렸다. 나를 깨운 대가를 치러라."' },
    story: '마왕 루시펠이 쓰러지며 심장의 박동이 멈춘다. 마왕성 전체가 빛에 잠기고, 천 년의 어둠이 걷힌다. 용병단의 이름은 이제 신화가 되었다. (완)',
  },
  abyssKing: {
    id: 'abyssKing', name: '심연의 왕 아바돈', stats: s(30, 1.2, 1.35, 1.6, 1.6, 0.9, 12), attackScale: 'mag',
    skills: [{ skillId: 'm_judgmentOfVoid' }, { skillId: 'm_hellfire' }, { skillId: 'm_cleave' }], skillChance: 70, tags: ['boss', 'demon', 'raid'], passives: ['rampage'], exp: 0, gold: 0,
    phase2: { atkMagPct: 35, text: '심연이 갈라지며 아바돈의 진짜 모습이 드러난다. "버러지들이 감히… 무릎 꿇어라."' },
  },
  belialFire: {
    id: 'belialFire', name: '군단장 벨리알 · 화염', stats: s(30, 1.2, 1.3, 1.3, 1.6, 1.0, 12), attackScale: 'mag',
    skills: [{ skillId: 'm_hellfire' }, { skillId: 'm_doomRain' }, { skillId: 'm_cleave' }], skillChance: 65, tags: ['boss', 'demon', 'raid'], passives: ['rampage'], exp: 0, gold: 0,
    phase2: { atkMagPct: 40, text: '벨리알의 몸이 불길에 휩싸인다. "타올라라, 남김없이!"' },
  },
  belialAbyss: {
    id: 'belialAbyss', name: '군단장 벨리알 · 심연', stats: s(30, 1.3, 1.1, 1.5, 1.3, 0.9, 10), attackScale: 'atk',
    skills: [{ skillId: 'm_summonTentacle' }, { skillId: 'm_tidal' }, { skillId: 'm_cleave' }], skillChance: 60, tags: ['boss', 'demon', 'raid'], passives: ['bulwark'], exp: 0, gold: 0,
    phase2: { atkMagPct: 40, text: '심연이 벨리알을 집어삼킨다. 촉수들이 미친 듯이 꿈틀거린다!' },
  },
  belialFallen: {
    id: 'belialFallen', name: '군단장 벨리알 · 타락', stats: s(30, 0.4, 1.4, 1.0, 2.5, 1.1, 10), attackScale: 'mag',
    skills: [{ skillId: 'm_fallenLight' }, { skillId: 'm_arcaneStorm' }, { skillId: 'm_judgmentOfVoid' }], skillChance: 65, tags: ['boss', 'demon', 'raid'], exp: 0, gold: 0,
    phase2: { atkMagPct: 45, text: '검은 날개가 펼쳐진다. "신의 빛은 이제 나의 것이다."' },
  },
  tentacle: { id: 'tentacle', name: '심연의 촉수', stats: s(0.9, 0.8, 0, 0.8, 0.8, 0.6), attackScale: 'atk', skills: [], skillChance: 0, tags: ['raid'], exp: 0, gold: 0 },
  // ═════ 일일 던전 ═════
  goldGolem: { id: 'goldGolem', name: '황금 골렘', stats: s(1.4, 0.9, 0, 2.3, 0.7, 0.6), attackScale: 'atk', skills: [{ skillId: 'm_slam' }], skillChance: 25, tags: [], exp: 0, gold: 0 },
  mimic: { id: 'mimic', name: '보물 미믹', stats: s(0.9, 1.2, 0, 1.4, 0.9, 1.1, 20), attackScale: 'atk', skills: [{ skillId: 'm_critStrike' }], skillChance: 30, tags: [], exp: 0, gold: 0 },
  vaultKeeper: { id: 'vaultKeeper', name: '금고지기', stats: s(2.8, 1.1, 0, 2.4, 1.0, 0.7), attackScale: 'atk', skills: [{ skillId: 'm_slam' }], skillChance: 40, tags: ['elite'], passives: ['reflect30'], exp: 0, gold: 0 },
  crystalSpirit: { id: 'crystalSpirit', name: '수정 정령', stats: s(0.8, 0.2, 1.1, 0.7, 2.5, 1.1), attackScale: 'mag', skills: [{ skillId: 'm_freeze' }], skillChance: 30, tags: [], exp: 0, gold: 0 },
  shardGolem: { id: 'shardGolem', name: '광맥 골렘', stats: s(1.3, 0.9, 0, 1.0, 2.0, 0.6), attackScale: 'atk', skills: [{ skillId: 'm_slam' }], skillChance: 25, tags: [], exp: 0, gold: 0 },
  crystalHeart: { id: 'crystalHeart', name: '수정 심장', stats: s(2.6, 0.3, 1.2, 0.9, 2.6, 0.8), attackScale: 'mag', skills: [{ skillId: 'm_darkNova' }], skillChance: 45, tags: ['elite'], exp: 0, gold: 0 },
  rockGiant: { id: 'rockGiant', name: '바위 거인', stats: s(1.5, 1.0, 0, 2.4, 0.8, 0.5), attackScale: 'atk', skills: [{ skillId: 'm_slam' }], skillChance: 30, tags: [], exp: 0, gold: 0 },
  stoneBeetle: { id: 'stoneBeetle', name: '돌갑충', stats: s(0.8, 0.9, 0, 2.0, 1.0, 1.0), attackScale: 'atk', skills: [], skillChance: 0, tags: [], exp: 0, gold: 0 },
  quarryLord: { id: 'quarryLord', name: '채석장 감독관', stats: s(2.8, 1.1, 0, 2.2, 1.2, 0.8), attackScale: 'atk', skills: [{ skillId: 'm_slam' }, { skillId: 'm_warCry', condition: { type: 'notActive' } }], skillChance: 45, tags: ['elite'], exp: 0, gold: 0 },
  trainingDummy: { id: 'trainingDummy', name: '수련 허수아비', stats: s(1.8, 0.4, 0, 1.0, 1.0, 0.3), attackScale: 'atk', skills: [], skillChance: 0, tags: [], exp: 0, gold: 0 },
  swordInstructor: { id: 'swordInstructor', name: '검술 교관', stats: s(0.9, 1.15, 0, 1.0, 0.9, 1.3, 15), attackScale: 'atk', skills: [{ skillId: 'm_critStrike' }], skillChance: 30, tags: [], exp: 0, gold: 0 },
  grandMaster: { id: 'grandMaster', name: '무도 사범', stats: s(2.6, 1.25, 0.8, 1.2, 1.2, 1.4, 18), attackScale: 'atk', skills: [{ skillId: 'm_critStrike' }, { skillId: 'm_cleave' }], skillChance: 50, tags: ['elite'], exp: 0, gold: 0 },

};


export interface ZoneDef {
  id: string;
  name: string;
  floors: [number, number];
  pool: { id: string; weight: number }[];
  elite: string;
  boss: { floor: number; id: string; adds: string[] };
  /** 층별 공략 팁 (구역 첫 층부터 5개) */
  tips: string[];
}

export const ZONES: ZoneDef[] = [
  {
    id: 'catacomb', name: '버려진 지하묘지', floors: [1, 5],
    pool: [{ id: 'rat', weight: 30 }, { id: 'skeleton', weight: 30 }, { id: 'bat', weight: 20 }, { id: 'ghoul', weight: 20 }],
    elite: 'skeletonKnight',
    boss: { floor: 5, id: 'morten', adds: ['skeleton', 'skeleton'] },
    tips: [
      '쥐와 해골이 나와요. 전사 혼자서도 충분하니 편하게 시작하세요.',
      '해골 병사는 방어가 높고 마법에 약해요. 마법사가 있으면 빨라요.',
      '묘지 박쥐는 회피가 높아요. 치명타 높은 궁수가 확실하게 잡아요.',
      '구울의 독이 쌓이니 성직자를 데려가면 안정적이에요.',
      '모르텐은 해골을 계속 불러요. 언데드에 강한 성직자·광역기를 챙기고 보스 우선으로 빨리 끝내세요.',
    ],
  },
  {
    id: 'temple', name: '봉인의 신전', floors: [6, 10],
    pool: [{ id: 'monk', weight: 25 }, { id: 'statue', weight: 25 }, { id: 'assassin', weight: 25 }, { id: 'spirit', weight: 25 }],
    elite: 'templeGuard',
    boss: { floor: 10, id: 'velas', adds: ['monk', 'statue'] },
    tips: [
      '타락한 수도승이 동료를 치유해요. 잡몹 우선이나 자동으로 수도승부터 끊으세요.',
      '석상 수호자는 방어가 매우 높아요. 물리보다 마법 딜러가 효율적이에요.',
      '그림자 암살자가 약한 아군을 노려요. 체력 낮은 마법사는 후열에 두세요.',
      '마력 정령은 마법 저항이 높아요. 전사·궁수 같은 물리 딜러가 좋아요.',
      '벨라스는 마법 공격이 강하고 체력 50% 이하에서 광폭해져요. 성직자 필수, 마법 저항을 챙기세요.',
    ],
  },
  {
    id: 'mine', name: '잊힌 광산', floors: [11, 15],
    pool: [{ id: 'kobold', weight: 30 }, { id: 'caveGolem', weight: 25 }, { id: 'bomberKobold', weight: 25 }, { id: 'crystalBat', weight: 20 }],
    elite: 'ironGolem', boss: { floor: 15, id: 'mineKing', adds: ['kobold', 'bomberKobold'] },
    tips: [
      '코볼트 무리가 많이 나와요. 휩쓸기·썬더 같은 광역기가 빛나는 층이에요.',
      '동굴 골렘은 방어가 높아요. 마법사로 녹이세요.',
      '폭약 코볼트의 화상이 파티 전체에 들어와요. 회복 담당을 챙기세요.',
      '철갑 골렘 엘리트는 받은 피해 30%를 반사해요. 체력 약한 딜러는 조심하세요.',
      '광산왕은 골렘을 소환해요. 보스 우선으로 딜을 몰아 빨리 잡는 게 유리해요.',
    ],
  },
  {
    id: 'swamp', name: '독안개 늪', floors: [16, 20],
    pool: [{ id: 'swampToad', weight: 25 }, { id: 'rotVine', weight: 20 }, { id: 'mosquito', weight: 25 }, { id: 'lizardman', weight: 30 }],
    elite: 'lizardShaman', boss: { floor: 20, id: 'swampWitch', adds: ['lizardman', 'rotVine'] },
    tips: [
      '독이 계속 쌓이는 구역이에요. 성직자 없이 들어가면 버티기 힘들어요.',
      '썩은 덩굴이 동료를 치유해요. 잡몹 우선으로 덩굴부터 끊으세요.',
      '독침 모기떼는 회피가 높아요. 치명타 높은 궁수가 유리해요.',
      '리자드맨은 공격력이 높아요. 튼튼한 전사를 전열에 세워 후열을 지키세요.',
      '늪의 마녀는 덩굴로 회복하고 공격력을 깎아요. 보스 우선 딜러 + 광역기로 덩굴까지 함께 정리하세요.',
    ],
  },
  {
    id: 'frost', name: '얼음 심연', floors: [21, 25],
    pool: [{ id: 'frostWolf', weight: 30 }, { id: 'iceSpirit', weight: 25 }, { id: 'yeti', weight: 20 }, { id: 'iceArcher', weight: 25 }],
    elite: 'frostKnight', boss: { floor: 25, id: 'frostGiant', adds: ['frostWolf', 'frostWolf'] },
    tips: [
      '서리 늑대는 빨라서 먼저 때려요. 강철 물약이 도움이 돼요.',
      '얼음 정령은 마법 저항이 높고 기절을 걸어요. 물리 딜러 위주로 가세요.',
      '설인은 체력이 높아요. 딜이 부족하면 힘의 물약을 쓰세요.',
      '빙결 궁수의 치명타가 아파요. 체력 낮은 아군은 후열에 두세요.',
      '서리 거인의 기절과 강타가 무서워요. 탱커 전열 + 회복 필수, 체력 50% 이하에서 더 세져요.',
    ],
  },
  {
    id: 'lava', name: '용암 대공동', floors: [26, 30],
    pool: [{ id: 'salamander', weight: 30 }, { id: 'lavaGolem', weight: 20 }, { id: 'imp', weight: 30 }, { id: 'volcBat', weight: 20 }],
    elite: 'ifrit', boss: { floor: 30, id: 'flameLord', adds: ['imp', 'lavaGolem'] },
    tips: [
      '화상 피해가 계속 들어와요. 회복 담당과 생명의 물약을 챙기세요.',
      '용암 골렘은 피해를 반사해요. 마법으로 잡거나 체력 높은 딜러를 쓰세요.',
      '불꽃 임프는 마족이라 성기사 계열의 신성 공격이 잘 들어요.',
      '화산 박쥐는 회피가 높아요. 치명타 위주 궁수가 깔끔해요.',
      '화염 군주는 마족이고 마법 화력이 강해요. 마법 저항과 신성 딜러가 유리해요.',
    ],
  },
  {
    id: 'nest', name: '거미 여왕의 둥지', floors: [31, 35],
    pool: [{ id: 'venomSpider', weight: 30 }, { id: 'webSpider', weight: 25 }, { id: 'eggCluster', weight: 15 }, { id: 'spiderRider', weight: 30 }],
    elite: 'spiderPriest', boss: { floor: 35, id: 'spiderQueen', adds: ['webSpider', 'spiderRider'] },
    tips: [
      '독거미 떼가 독을 쌓아요. 회복 담당 필수예요.',
      '그물 거미가 아군을 묶어요. 4인을 꽉 채워 빈틈을 줄이세요.',
      '거미 알 무리를 두면 새끼가 계속 나와요. 잡몹 우선으로 알부터 깨세요.',
      '암흑 거미 기수가 약한 아군을 암습해요. 체력 낮은 후열을 조심하세요.',
      '거미 여왕은 새끼를 계속 부화시켜요. 광역 딜러와 보스 우선 딜러를 섞으면 좋아요.',
    ],
  },
  {
    id: 'sunken', name: '수몰된 고대 도시', floors: [36, 40],
    pool: [{ id: 'drownedSoldier', weight: 30 }, { id: 'abyssShaman', weight: 20 }, { id: 'coralGolem', weight: 25 }, { id: 'siren', weight: 25 }],
    elite: 'seaKnight', boss: { floor: 40, id: 'abyssWarden', adds: ['drownedSoldier', 'abyssShaman'] },
    tips: [
      '익사한 병사는 언데드예요. 성직자 계열의 신성 공격이 잘 들어요.',
      '심해 주술사가 동료를 치유해요. 잡몹 우선으로 먼저 끊으세요.',
      '산호 골렘은 방어·마저가 모두 높아요. 강화 많이 된 주력 딜러가 필요해요.',
      '세이렌이 기절을 걸고 동료를 강화해요. 빨리 잡는 게 답이에요.',
      '심해의 수호자는 해일로 파티 전체를 쳐요. 회복이 핵심이고, 소환된 주술사는 잡몹 우선 딜러가 정리하세요.',
    ],
  },
  {
    id: 'rift', name: '혼돈의 균열', floors: [41, 45],
    pool: [{ id: 'lesserDemon', weight: 30 }, { id: 'hellhound', weight: 25 }, { id: 'voidMage', weight: 25 }, { id: 'fallenKnight', weight: 20 }],
    elite: 'demonOfficer', boss: { floor: 45, id: 'demonGeneral', adds: ['fallenKnight', 'voidMage'] },
    tips: [
      '하급 악마의 치명타가 아파요. 강철 물약과 탱커가 필요해요.',
      '지옥견은 빠르고 폭약을 던져요. 광역 회복을 챙기세요.',
      '공허 마법사의 단일 마법이 세요. 체력 낮은 마법사는 후열로.',
      '타락 기사는 피해를 반사해요. 마법 딜러로 잡는 게 안전해요.',
      '마장군은 물리 치명타 특화예요. 강철 물약·탱커 전열·피해 감소가 핵심이에요.',
    ],
  },
  {
    id: 'core', name: '봉인의 핵', floors: [46, 50],
    pool: [{ id: 'sealWarden', weight: 25 }, { id: 'chaosEcho', weight: 25 }, { id: 'coreSpirit', weight: 25 }, { id: 'shadowClone', weight: 25 }],
    elite: 'sealProxy', boss: { floor: 50, id: 'sealedOne', adds: ['sealWarden', 'chaosEcho'] },
    tips: [
      '봉인 파수꾼은 방어·마저가 모두 높아요. 강화된 주력 딜러로 뚫으세요.',
      '혼돈의 메아리가 온갖 상태이상을 걸어요. 회복 담당 필수예요.',
      '핵 정령의 해일이 아파요. 받는 마법 피해 감소를 챙기세요.',
      '그림자 분신은 회피가 높아요. 치명타 위주 궁수가 좋아요.',
      '봉인된 자는 분신을 부르고 저주를 퍼부어요. 물약 3종을 챙기고, 체력 50% 이하에서 크게 강해져요.',
    ],
  },
  // ═════ 2부: 마왕성 ═════
  {
    id: 'wall', name: '마왕성 · 잿빛 성벽', floors: [51, 55],
    pool: [{ id: 'gargoyle', weight: 25 }, { id: 'castleArcher', weight: 25 }, { id: 'hellKnight', weight: 25 }, { id: 'castleWarlock', weight: 25 }],
    elite: 'siegeGolem', boss: { floor: 55, id: 'granit', adds: ['wardStone', 'wardStone'] },
    tips: [
      '가고일은 방어가 매우 높아요. 마법 딜러가 핵심이에요.',
      '성벽 궁수가 후열 전체를 저격해요. 후열에 약한 캐릭터만 몰아두지 마세요.',
      '지옥 기사의 참격이 전열 전체를 쳐요. 전열엔 튼튼한 캐릭터만 세우세요.',
      '마성 술사는 마법 저항이 높아요. 물리 딜러를 섞어 가세요.',
      '그라니트는 결계석이 살아있는 동안 받는 피해 -70%! 딜러를 잡몹 우선으로 바꿔 결계석부터 깨세요.',
    ],
  },
  {
    id: 'blood', name: '마왕성 · 피의 회랑', floors: [56, 60],
    pool: [{ id: 'vampireBat', weight: 25 }, { id: 'bloodKnight', weight: 25 }, { id: 'thrallGhoul', weight: 25 }, { id: 'bloodMage', weight: 25 }],
    elite: 'crimsonGuard', boss: { floor: 60, id: 'carmilla', adds: ['vampireBat', 'vampireBat'] },
    tips: [
      '흡혈 박쥐는 회피가 높고 피를 빨아 회복해요. 치명타 궁수가 좋아요.',
      '혈기사는 라운드마다 강해져요. 오래 끌지 말고 화력을 몰아주세요.',
      '노예 구울의 독이 쌓여요. 회복 담당과 엘레노어의 정화가 빛나요.',
      '혈마법사의 광역 흡혈이 강해요. 받는 마법 피해 감소를 챙기세요.',
      '카르밀라는 라운드마다 12%씩 강해지고 박쥐를 불러요. 딜러 전원 보스 우선으로 최대한 빨리 잡으세요. 힘의 물약 추천.',
    ],
  },
  {
    id: 'library', name: '마왕성 · 금서의 서고', floors: [61, 65],
    pool: [{ id: 'grimoire', weight: 25 }, { id: 'inkGolem', weight: 25 }, { id: 'librarianGhost', weight: 25 }, { id: 'runeSentinel', weight: 25 }],
    elite: 'archLibrarian', boss: { floor: 65, id: 'morgath', adds: ['cultist', 'cultist'] },
    tips: [
      '살아있는 마도서는 마법 저항이 매우 높아요. 물리 딜러로 가세요.',
      '잉크 골렘은 마법으로 때려요. 받는 마법 피해 감소 옵션과 바르가스가 좋아요.',
      '사서의 망령이 공격력을 깎아요. 언데드라 신성 공격이 잘 들어요.',
      '룬 파수병은 방어·마저가 모두 높아요. 관통 옵션이나 강화된 딜러가 필요해요.',
      '모르가스는 마법 특화 보스! 광신도가 매 라운드 보스를 치유하니 잡몹 우선으로 먼저 끊고, 바르가스·아스트리드가 빛나요.',
    ],
  },
  {
    id: 'throne', name: '마왕성 · 마왕의 옥좌', floors: [66, 70],
    pool: [{ id: 'archDemon', weight: 25 }, { id: 'nightmare', weight: 25 }, { id: 'doomGuard', weight: 25 }, { id: 'succubus', weight: 25 }],
    elite: 'demonDuke', boss: { floor: 70, id: 'azazel', adds: ['doomGuard', 'doomGuard'] },
    tips: [
      '상급 악마의 치명타가 강해요. 강철 물약과 피해 감소 버프를 챙기세요.',
      '악몽이 파티 전체를 기절시켜요. 4인을 꽉 채워 가세요.',
      '파멸 근위병의 참격이 전열을 쓸어요. 전열은 탱커만 세우세요.',
      '마계 공작은 후열에 파멸의 비를 내려요. 보스 우선 딜러가 엘리트를 먼저 노려요.',
      '마왕 아자젤: 근위병이 살아있으면 피해 -70%, 동시에 라운드마다 강해져요. 잡몹 우선 딜러와 보스 우선 딜러를 나눠 세우고 물약 3종을 모두 쓰세요.',
    ],
  },
  {
    id: 'chamberGate', name: '마왕방 · 심연의 문', floors: [71, 75],
    pool: [{ id: 'voidWraith', weight: 25 }, { id: 'abyssKnight', weight: 25 }, { id: 'soulReaper', weight: 25 }, { id: 'chaosHound', weight: 25 }],
    elite: 'voidArchon', boss: { floor: 75, id: 'shadowKing', adds: ['voidWraith', 'voidWraith'] },
    tips: [
      '공허의 망령은 기절을 걸고 피를 빨아요. 회복 담당이 둘이면 편해요.',
      '심연 기사는 단단해요. 방어 무시 옵션이나 강화된 딜러로 뚫으세요.',
      '영혼 수확자의 치명타가 아파요. 받는 피해 감소와 강철 물약을 챙기세요.',
      '집정관이 금지된 주문으로 전체를 때려요. 마저와 마법 피해 감소가 중요해요.',
      '그림자 군주 네르갈: 라운드마다 강해지고 기절을 걸어요. 신화·세트 장비로 단단하게, 최대한 빨리 잡으세요.',
    ],
  },
  {
    id: 'chamberHeart', name: '마왕방 · 마왕의 심장', floors: [76, 80],
    pool: [{ id: 'fallenSeraph', weight: 25 }, { id: 'hellTitan', weight: 25 }, { id: 'mindFlayer', weight: 25 }, { id: 'doomBringer', weight: 25 }],
    elite: 'kingGuard', boss: { floor: 80, id: 'lucifel', adds: ['doomGuard', 'doomGuard'] },
    tips: [
      '타락 치천사의 지옥불이 파티 전체를 태워요. 정화(엘레노어)가 있으면 좋아요.',
      '지옥 거인은 전열을 쓸어버려요. 전열엔 가장 단단한 탱커만.',
      '정신 포식자의 저주가 공격력을 깎아요. 빨리 끊어야 해요.',
      '친위대장의 치명타 일격을 조심하세요. HP가 낮은 후열이 먼저 노려져요.',
      '마왕 루시펠: 근위병이 있으면 피해 -70%, 라운드마다 강해지고 50%에서 광폭. 잡몹 우선 딜러로 근위병을 끊고 물약 3종을 모두 쓰세요. 최종 보스예요.',
    ],
  },
];

export const MAX_FLOOR = 80;
/** 1부 마지막 층 */
export const PART1_FLOOR = 50;
/** 층별 권장 레벨: 1~10층은 손으로, 11층부터 층당 +1.3 (50층 ≈ Lv.78), 51층부터 +1.1 (70층 = Lv.100) */
const FLOOR_LEVEL_10 = [1, 3, 5, 7, 10, 13, 16, 19, 22, 26];
export const floorLevel = (floor: number) => floor <= 10 ? FLOOR_LEVEL_10[Math.max(1, floor) - 1]
  : floor <= 50 ? Math.round(26 + (floor - 10) * 1.3) : Math.round(78 + (floor - 50) * 1.1);
/** 권장 레벨의 기준 스탯 (숙련 등급 B 성향 캐릭터, 장비 없음) */
/** 방어 비율 감소 도입 후 몬스터 피해 보정 (층별, src/cli/comptune.ts) — 기존 난이도 유지용 */
export const DEF_COMP: number[] = [1.3, 1.35, 1.4, 1.45, 1.47, 1.78, 1.72, 1.6, 1.89, 1.88, 2.1, 2.06, 2, 2.18, 2.38, 2.54, 2.16, 2.12, 2.04, 1.77, 2.31, 2.23, 2.04, 2.54, 2.32, 2.53, 2.24, 2.15, 2.44, 2.37, 2.59, 2.17, 2.63, 2.69, 1.96, 2.7, 2.93, 2.82, 3.04, 2.6, 2.69, 2.7, 2.69, 3.1, 4.23, 2.32, 1.9, 2.87, 2.51, 2.4, 3.55, 3.31, 3.31, 3.76, 4.44, 3.91, 4.08, 4.42, 4.29, 3.93, 3.44, 3.49, 3.19, 3.34, 3.19, 4.17, 4.21, 3.74, 3.8, 4.21, 4.3, 4.3, 4.3, 4.3, 4.3, 4.4, 4.4, 4.4, 4.4, 4.4];
export const defComp = (floor: number) => DEF_COMP[floor - 1] ?? 1.6;
export function refStats(level: number): Stats {
  const g = (level - 1) * 1.15;
  return { hp: 90 + 14 * g, mp: 0, atk: 12 + 2.6 * g, mag: 12 + 2.6 * g, def: 7 + 1.6 * g, res: 7 + 1.6 * g, agi: 10 + 0.8 * g, crit: 0 };
}
/** 층별 난이도 배율 (HP, 공격·마력). 4인 파티 + 장비 기준 보정 */
export const DIFFICULTY: { hp: number; dmg: number }[] = [
  { hp: 0.8, dmg: 0.8 }, { hp: 1.0, dmg: 0.95 }, { hp: 1.1, dmg: 1.05 }, { hp: 1.25, dmg: 1.15 }, { hp: 1.5, dmg: 1.3 },
  { hp: 1.7, dmg: 1.45 }, { hp: 2.0, dmg: 1.6 }, { hp: 2.25, dmg: 1.72 }, { hp: 2.5, dmg: 1.85 }, { hp: 2.6, dmg: 1.9 },
];
/** 11층부터: 층당 HP·공격 배율 증가 (시뮬레이션으로 조정) */
export const DIFF_SLOPE = { hp: 0.07, dmg: 0.035 };
/**
 * 층별 추가 배율 m (HP ×m, 공격 ×m^0.6)
 * src/cli/tune.ts로 "표준 파티"(권장 레벨·구간 장비·기대 강화) 기준 1~50층 일반 70%/보스 45%, 마왕성 51~70층 일반 55%/보스 30%가 되게 찾은 값
 */
export const DIFF_TUNE: Record<number, number> = {5: 1.46, 6: 1.92, 7: 1.68, 8: 1.01, 9: 1.81, 10: 0.94, 11: 4.22, 12: 4.0, 13: 2.93, 14: 3.85, 15: 1.94, 16: 3.49, 17: 3.75, 18: 2.81, 19: 2.64, 20: 1.5, 21: 3.34, 22: 3.06, 23: 2.18, 24: 2.69, 25: 1.93, 26: 3.39, 27: 3.06, 28: 2.0, 29: 2.92, 30: 1.36, 31: 3.95, 32: 4.58, 33: 3.25, 34: 3.62, 35: 1.91, 36: 8.25, 37: 7.68, 38: 5.97, 39: 5.97, 40: 1.62, 41: 4.6, 42: 5.07, 43: 2.93, 44: 6.27, 45: 2.34, 46: 7.76, 47: 6.92, 48: 5.15, 49: 4.88, 50: 2.1, 51: 19.17, 52: 21.58, 53: 14.99, 54: 13.5, 55: 7.85, 56: 20.34, 57: 17.53, 58: 11.94, 59: 13.19, 60: 3.38, 61: 17.03, 62: 13.55, 63: 10.11, 64: 10.17, 65: 4.5, 66: 14.1, 67: 14.15, 68: 10.99, 69: 10.77, 70: 2.83, 71: 50.36, 72: 69.69, 73: 56.53, 74: 66.92, 75: 12.08, 76: 91.31, 77: 105.75, 78: 83.01, 79: 91.02, 80: 14.21};
export const difficulty = (floor: number, tune?: number) => {
  const b = floor <= 10
    ? DIFFICULTY[Math.max(1, floor) - 1]
    : { hp: 2.6 + (floor - 10) * DIFF_SLOPE.hp, dmg: 1.9 + (floor - 10) * DIFF_SLOPE.dmg };
  const m = tune ?? DIFF_TUNE[floor] ?? 1;
  // 마왕성(51층~): 한 방이 너무 아프지 않게 체력 쪽으로 배분 (평타 1대 ≈ 최대 HP 20~25%)
  if (floor > PART1_FLOOR) return { hp: b.hp * m, dmg: b.dmg * Math.pow(m, 0.45) };
  return { hp: b.hp * m, dmg: b.dmg * Math.pow(m, 0.6) };
};
/** 보상 스케일: 권장 레벨에 비례 (레벨업 필요 경험치와 비슷하게 증가) */
export const rewardScale = (floor: number) => 1 + Math.pow(floorLevel(floor) - 1, 1.35) * 0.1;
/** @deprecated 예전 이름 */
export const floorScale = rewardScale;
/** 던전 지역: 마왕숲(1~50, 서브) · 마왕성 입구(51~70, 메인) · 마왕방(준비 중). 내부 층 번호는 통산, 화면엔 지역별 1층부터 */
export interface RegionDef { id: string; name: string; floors: [number, number] | null; desc: string; repeat: boolean }
export const REGIONS: RegionDef[] = [
  { id: 'forest', name: '마왕숲', floors: [1, 50], desc: '서브 던전 · 10개 구역 50층 · 한 층 반복 파밍 가능', repeat: true },
  { id: 'castle', name: '마왕성 입구', floors: [51, 70], desc: '메인 던전 · 4개 구역 20층 · 반복 불가, 조합과 물약이 필수', repeat: false },
  { id: 'chamber', name: '마왕방', floors: [71, 80], desc: '최종 던전 · 2개 구역 10층 · 반복 불가, 신화·세트 장비가 필요한 난이도', repeat: false },
];
export const regionOf = (floor: number) => REGIONS.find((r) => r.floors && floor >= r.floors[0] && floor <= r.floors[1]) ?? REGIONS[0];
/** 지역 안에서의 층 번호 */
export const localFloor = (floor: number) => floor - (regionOf(floor).floors?.[0] ?? 1) + 1;
/** "마왕성 입구 5층" */
export const floorName = (floor: number) => `${regionOf(floor).name} ${localFloor(floor)}층`;
export const floorTip = (floor: number) => { const z = zoneOf(floor); return z.tips[floor - z.floors[0]] ?? ''; };
export const zoneOf = (floor: number) => ZONES.find((z) => floor >= z.floors[0] && floor <= z.floors[1])!;
