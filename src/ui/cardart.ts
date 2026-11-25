/** 카드 그림: 이미지가 있으면 이미지(public/cards/<id>.webp), 없으면 코드로 그린 임시 초상 */
import { CARD_BY_ID, SET_BY_ID, type CardDef } from '../data/cards';

/** 그림 파일이 준비된 카드 id (이미지를 넣으면 여기에 추가) */
export const CARD_IMAGES = new Set<string>(['c01', 'c02']);

const GRADE_FRAME: Record<number, [string, string]> = { 1: ['#9aa3ad', '#5b636b'], 2: ['#7fd48a', '#2f7a3a'], 3: ['#7fb3ff', '#2a5aa8'], 4: ['#d08cff', '#6a2aa8'], 5: ['#ffe7a0', '#c8902c'] };

function portrait(c: CardDef, uid: string) {
  const { hair, outfit, eye, bg, acc } = c.look;
  const accSvg = acc === 'crown' ? `<path d="M122 92 L132 72 L141 88 L150 64 L159 88 L168 72 L178 92 Q150 84 122 92Z" fill="#ffd970" stroke="#b8862a" stroke-width="1.5"/><circle cx="150" cy="78" r="4.5" fill="#7fd3ff"/>`
    : acc === 'tiara' ? `<path d="M112 108 Q150 86 188 108" stroke="#e8e8f8" stroke-width="5" fill="none"/><circle cx="150" cy="96" r="6" fill="${eye}" stroke="#fff" stroke-width="2"/>`
    : acc === 'hat' ? `<path d="M80 116 Q150 96 220 116 Q150 108 80 116Z" fill="#2a1a3a"/><path d="M110 112 L150 28 L190 110Z" fill="#2a1a3a"/><path d="M118 104 Q150 96 182 104" stroke="${eye}" stroke-width="5" fill="none"/>`
    : acc === 'horns' ? `<path d="M112 104 C96 84 98 62 112 52 C110 72 118 88 126 98Z" fill="#2a1418" stroke="#5a2a30"/><path d="M188 104 C204 84 202 62 188 52 C190 72 182 88 174 98Z" fill="#2a1418" stroke="#5a2a30"/>`
    : acc === 'helm' ? `<path d="M100 120 Q100 80 150 78 Q200 80 200 120 L190 112 Q150 96 110 112Z" fill="#c9d1d9" stroke="#7a8290"/><path d="M98 104 L70 78 L96 96Z M202 104 L230 78 L204 96Z" fill="#f4f4f8"/>` : '';
  return `<defs>
    <linearGradient id="bg${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#07050c"/></linearGradient>
    <radialGradient id="gl${uid}" cx=".5" cy=".38" r=".55"><stop offset="0" stop-color="${SET_BY_ID[c.set].color}" stop-opacity=".5"/><stop offset="1" stop-color="${SET_BY_ID[c.set].color}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect x="0" y="0" width="300" height="320" fill="url(#bg${uid})"/>
  <circle cx="150" cy="130" r="150" fill="url(#gl${uid})"/>
  <g fill="#fff" opacity=".6"><circle cx="40" cy="50" r="1.6"/><circle cx="250" cy="40" r="1.2"/><circle cx="230" cy="110" r="1.8"/><circle cx="60" cy="140" r="1.1"/><circle cx="262" cy="200" r="1.4"/></g>
  <path d="M150 70 C100 70 78 110 80 160 C82 210 70 260 60 320 L240 320 C230 260 218 210 220 160 C222 110 200 70 150 70Z" fill="${hair}"/>
  <path d="M95 270 C110 240 130 232 150 232 C170 232 190 240 205 270 L225 320 L75 320Z" fill="${outfit}"/>
  <path d="M128 236 L150 286 L172 236 C164 232 158 231 150 231 C142 231 136 232 128 236Z" fill="#000" opacity=".18"/>
  <rect x="138" y="205" width="24" height="32" rx="8" fill="#fde3cf"/>
  <ellipse cx="150" cy="160" rx="50" ry="58" fill="#fff0e3"/>
  <path d="M98 150 C100 105 125 88 150 88 C178 88 202 106 202 150 C196 128 180 112 164 108 C170 122 160 132 150 118 C140 132 120 128 128 108 C114 114 102 128 98 150Z" fill="${hair}"/>
  <path d="M100 150 C96 190 92 220 86 250 C100 230 104 200 106 168Z M200 150 C204 190 208 220 214 250 C200 230 196 200 194 168Z" fill="${hair}" opacity=".85"/>
  <ellipse cx="130" cy="165" rx="10" ry="12" fill="#fff"/><ellipse cx="170" cy="165" rx="10" ry="12" fill="#fff"/>
  <ellipse cx="131" cy="167" rx="7" ry="9.5" fill="${eye}"/><ellipse cx="169" cy="167" rx="7" ry="9.5" fill="${eye}"/>
  <ellipse cx="131" cy="169" rx="3.6" ry="5" fill="#141020"/><ellipse cx="169" cy="169" rx="3.6" ry="5" fill="#141020"/>
  <circle cx="134" cy="162" r="2.6" fill="#fff"/><circle cx="172" cy="162" r="2.6" fill="#fff"/>
  <path d="M118 150 Q130 144 141 150" stroke="#5a4030" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M159 150 Q170 144 182 150" stroke="#5a4030" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="120" cy="185" rx="8" ry="4" fill="#ffb7b7" opacity=".55"/><ellipse cx="180" cy="185" rx="8" ry="4" fill="#ffb7b7" opacity=".55"/>
  <path d="M143 194 Q150 199 157 194" stroke="#d26f6f" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  ${accSvg}`;
}

