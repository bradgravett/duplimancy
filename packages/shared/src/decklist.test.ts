import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDecklist } from './decklist.ts';

test('parses common export formats', () => {
  const { lines, errors } = parseDecklist(`Commander
1 Atraxa, Praetors' Voice
Deck
1x Sol Ring (C21) 263
2 Island
Island
1 Fire // Ice [MH2]
4 Lightning Bolt *F*
`);
  assert.deepEqual(errors, []);
  assert.deepEqual(lines, [
    { qty: 1, name: "Atraxa, Praetors' Voice" },
    { qty: 1, name: 'Sol Ring', set: 'c21', collector_number: '263' },
    { qty: 3, name: 'Island' },
    { qty: 1, name: 'Fire // Ice', set: 'mh2' },
    { qty: 4, name: 'Lightning Bolt' },
  ]);
});
