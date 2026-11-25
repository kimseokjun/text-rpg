import type { JobId } from '../core/types';
import { JOBS } from '../data/jobs';

/** 밤의 마을: 하늘·달·별, 먼 언덕, 성, 집들, 묘지 입구와 횃불 */
export function townScene(): string {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 60 }, () => {
    const x = rnd() * 1200, y = rnd() * 150, r = rnd() * 1.3 + 0.3;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#f6e7c9" opacity="${(0.3 + rnd() * 0.6).toFixed(2)}"/>`;
  }).join('');
  const houses = [
    [330, 70, 60], [400, 90, 75], [480, 64, 55], [545, 100, 70], [625, 76, 62], [700, 88, 58], [770, 66, 70],
  ].map(([x, w, h], i) => {
    const top = 250 - h;
    const win = `<rect x="${x + w * 0.22}" y="${top + h * 0.35}" width="10" height="13" rx="2" fill="#ffcf7a" opacity="${i % 3 ? 0.9 : 0.55}"/><rect x="${x + w * 0.6}" y="${top + h * 0.35}" width="10" height="13" rx="2" fill="#ffcf7a" opacity="${i % 2 ? 0.35 : 0.85}"/>`;
    return `<g><rect x="${x}" y="${top}" width="${w}" height="${h}" fill="#2b1720"/><rect x="${x}" y="${top}" width="${w * 0.18}" height="${h}" fill="#341d27"/><path d="M${x - 6} ${top}L${x + w / 2} ${top - 30}L${x + w + 6} ${top}Z" fill="#3d1f2a"/><path d="M${x + w / 2} ${top - 30}L${x + w + 6} ${top}L${x + w / 2} ${top}Z" fill="#2a141d"/>${win}</g>`;
  }).join('');
  return `<svg viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
<defs>
 <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f0a1a"/><stop offset="1" stop-color="#4a1d2c"/></linearGradient>
 <radialGradient id="moon" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#fbeccd"/><stop offset="1" stop-color="#fbeccd" stop-opacity="0"/></radialGradient>
 <radialGradient id="torch" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb04a" stop-opacity=".75"/><stop offset="1" stop-color="#ffb04a" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="300" fill="url(#sky)"/>
${stars}
<circle cx="640" cy="62" r="46" fill="url(#moon)"/><circle cx="640" cy="62" r="30" fill="#fbeccd"/><circle cx="652" cy="54" r="6" fill="#e9d6b0"/>
<path d="M0 230 Q160 170 330 210 T700 200 T1200 190 V300 H0Z" fill="#2a1522" opacity=".9"/>
<g fill="#22111a">
 <rect x="880" y="120" width="210" height="140"/><rect x="860" y="80" width="44" height="180"/><rect x="1066" y="70" width="48" height="190"/><rect x="960" y="100" width="50" height="160"/>
 <path d="M856 80h52l-26-40z M1062 70h56l-28-46z M956 100h58l-29-42z"/>
 ${Array.from({ length: 9 }, (_, i) => `<rect x="${884 + i * 23}" y="110" width="12" height="12"/>`).join('')}
</g>
<g fill="#ffcf7a" opacity=".8"><rect x="876" y="120" width="8" height="12" rx="3"/><rect x="1084" y="110" width="8" height="12" rx="3"/><rect x="980" y="140" width="9" height="14" rx="3"/></g>
${houses}
<rect x="0" y="248" width="1200" height="52" fill="#170c12"/>
<g>
 <path d="M70 250V170a70 60 0 0 1 140 0v80Z" fill="#2d1a22"/><path d="M95 250V185a45 40 0 0 1 90 0v65Z" fill="#07040a"/>
 <path d="M70 250V170a70 60 0 0 1 20-42v122Z" fill="#3a2230"/>
 <rect x="52" y="176" width="8" height="40" fill="#3a2230"/><rect x="220" y="176" width="8" height="40" fill="#3a2230"/>
 <circle cx="56" cy="170" r="34" fill="url(#torch)"/><circle cx="224" cy="170" r="34" fill="url(#torch)"/>
 <path d="M56 158c-6 8-4 14 0 16 4-2 6-8 0-16z M224 158c-6 8-4 14 0 16 4-2 6-8 0-16z" fill="#ffd36e"/>
</g>
</svg>`;
}

