import type { BaseJob, JobId, Modifier, Passive, StatKey, Stats } from '../core/types';

type Letter = 'S' | 'A' | 'B' | 'C' | 'D';
const L: Record<Letter, number> = { S: 1.5, A: 1.25, B: 1.0, C: 0.8, D: 0.6 };

/** Lv.1 기준값과 레벨당 성장치 (등급 B = 1.0 기준) */
export const BASE_LV1: Stats = { hp: 90, mp: 30, atk: 12, mag: 12, def: 7, res: 7, agi: 10, crit: 5 };
export const GROWTH: Stats = { hp: 14, mp: 4, atk: 2.6, mag: 2.6, def: 1.6, res: 1.6, agi: 0.8, crit: 0.15 };

const KEYS: StatKey[] = ['hp', 'mp', 'atk', 'mag', 'def', 'res', 'agi', 'crit'];
const letters = (s: string): Stats => {
  const arr = s.split(' ') as Letter[];
  return Object.fromEntries(KEYS.map((k, i) => [k, L[arr[i]]])) as Stats;
};

export interface SkillUnlock { level: number; skillId: string }
export interface PassiveUnlock { level: number; name: string; desc: string; mods?: Modifier[]; passive?: Passive }

export interface JobDef {
  id: JobId;
  name: string;
  desc: string;
  /** 2차 직업: 1차 대비 성장 성향 배율 */
  aptMult?: Partial<Stats>;
  base: BaseJob;
  tier: 1 | 2 | 3 | 4 | 5;
  parent?: JobId;
  /** 스탯 성향 배율 */
  aptitude: Stats;
  skills: SkillUnlock[];
  passives: PassiveUnlock[];
}

const pct = (key: any, value: number, extra: Partial<Modifier> = {}): Modifier => ({ key, kind: 'pct', value, ...extra });
const flat = (key: any, value: number, extra: Partial<Modifier> = {}): Modifier => ({ key, kind: 'flat', value, ...extra });

//                    HP MP 공 마 방 저 민 치
const BASE: Record<BaseJob, JobDef> = {
  warrior: {
    desc: '높은 체력과 방어로 앞에서 버티며 강타로 적을 친다. 무난하게 어디서나 쓰이는 기본 전열.',
    id: 'warrior', name: '전사', base: 'warrior', tier: 1,
    aptitude: letters('A C A D A C C B'),
    skills: [{ level: 1, skillId: 'smash' }, { level: 5, skillId: 'sweep' }, { level: 10, skillId: 'ironWall' }],
    passives: [{ level: 15, name: '분노', desc: 'HP 50% 이하일 때 공격력 +20%', mods: [pct('atk', 20, { when: 'selfHpBelow50' })] }],
  },
  mage: {
    desc: '체력은 약하지만 강력한 단일·광역 마법으로 적을 쓸어낸다. 마법 저항이 높은 적에겐 약하다.',
    id: 'mage', name: '마법사', base: 'mage', tier: 1,
    aptitude: letters('C S D S D A B B'),
    skills: [{ level: 1, skillId: 'fireball' }, { level: 5, skillId: 'thunder' }, { level: 10, skillId: 'manaShield' }],
    passives: [{ level: 15, name: '마나 순환', desc: '턴마다 MP 3% 회복', passive: 'manaRegen3' }],
  },
  archer: {
    desc: '빠른 민첩과 높은 치명타로 적을 하나씩 확실히 끊어낸다. 독화살로 지속 피해도 준다.',
    id: 'archer', name: '궁수', base: 'archer', tier: 1,
    aptitude: letters('B C A D C C S A'),
    skills: [{ level: 1, skillId: 'aimedShot' }, { level: 5, skillId: 'rapidFire' }, { level: 10, skillId: 'poisonArrow' }],
    passives: [{ level: 15, name: '날렵함', desc: '회피율 +10%', mods: [flat('evade', 10)] }],
  },
  priest: {
    desc: '회복과 축복으로 파티를 지키는 서포터. 홀리 라이트는 언데드에게 2배 피해.',
    id: 'priest', name: '성직자', base: 'priest', tier: 1,
    aptitude: letters('B A C A B A C D'),
    skills: [{ level: 1, skillId: 'holyLight' }, { level: 5, skillId: 'heal' }, { level: 10, skillId: 'bless' }, { level: 12, skillId: 'barrier' }],
    passives: [{ level: 15, name: '신앙', desc: '파티 층 클리어 회복량 +10%p', mods: [flat('floorRegen', 10, { scope: 'party' })] }],
  },
};

