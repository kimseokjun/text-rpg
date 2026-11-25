// ───────── 공통 타입 ─────────
export type StatKey = 'hp' | 'mp' | 'atk' | 'mag' | 'def' | 'res' | 'agi' | 'crit';
export type Stats = Record<StatKey, number>;

/** 스탯 외 효과 키 */
export type ExtraKey =
  | 'goldGain'   // 골드 획득 %
  | 'itemGain'   // 아이템 드롭 %
  | 'expGain'    // 경험치 %
  | 'healPower'  // 회복량 %
  | 'skillDmg'   // 스킬 데미지 %
  | 'normalDmg'  // 일반공격 데미지 %
  | 'physDmg'    // 물리(공격력 계수) 피해 % — 스킬·평타 모두
  | 'mpCost'     // MP 소모 %
  | 'floorRegen' // 층 클리어 회복 %p
  | 'dmgTaken'   // 받는 피해 %
  | 'evade'      // 회피 %p
  | 'critDmg'    // 치명 배율 가산
  | 'aggro'      // 피격 가중치 %
  | 'hireCost'   // 고용가 %
  | 'bossDmg'    // 보스·엘리트에게 주는 피해 %
  | 'resPierce'  // 마법 저항 무시 %
  | 'defPierce'  // 방어 무시 %
  | 'magTaken'   // 받는 마법 피해 %
  | 'raidDmg';   // 레이드 보스에게 주는 피해 %

export type ModKey = StatKey | ExtraKey;

export interface Modifier {
  /** 잠재 줄 등급 (제련 옵션) */
  g?: number;
  key: ModKey;
  kind: 'flat' | 'pct';
  value: number;
  /** party면 출전 파티 전원에게 적용 */
  scope?: 'self' | 'party';
  /** 조건부 효과 */
  when?: 'selfHpBelow30' | 'selfHpBelow50';
}

export type Grade = 1 | 2 | 3 | 4 | 5;
export const GRADE_NAME: Record<Grade, string> = { 1: '일반', 2: '숙련', 3: '정예', 4: '영웅', 5: '전설' };

export type BaseJob = 'warrior' | 'mage' | 'archer' | 'priest';
export type AdvJob = 'knight' | 'berserker' | 'elementalist' | 'warlock' | 'ranger' | 'hunter' | 'paladin' | 'archpriest';
export type ThirdJob = 'guardian' | 'slaughterer' | 'archmage' | 'necromancer' | 'sharpshooter' | 'beastlord' | 'crusader' | 'archbishop';
export type FourthJob = 'aegisLord' | 'warlord' | 'sage' | 'lich' | 'windArcher' | 'wildKing' | 'templar' | 'saint';
export type FifthJob = 'titan' | 'bloodGod' | 'starSage' | 'deathLord' | 'godslayer' | 'dragonRider' | 'avatar' | 'seraph';
export type JobId = BaseJob | AdvJob | ThirdJob | FourthJob | FifthJob;

// ───────── 스킬 ─────────
export type StatusType = 'poison' | 'burn' | 'stun' | 'silence';

export type SkillEffect =
  | {
      type: 'damage';
      scale: 'atk' | 'mag' | 'atk+mag';
      power: number;            // 배율 (1.5 = 150%)
      target: 'single' | 'all' | 'front' | 'back';
      hits?: number;
      critBonus?: number;       // 치명타율 +%p
      guaranteedCrit?: boolean;
      undeadBonus?: number;     // 언데드 추가 배율
      hpCostPct?: number;       // 시전자 HP 소모 %
      lifestealPct?: number;
      status?: { type: StatusType; turns: number; chance: number };
      /** 레이드 보스 시전 끊기 (무력화 게이지 감소량) */
      interrupt?: number;
    }
  | { type: 'heal'; target: 'lowestAlly' | 'party'; pctMaxHp: number }
  | { type: 'shield'; target: 'party' | 'lowestAlly'; pctMaxHp: number; turns: number }
  | { type: 'buff'; target: 'self' | 'party'; mods: Modifier[]; turns: number; flag?: BuffFlag }
  | { type: 'debuff'; target: 'single' | 'all'; mods: Modifier[]; turns: number; status?: { type: StatusType; turns: number; chance: number }; interrupt?: number }
  | { type: 'taunt'; turns: number }
  | { type: 'summon'; monsterId: string; count: number };

export type BuffFlag = 'manaShield' | 'extraHit' | 'protect' | 'skeletons';

export type Passive =
  | 'manaRegen3'    // 턴마다 MP 3%
  | 'reflect30'     // 받은 피해 30% 반사
  | 'endure'        // 사망 시 1회 HP 1
  | 'revive'        // 쓰러진 아군 1회 HP 30% 부활
  | 'berserkScale'  // 잃은 HP 비율만큼 공격 상승 (최대 +50%)
  | 'immortalWill'  // [영웅] 탐험당 1회 쓰러질 때 HP 30%
  | 'lastBastion'   // [전설] 아군 치명타 대신 맞기 2회
  | 'starOracle'    // [전설] 3턴마다 광역 마법 추가
  | 'skyBow'        // [전설] 첫 턴 선공 + 턴 첫 공격 치명
  | 'dawnPrayer'    // [전설] 층 클리어 파티 HP 30% 추가 회복
  | 'zeroMpFirstTurn' // [영웅] 첫 턴 MP 소모 0
  | 'soulHarvest'   // 적 처치 시 MP 10% 회복
  | 'packLeader'    // 늑대 추가 공격 위력 2배
  | 'miracle'       // 탐험당 1회, 라운드 끝에 쓰러진 아군 전원 부활
  | 'purify'        // [전설] 라운드 끝 아군 독·화상 해제
  // ── 몬스터 기믹 ──
  | 'bulwark'       // 다른 적이 살아있는 동안 받는 피해 -70%
  | 'rampage'       // 라운드마다 공격·마력 +12% 누적
  | 'mender'        // 라운드 끝 보스 HP 9% 회복
  | 'flee';         // 4라운드가 지나면 도망 (보물 고블린)

