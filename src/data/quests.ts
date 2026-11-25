/** 가이드 퀘스트: 순서대로 하나씩. 할 일을 알려주며 재화 쓰는 법을 자연스럽게 배우게 한다 */
export interface QuestView { maxFloor: number; partySize: number; maxEnh: number; maxTier: number; potions: number; pets: number; cnt: Record<string, number>; towerBest: number }
export interface QuestReward { gold?: number; stones?: number; blessings?: number; refineStones?: number; cores?: number; egg?: number }
export interface Quest { id: string; title: string; hint: string; done: (v: QuestView) => boolean; reward: QuestReward }
const f = (n: number) => (v: QuestView) => v.maxFloor >= n;
export const QUESTS: Quest[] = [
  { id: 'party4', title: '파티를 4명으로 채우기', hint: '모험가 길드에서 용병을 모집하고, 파티 편성에서 출전시키세요.', done: (v) => v.partySize >= 4, reward: { gold: 500 } },
  { id: 'f3', title: '마왕숲 3층 클리어', hint: '모험 → 던전 → 마왕숲에서 출발하세요.', done: f(3), reward: { gold: 600, stones: 3 } },
  { id: 'enh3', title: '장비 하나를 +3까지 강화', hint: '대장간 → 강화. 강화석은 던전에서 모여요.', done: (v) => v.maxEnh >= 3, reward: { stones: 5 } },
  { id: 'pot', title: '잡화점에서 물약 사기', hint: '던전 입구에서 최대 3종까지 마시고 출발할 수 있어요.', done: (v) => v.potions > 0, reward: { gold: 1000 } },
  { id: 'f5', title: '마왕숲 5층 보스 처치', hint: '보스층은 던전 입구에 뜨는 보스 대비 카드를 확인하세요.', done: f(5), reward: { gold: 1500, blessings: 1 } },
  { id: 'f10', title: '마왕숲 10층 보스 처치', hint: '막히면 전투 리포트의 패배 분석을 보고 세팅을 바꿔보세요.', done: f(10), reward: { gold: 3000, refineStones: 3 } },
  { id: 'refine', title: '제련 한 번 해보기', hint: '대장간 → 제련. 옵션 3칸을 다시 새기고, 좋은 옵션은 잠글 수 있어요.', done: (v) => (v.cnt.refine ?? 0) >= 1, reward: { refineStones: 3 } },
  { id: 'adv1', title: '첫 전직 (Lv.20)', hint: '캐릭터 카드를 눌러 전직하세요. 훈련소에서 골드로 레벨을 올릴 수도 있어요.', done: (v) => v.maxTier >= 2, reward: { gold: 5000 } },
  { id: 'daily', title: '일일 던전 한 번 돌기', hint: '모험 → 일일 던전. 한 번 깬 단계는 소탕할 수 있어요.', done: (v) => (v.cnt.daily ?? 0) >= 1, reward: { stones: 10 } },
  { id: 'pet', title: '펫 알 부화시키기', hint: '펫 우리에서 알을 사세요. 펫은 파티 전체를 강하게 해줘요.', done: (v) => v.pets > 0, reward: { gold: 5000 } },
  { id: 'f20', title: '마왕숲 20층 보스 처치', hint: '보스마다 기믹이 달라요. 공격 대상(보스/잡몹 우선)을 활용하세요.', done: f(20), reward: { gold: 10000, blessings: 3 } },
  { id: 'enh10', title: '장비 하나를 +10까지 강화', hint: '높은 강화는 실패할 수 있어요. 축복 주문서로 확률을 올리세요.', done: (v) => v.maxEnh >= 10, reward: { blessings: 3, stones: 20 } },
  { id: 'f30', title: '마왕숲 30층 보스 처치', hint: '마법 피해가 많은 보스는 마저와 방패 거북 펫이 효과적이에요.', done: f(30), reward: { gold: 20000, refineStones: 5 } },
  { id: 'adv2', title: '2차 전직 (Lv.50)', hint: '레벨이 막히면 일일 던전 "경험의 탑"이 좋아요.', done: (v) => v.maxTier >= 3, reward: { gold: 30000, refineStones: 5 } },
  { id: 'f40', title: '마왕숲 40층 보스 처치', hint: '', done: f(40), reward: { gold: 40000, egg: 3 } },
  { id: 'f50', title: '마왕숲 50층 — 마왕성 개방', hint: '50층을 깨면 마왕성 입구, 개인 레이드, 무한 탑, 군단의 잔해가 열려요.', done: f(50), reward: { gold: 60000, cores: 50 } },
  { id: 'raid', title: '개인 레이드 도전', hint: '모험 → 개인 레이드. 10라운드 동안 최대한 많은 피해를 넣으세요.', done: (v) => (v.cnt.raid ?? 0) >= 1, reward: { cores: 30, refineStones: 5 } },
  { id: 'tower10', title: '무한 탑 10층 돌파', hint: '모험 → 무한 탑. 층마다 기믹이 바뀌니 세팅을 맞춰가며 오르세요.', done: (v) => v.towerBest >= 10, reward: { cores: 50, refineStones: 10 } },
  { id: 'craft', title: '세트 장비 제작', hint: '대장간 → 제작. 군단장의 핵으로 원하는 세트를 만들어요.', done: (v) => (v.cnt.craft ?? 0) >= 1, reward: { refineStones: 10 } },
  { id: 'c10', title: '마왕성 10층 보스 처치', hint: '', done: f(60), reward: { cores: 100, gold: 100000 } },
  { id: 'tower30', title: '무한 탑 30층 돌파', hint: '', done: (v) => v.towerBest >= 30, reward: { cores: 150, egg: 4 } },
  { id: 'c20', title: '마왕성 20층 — 군주 처치', hint: '', done: f(70), reward: { cores: 200, gold: 200000, egg: 4 } },
  { id: 'tower50', title: '무한 탑 50층 돌파', hint: '여기서부터는 기록과의 싸움이에요.', done: (v) => v.towerBest >= 50, reward: { cores: 300, refineStones: 30 } },
];
export const rewardText = (r: QuestReward) => [r.gold && `${r.gold.toLocaleString('ko-KR')}G`, r.stones && `강화석 ${r.stones}`, r.blessings && `축복 ${r.blessings}`, r.refineStones && `제련석 ${r.refineStones}`, r.cores && `군단장의 핵 ${r.cores}`, r.egg && `${['', '', '', '희귀', '영웅', '전설'][r.egg]} 이상 펫 알`].filter(Boolean).join(' · ');