const adv = (
  id: JobDef['id'], name: string, desc: string, parent: BaseJob,
  aptMult: Partial<Stats>, skills: SkillUnlock[], passives: PassiveUnlock[],
): JobDef => {
  const p = BASE[parent];
  const aptitude = { ...p.aptitude };
  for (const k of Object.keys(aptMult) as StatKey[]) aptitude[k] *= aptMult[k]!;
  return { id, name, desc, aptMult, base: parent, tier: 2, parent, aptitude, skills: [...p.skills, ...skills], passives: [...p.passives, ...passives] };
};

/** 전직 레벨: 1→2차 Lv.20, 2→3차 Lv.50, 3→4차 Lv.70, 4→5차 Lv.90 */
export const ADVANCE_AT: Record<1 | 2 | 3 | 4, number> = { 1: 20, 2: 50, 3: 70, 4: 90 };
/** 직업 단계별 레벨 상한 */
export const TIER_CAP: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 20, 2: 50, 3: 70, 4: 90, 5: 100 };
export const ADVANCE_LEVEL = ADVANCE_AT[1];

const JOBS2 = {
  ...BASE,
  knight: adv('knight', '나이트', '도발로 적의 공격을 끌어오고 방패 반격과 불굴로 끝까지 버티는 탱커. 파티 생존력이 크게 오른다.', 'warrior', { hp: 1.15, def: 1.25, res: 1.15, atk: 0.95 },
    [{ level: 20, skillId: 'taunt' }],
    [{ level: 25, name: '방패 반격', desc: '받은 피해 30% 반사', passive: 'reflect30' },
     { level: 30, name: '불굴', desc: '사망 시 1회 HP 1로 버팀', passive: 'endure' }]),
  berserker: adv('berserker', '버서커', 'HP를 깎아 쓰는 피의 일격과 광폭화로, 체력이 낮을수록 강해지는 근접 딜러. 힐러와 궁합이 좋다.', 'warrior', { atk: 1.25, def: 0.85, hp: 1.05 },
    [{ level: 20, skillId: 'bloodStrike' }],
    [{ level: 25, name: '광폭화', desc: '잃은 HP 비율만큼 공격력 상승 (최대 +50%)', passive: 'berserkScale' }]),
  elementalist: adv('elementalist', '원소술사', '메테오와 원소 증폭으로 광역 화력을 극대화한 마법사. 적이 많을수록 강하다.', 'mage', { mag: 1.2, mp: 1.1 },
    [{ level: 20, skillId: 'meteor' }],
    [{ level: 25, name: '원소 증폭', desc: '스킬 데미지 +20%', mods: [pct('skillDmg', 20)] }]),
  warlock: adv('warlock', '흑마법사', '저주로 적 전체의 방어·마저를 깎고 생명 흡수로 스스로 회복하는 마법사. 보스전과 단단한 적에 강하다.', 'mage', { hp: 1.15, mag: 1.1 },
    [{ level: 20, skillId: 'curse' }, { level: 25, skillId: 'drainLife' }], []),
  ranger: adv('ranger', '레인저', '급소 사격과 매의 눈(치명타 피해 200%)으로 한 방을 노리는 저격수. 단일 화력 최강.', 'archer', { atk: 1.15, crit: 1.3 },
    [{ level: 20, skillId: 'vitalShot' }],
    [{ level: 25, name: '매의 눈', desc: '치명타 피해 150% → 200%', mods: [flat('critDmg', 0.5)] }]),
  hunter: adv('hunter', '사냥꾼', '함정으로 적을 기절시키고 늑대와 함께 추가 공격하는 운영형 궁수. 체력이 더 튼튼하다.', 'archer', { hp: 1.1, agi: 1.1 },
    [{ level: 20, skillId: 'trap' }, { level: 25, skillId: 'summonWolf' }], []),
  paladin: adv('paladin', '팔라딘', '공격력과 마력을 합쳐 때리는 근접 성직자. 받는 피해를 줄이고 치유도 쓴다. 공격형 서포터.', 'priest', { atk: 1.35, hp: 1.15, def: 1.2 },
    [{ level: 20, skillId: 'judgment' }],
    [{ level: 25, name: '신성 보호', desc: '받는 피해 -20%', mods: [pct('dmgTaken', -20)] }]),
  archpriest: adv('archpriest', '대사제', '파티 전체를 회복하는 대치유와 쓰러진 아군 부활로 생존을 책임지는 최고의 힐러. 보스전 필수.', 'priest', { mag: 1.15, mp: 1.2 },
    [{ level: 20, skillId: 'greatHeal' }, { level: 35, skillId: 'divineBarrier' }],
    [{ level: 25, name: '부활', desc: '쓰러진 아군 1회 HP 30%로 부활', passive: 'revive' }]),
};