export interface SkillDef {
  id: string;
  name: string;
  mp: number;
  effects: SkillEffect[];
  /** 기본 사용 조건 */
  defaultCondition?: Condition;
}

export type Condition =
  | { type: 'always' }
  | { type: 'allyHpBelow'; pct: number }
  | { type: 'selfHpBelow'; pct: number }
  | { type: 'enemyCount'; min: number }
  | { type: 'bossOnly' }
  | { type: 'notActive' }; // 같은 버프가 걸려있지 않을 때

export interface SkillSlot {
  skillId: string;
  condition?: Condition;
}

// ───────── 장비 ─────────
/** 장비 종류 (아이템 기준): 무기 · 모자 · 상의(armor) · 하의 · 목걸이(accessory) · 반지 */
export type BaseSlot = 'weapon' | 'hat' | 'armor' | 'bottom' | 'accessory' | 'ring';
/** 착용 칸 (캐릭터 기준): 반지는 2칸 */
export type EquipSlot = 'weapon' | 'hat' | 'armor' | 'bottom' | 'accessory' | 'ring1' | 'ring2';
export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'hat', 'armor', 'bottom', 'accessory', 'ring1', 'ring2'];
/** 이 종류의 아이템을 낄 수 있는 칸 */
export const wornSlots = (b: BaseSlot): EquipSlot[] => (b === 'ring' ? ['ring1', 'ring2'] : [b]);
export type Rarity = 1 | 2 | 3 | 4 | 5;
export const RARITY_NAME: Record<Rarity, string> = { 1: '일반', 2: '고급', 3: '희귀', 4: '영웅', 5: '전설' };

export interface EquipBase {
  id: string;
  name: string;
  slot: BaseSlot;
  jobs?: BaseJob[];   // 없으면 공용
  tier: number;       // 1~7 드롭 층 기준, 8 = 마왕성 세트
  stats: Partial<Stats>;
  /** 세트 장비 id */
  set?: string;
}

export interface Equip {
  uid: string;
  baseId: string;
  rarity: Rarity;
  enhance: number;    // 0~15
  failStack: number;  // 천장 누적
  options: Modifier[];
  /** 제련 고정된 옵션 칸 */
  locked?: number[];
  /** 잠재 등급 1 레어 · 2 에픽 · 3 유니크 · 4 레전드리 (없으면 레어) */
  pot?: number;
  potPity?: number;
  /** 에디셔널 잠재 (고대 룬석) */
  add?: Modifier[];
  addG?: number;
  addPity?: number;
  addLocked?: number[];
}

// ───────── 캐릭터 ─────────
export type Row = 'front' | 'back';
export type TargetPref = 'auto' | 'boss' | 'adds';
export const TARGET_NAME: Record<TargetPref, string> = { auto: '자동', boss: '보스 우선', adds: '잡몹 우선' };

export interface Character {
  uid: string;
  mercId: string | null;  // 용병 정의 id (주인공은 null)
  name: string;
  isHero: boolean;
  jobId: JobId;
  level: number;
  exp: number;
  grade: Grade;
  traitIds: string[];
  uniqueTraitId: string | null;
  awakening: number;       // 0~5
  /** 초월 0~5: 각성 5 이후 같은 용병 중복 고용 */
  transcend?: number;
  /** 다음 초월까지 모은 같은 용병 수 */
  transShard?: number;
  bonusPoints: Partial<Stats>;
  equipment: Partial<Record<EquipSlot, Equip>>;
  skillSlots: SkillSlot[]; // 우선순위 순
  row?: Row;               // 전열/후열 (없으면 직업 기본)
  target?: TargetPref;     // 공격 대상 우선순위
}

// ───────── 전투 로그 이벤트 ─────────
export interface UnitSnap { name: string; hp: number; maxHp: number; boss?: boolean; elite?: boolean; id?: string; tags?: string[]; job?: string }

export type BattleEvent =
  | { t: 'wave'; floor: number; wave: number; enemies: UnitSnap[]; elite: boolean; boss: boolean }
  | { t: 'round'; n: number }
  | { t: 'skill'; actor: string; skill: string }
  | { t: 'attack'; actor: string }
  | { t: 'damage'; from: string; to: string; amount: number; crit: boolean; hpLeft: number; maxHp: number }
  | { t: 'evade'; from: string; to: string }
  | { t: 'heal'; from: string; to: string; amount: number; hpLeft: number; maxHp: number }
  | { t: 'status'; to: string; status: StatusType | 'buff' | 'debuff' | 'taunt'; label: string }
  | { t: 'dot'; to: string; status: StatusType; amount: number; hpLeft: number; maxHp: number }
  | { t: 'stunned'; who: string }
  | { t: 'death'; who: string; side: 'party' | 'enemy' }
  | { t: 'special'; who: string; text: string }
  | { t: 'summon'; who: string; summoned: UnitSnap[] }
  | { t: 'result'; win: boolean; rounds: number }
  /** 4인 레이드 보스 기믹 */
  | { t: 'raid'; kind: RaidFx; text: string; who?: string; target?: string; value?: number };
export type RaidFx = 'cast' | 'castTick' | 'interrupt' | 'break' | 'wipe' | 'mark' | 'markHit' | 'phase' | 'curse' | 'enrage' | 'groggy' | 'summon' | 'smash' | 'breath';
