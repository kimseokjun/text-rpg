import { readFileSync, writeFileSync } from 'fs';
import { simulateMulti } from '../server/multi';
const a = JSON.parse(readFileSync('/tmp/save5.json', 'utf8'));
const uid = '11111111-2222-3333-4444-555555555555';
const r = simulateMulti([{ user_id: uid, username: '테스터', chars: a.party.slice(0, 2), save: a, host: true }, { user_id: 'u2xxxxxx', username: '친구', chars: a.party.slice(2, 4), save: a, host: false }], 43, 777);
writeFileSync('/tmp/mresult.json', JSON.stringify(r));
console.log('cleared', (r as any).cleared);