/** 3차 직업: 2차의 스킬·패시브를 물려받고 성향이 한 번 더 강화됨 */
const third = (
  id: JobDef['id'], name: string, desc: string, parentId: JobId,
  aptMult: Partial<Stats>, skills: SkillUnlock[], passives: PassiveUnlock[],
): JobDef => {
  const p = JOBS2[parentId as keyof typeof JOBS2];
  const aptitude = { ...p.aptitude };
  for (const k of Object.keys(aptMult) as StatKey[]) aptitude[k] *= aptMult[k]!;
  return { id, name, desc, aptMult, base: p.base, tier: 3, parent: parentId, aptitude, skills: [...p.skills, ...skills], passives: [...p.passives, ...passives] };
};

const JOBS3 = {
  guardian: third('guardian', '수호 기사단장', '파티 전체를 지키는 최강의 탱커. 피해 감소 맹세와 수호 오라로 보스전의 버팀목이 된다.', 'knight', { hp: 1.1, def: 1.15, res: 1.1 },
    [{ level: 50, skillId: 'vowOfImmortality' }],
    [{ level: 60, name: '수호 오라', desc: '파티 방어력 +10%', mods: [pct('def', 10, { scope: 'party' })] }]),
  slaughterer: third('slaughterer', '학살자', '체력을 태워 적 전체를 쓸어버리는 무단 딜러. 위기에 몰릴수록 질기다.', 'berserker', { atk: 1.15, hp: 1.05 },
    [{ level: 50, skillId: 'bloodStorm' }],
    [{ level: 60, name: '불사의 광기', desc: 'HP 30% 이하일 때 받는 피해 -30%', mods: [pct('dmgTaken', -30, { when: 'selfHpBelow30' })] }]),
  archmage: third('archmage', '대마도사', '광역 화력의 정점. 적이 많을수록 압도적이다.', 'elementalist', { mag: 1.15, mp: 1.1 },
    [{ level: 50, skillId: 'arcaneNova' }],
    [{ level: 60, name: '마력 폭주', desc: '스킬 데미지 +25%', mods: [pct('skillDmg', 25)] }]),
  necromancer: third('necromancer', '네크로맨서', '해골 군단을 부리는 소환사. 적을 쓰러뜨릴 때마다 마나를 거둔다.', 'warlock', { mag: 1.1, hp: 1.1 },
    [{ level: 50, skillId: 'skeletonLegion' }],
    [{ level: 60, name: '영혼 수확', desc: '적 처치 시 MP 10% 회복', passive: 'soulHarvest' }]),
  sharpshooter: third('sharpshooter', '신궁', '한 발로 보스를 뚫는 저격수. 단일 화력의 끝.', 'ranger', { atk: 1.12, crit: 1.2 },
    [{ level: 50, skillId: 'skyArrow' }],
    [{ level: 60, name: '약점 간파', desc: '치명타율 +15%p', mods: [flat('crit', 15)] }]),
  beastlord: third('beastlord', '야수왕', '야수 무리를 이끄는 서포터형 딜러. 포효로 파티 전체를 끌어올린다.', 'hunter', { hp: 1.1, atk: 1.1 },
    [{ level: 50, skillId: 'beastRoar' }],
    [{ level: 60, name: '무리의 우두머리', desc: '늑대 추가 공격 위력 2배', passive: 'packLeader' }]),
  crusader: third('crusader', '성전사', '언데드와 마족 사냥에 특화된 근접 성직자. 파티를 신성한 방패로 감싼다.', 'paladin', { atk: 1.1, mag: 1.1, def: 1.1 },
    [{ level: 50, skillId: 'holyJudgment' }],
    [{ level: 60, name: '성스러운 방패', desc: '파티 받는 피해 -10%', mods: [pct('dmgTaken', -10, { scope: 'party' })] }]),
  archbishop: third('archbishop', '대주교', '파티의 생사를 쥐는 궁극의 힐러. 성역으로 버티고 기적으로 되살린다.', 'archpriest', { mag: 1.1, mp: 1.15, hp: 1.05 },
    [{ level: 50, skillId: 'sanctuary' }],
    [{ level: 60, name: '기적', desc: '탐험당 1회, 쓰러진 아군 전원 HP 30%로 부활', passive: 'miracle' }]),
};