let seq = 0;
/** 카드 전체 (틀 + 그림 + 이름 + 별). awaken: 0~5, locked: 미보유 */
export function cardHtml(id: string, opts: { awaken?: number; locked?: boolean; size?: number } = {}) {
  const c = CARD_BY_ID[id];
  const w = opts.size ?? 150;
  const [f1, f2] = GRADE_FRAME[c.grade];
  const uid = `k${seq++}`;
  const art = CARD_IMAGES.has(id)
    ? `<image href="./cards/${id}.webp" x="0" y="0" width="300" height="320" preserveAspectRatio="xMidYMin slice"/>`
    : portrait(c, uid);
  const aw = opts.awaken ?? 0;
  return `<svg class="tcard g${c.grade} ${opts.locked ? 'locked' : ''}" width="${w}" height="${Math.round((w * 420) / 300)}" viewBox="0 0 300 420" role="img" aria-label="${c.name} 카드">
    <defs><linearGradient id="fr${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${f1}"/><stop offset=".5" stop-color="${f2}"/><stop offset="1" stop-color="${f1}"/></linearGradient><clipPath id="cp${uid}"><rect x="18" y="18" width="264" height="300" rx="10"/></clipPath></defs>
    <rect x="4" y="4" width="292" height="412" rx="16" fill="url(#fr${uid})"/>
    <rect x="12" y="12" width="276" height="396" rx="12" fill="#120c1f"/>
    <g clip-path="url(#cp${uid})"><g transform="translate(18 18) scale(0.88 0.9375)">${art}</g></g>
    <rect x="18" y="18" width="264" height="300" rx="10" fill="none" stroke="${f1}" stroke-opacity=".6"/>
    <text x="150" y="352" text-anchor="middle" font-family="Hahmlet, serif" font-size="26" font-weight="700" fill="${f1}">${c.name}</text>
    <text x="150" y="378" text-anchor="middle" font-size="14" fill="#c9bfe0">${c.title}</text>
    <text x="150" y="402" text-anchor="middle" font-size="17" letter-spacing="3"><tspan fill="#ffd970">${'★'.repeat(aw)}</tspan><tspan fill="#ffffff40">${'☆'.repeat(5 - aw)}</tspan></text>
    ${opts.locked ? '<rect x="12" y="12" width="276" height="396" rx="12" fill="#000" opacity=".62"/><text x="150" y="215" text-anchor="middle" font-size="44" fill="#fff" opacity=".8">?</text>' : ''}
  </svg>`;
}