const ICONS: Record<string, string> = {
  warrior: '<path d="M6 26 20 12l2 2L8 28z" fill="#d9d4cc"/><path d="M19 7l6 6-3 3-6-6z" fill="#f2efe9"/><path d="M5 23l4 4-2 2-4-4z" fill="#8a5a3a"/><path d="M10 20l2 2-4 1z" fill="#c9a65a"/>',
  mage: '<path d="M14 28l2-18h2l2 18z" fill="#8a5a3a"/><circle cx="17" cy="8" r="5" fill="#5b8bef"/><circle cx="15.5" cy="6.5" r="1.6" fill="#cfe0ff"/><path d="M8 6l2 1-2 1-1 2-1-2-2-1 2-1 1-2z M26 14l1.5.8-1.5.8-.8 1.5-.8-1.5-1.5-.8 1.5-.8.8-1.5z" fill="#cfe0ff"/>',
  archer: '<path d="M9 4c12 4 12 22 0 26" fill="none" stroke="#b07a4a" stroke-width="2.4"/><path d="M9 4v26" stroke="#e8e0d0" stroke-width="1"/><path d="M5 17h22" stroke="#d9d4cc" stroke-width="1.6"/><path d="M27 17l-4-3v6z" fill="#f2efe9"/><path d="M5 17l3-2v4z" fill="#63c27a"/>',
  priest: '<circle cx="17" cy="17" r="11" fill="#e7c35c" opacity=".25"/><path d="M15 6h4v8h8v4h-8v12h-4V18H7v-4h8z" fill="#f4dc8a"/>',
  undead: '<path d="M17 5c-7 0-11 5-11 11 0 4 2 6 4 7v4h14v-4c2-1 4-3 4-7 0-6-4-11-11-11z" fill="#d9d4cc"/><circle cx="13" cy="16" r="3" fill="#1c1117"/><circle cx="21" cy="16" r="3" fill="#1c1117"/><path d="M15 21h4l-2 3z" fill="#1c1117"/>',
  beast: '<path d="M5 22c2-8 8-12 14-12 5 0 9 3 10 8l-4 1c0 4-4 7-10 7-5 0-9-1-10-4z" fill="#a08070"/><circle cx="22" cy="16" r="1.8" fill="#ff6b5f"/><path d="M12 10l-2-5 5 4z M18 9l1-5 3 5z" fill="#a08070"/>',
  arcane: '<path d="M17 4l3 9 9 4-9 4-3 9-3-9-9-4 9-4z" fill="#b67cf2"/><circle cx="17" cy="17" r="3" fill="#f2e6ff"/>',
  stone: '<path d="M9 28V12l8-7 8 7v16z" fill="#8f8a85"/><path d="M17 5l8 7v16h-8z" fill="#6f6a66"/><circle cx="14" cy="15" r="1.6" fill="#ffcf7a"/><circle cx="20" cy="15" r="1.6" fill="#ffcf7a"/>',
  shadow: '<path d="M17 4c6 0 9 6 9 12v12l-3-2-3 2-3-2-3 2-3-2-3 2V16c0-6 3-12 9-12z" fill="#3b2a44"/><path d="M12 15h4M18 15h4" stroke="#ff6b5f" stroke-width="2"/>',
  boss: '<path d="M5 12l5 5 7-11 7 11 5-5-3 16H8z" fill="#f2994a"/><circle cx="17" cy="21" r="2.5" fill="#1c1117"/>',
};

export function jobIcon(job: JobId): string {
  return `<svg viewBox="0 0 34 34" aria-hidden="true">${ICONS[JOBS[job].base]}</svg>`;
}

const MON_KIND: Record<string, string> = {
  '굶주린 쥐': 'beast', '묘지 박쥐': 'beast', '해골 병사': 'undead', '구울': 'undead', '해골 기사': 'undead',
  '타락한 수도승': 'arcane', '석상 수호자': 'stone', '그림자 암살자': 'shadow', '마력 정령': 'arcane', '신전 수호병': 'stone',
};
export function monsterIcon(name: string, boss?: boolean): string {
  const base = name.replace(/ [A-J]$/, '');
  const kind = boss ? 'boss' : MON_KIND[base] ?? 'undead';
  return `<svg viewBox="0 0 34 34" aria-hidden="true">${ICONS[kind]}</svg>`;
}