/** 3차 이후 상위 직업 생성 (부모 성향 × 배율, 스킬·패시브 상속) */
const higher = (
  tier: 4 | 5, id: JobDef['id'], name: string, desc: string, parent: JobDef,
  aptMult: Partial<Stats>, skills: SkillUnlock[], passives: PassiveUnlock[],
): JobDef => {
  const aptitude = { ...parent.aptitude };
  for (const k of Object.keys(aptMult) as StatKey[]) aptitude[k] *= aptMult[k]!;
  return { id, name, desc, aptMult, base: parent.base, tier, parent: parent.id, aptitude, skills: [...parent.skills, ...skills], passives: [...parent.passives, ...passives] };
};
const J3 = JOBS3 as Record<string, JobDef>;
const JOBS4 = {
  aegisLord: higher(4, 'aegisLord', '아이기스 군주', '신화의 방패를 든 수호자. 파티 전체를 한 번 더 단단하게 만든다. 앞줄에 세우면 진가가 나온다.', J3.guardian, { hp: 1.08, def: 1.1, res: 1.1 },
    [{ level: 70, skillId: 'aegis' }],
    [{ level: 80, name: '철의 의지', desc: '파티 마법 저항 +12%', mods: [pct('res', 12, { scope: 'party' })] }]),
  warlord: higher(4, 'warlord', '전쟁군주', '전장을 지배하는 광전사. 함성으로 적 전체를 베고 파티의 사기를 끌어올린다.', J3.slaughterer, { atk: 1.1, hp: 1.05 },
    [{ level: 70, skillId: 'warCry' }],
    [{ level: 80, name: '피의 갈증', desc: '일반 공격 데미지 +30%', mods: [pct('normalDmg', 30)] }]),
  sage: higher(4, 'sage', '현자', '마법의 이치를 꿰뚫은 자. 적의 마법 저항을 무시하고 광역 마법을 퍼붓는다.', J3.archmage, { mag: 1.1, mp: 1.1 },
    [{ level: 70, skillId: 'chainLightning' }],
    [{ level: 80, name: '마력 관통', desc: '적 마법 저항 25% 무시', mods: [flat('resPierce', 25)] }]),
  lich: higher(4, 'lich', '리치', '죽음을 초월한 마법사. 적 전체의 방어를 무너뜨리고 독으로 서서히 말려 죽인다.', J3.necromancer, { mag: 1.08, hp: 1.1 },
    [{ level: 70, skillId: 'deathCurse' }],
    [{ level: 80, name: '불사의 몸', desc: '쓰러질 공격을 1회 HP 1로 버팀', passive: 'endure' }]),
  windArcher: higher(4, 'windArcher', '바람의 사수', '바람을 타고 연사하는 궁수. 치명타가 터질 때의 위력이 압도적이다.', J3.sharpshooter, { atk: 1.08, agi: 1.1, crit: 1.1 },
    [{ level: 70, skillId: 'galeShot' }],
    [{ level: 80, name: '급소 사격', desc: '치명타 피해 +50%p', mods: [flat('critDmg', 0.5)] }]),
  wildKing: higher(4, 'wildKing', '대지의 군주', '야수 무리를 이끌고 진군하는 왕. 적을 짓밟아 기절시키고 파티를 북돋운다.', J3.beastlord, { hp: 1.08, atk: 1.08 },
    [{ level: 70, skillId: 'stampede' }],
    [{ level: 80, name: '군주의 위엄', desc: '파티 공격력 +8%', mods: [pct('atk', 8, { scope: 'party' })] }]),
  templar: higher(4, 'templar', '템플러', '성검을 휘두르는 기사단장. 마족·언데드를 베어 체력을 흡수한다.', J3.crusader, { atk: 1.08, mag: 1.08, hp: 1.05 },
    [{ level: 70, skillId: 'holyBlade' }],
    [{ level: 80, name: '신앙의 갑주', desc: '파티 받는 마법 피해 -12%', mods: [pct('magTaken', -12, { scope: 'party' })] }]),
  saint: higher(4, 'saint', '성인', '살아있는 성자. 파티 전체를 크게 치유하고 회복의 효율이 극에 달한다.', J3.archbishop, { mag: 1.1, mp: 1.1 },
    [{ level: 70, skillId: 'grandHeal' }],
    [{ level: 80, name: '성인의 손길', desc: '회복량 +25%', mods: [pct('healPower', 25)] }]),
};
const J4 = JOBS4 as Record<string, JobDef>;
const JOBS5 = {
  titan: higher(5, 'titan', '불멸의 수호신', '어떤 공격도 뚫지 못하는 거신. 마왕의 일격조차 받아낸다.', J4.aegisLord, { hp: 1.1, def: 1.1, res: 1.1 },
    [{ level: 90, skillId: 'titanWall' }],
    [{ level: 95, name: '거신의 육체', desc: '파티 최대 HP +10%', mods: [pct('hp', 10, { scope: 'party' })] }]),
  bloodGod: higher(5, 'bloodGod', '혈신', '피로 신이 된 전사. 잃은 체력만큼 강해지고 베면 벨수록 살아난다.', J4.warlord, { atk: 1.12, hp: 1.05 },
    [{ level: 90, skillId: 'carnage' }],
    [{ level: 95, name: '혈신의 각성', desc: '잃은 HP 비율만큼 공격력 증가 (최대 +50%)', passive: 'berserkScale' }]),
  starSage: higher(5, 'starSage', '성좌의 대현자', '별의 궤도를 움직이는 마법사. 하늘 전체를 무너뜨린다.', J4.sage, { mag: 1.12, mp: 1.1 },
    [{ level: 90, skillId: 'starfall' }],
    [{ level: 95, name: '성좌의 가호', desc: '스킬 데미지 +30%', mods: [pct('skillDmg', 30)] }]),
  deathLord: higher(5, 'deathLord', '죽음의 군주', '망자의 군세를 지휘하는 군주. 해골과 저주가 끊임없이 적을 덮친다.', J4.lich, { mag: 1.1, hp: 1.08 },
    [{ level: 90, skillId: 'armyOfDead' }],
    [{ level: 95, name: '망자의 왕관', desc: '마력 +15%, 적 마법 저항 15% 무시', mods: [pct('mag', 15), flat('resPierce', 15)] }]),
  godslayer: higher(5, 'godslayer', '신살자', '신마저 꿰뚫는 화살. 보스를 잡기 위해 태어난 저격수.', J4.windArcher, { atk: 1.12, crit: 1.1 },
    [{ level: 90, skillId: 'divineArrow' }],
    [{ level: 95, name: '신살의 눈', desc: '보스·엘리트에게 주는 피해 +25%', mods: [pct('bossDmg', 25)] }]),
  dragonRider: higher(5, 'dragonRider', '용기사', '용을 길들인 야수의 왕. 용의 숨결이 전장을 불태운다.', J4.wildKing, { atk: 1.08, mag: 1.15, hp: 1.05 },
    [{ level: 90, skillId: 'dragonBreath' }],
    [{ level: 95, name: '용의 비늘', desc: '파티 받는 피해 -6%, 공격력 +6%', mods: [pct('dmgTaken', -6, { scope: 'party' }), pct('atk', 6, { scope: 'party' })] }]),
  avatar: higher(5, 'avatar', '신의 화신', '신이 깃든 성전사. 심판의 날에는 적을 쓸고 아군을 치유한다.', J4.templar, { atk: 1.08, mag: 1.08, def: 1.08 },
    [{ level: 90, skillId: 'judgmentDay' }],
    [{ level: 95, name: '신성한 위광', desc: '파티 받는 피해 -10%', mods: [pct('dmgTaken', -10, { scope: 'party' })] }]),
  seraph: higher(5, 'seraph', '대천사', '하늘의 날개를 얻은 성직자. 파티를 죽음에서 몇 번이고 끌어낸다.', J4.saint, { mag: 1.1, mp: 1.12, hp: 1.05 },
    [{ level: 90, skillId: 'heavensGrace' }],
    [{ level: 95, name: '천상의 숨결', desc: '파티 층 클리어 회복 +20%p', mods: [flat('floorRegen', 20, { scope: 'party' })] }]),
};

export const JOBS: Record<JobId, JobDef> = { ...JOBS2, ...JOBS3, ...JOBS4, ...JOBS5 };

export const ADVANCE_OPTIONS: Record<BaseJob, [JobId, JobId]> = {
  warrior: ['knight', 'berserker'],
  mage: ['elementalist', 'warlock'],
  archer: ['ranger', 'hunter'],
  priest: ['paladin', 'archpriest'],
};
export const THIRD_OF: Record<string, JobId> = {
  knight: 'guardian', berserker: 'slaughterer', elementalist: 'archmage', warlock: 'necromancer',
  ranger: 'sharpshooter', hunter: 'beastlord', paladin: 'crusader', archpriest: 'archbishop',
};
export const FOURTH_OF: Record<string, JobId> = {
  guardian: 'aegisLord', slaughterer: 'warlord', archmage: 'sage', necromancer: 'lich',
  sharpshooter: 'windArcher', beastlord: 'wildKing', crusader: 'templar', archbishop: 'saint',
};
export const FIFTH_OF: Record<string, JobId> = {
  aegisLord: 'titan', warlord: 'bloodGod', sage: 'starSage', lich: 'deathLord',
  windArcher: 'godslayer', wildKing: 'dragonRider', templar: 'avatar', saint: 'seraph',
};
/** 지금 직업에서 고를 수 있는 다음 직업들 */
export function advanceOptions(job: JobId): JobId[] {
  const j = JOBS[job];
  if (j.tier === 1) return ADVANCE_OPTIONS[j.base];
  if (j.tier === 2) return [THIRD_OF[job]];
  if (j.tier === 3) return [FOURTH_OF[job]];
  if (j.tier === 4) return [FIFTH_OF[job]];
  return [];
}
/** 레벨에 맞는 최종 직업 경로 (시뮬레이션용) */
export function jobAtLevel(base: BaseJob, level: number, branch = 0): JobId {
  let j: JobId = base;
  if (level >= 20) j = ADVANCE_OPTIONS[base][branch];
  if (level >= 50) j = THIRD_OF[j];
  if (level >= 70) j = FOURTH_OF[j];
  if (level >= 90) j = FIFTH_OF[j];
  return j;
}
