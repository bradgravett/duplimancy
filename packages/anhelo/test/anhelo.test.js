import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { anhelo, optionsForCard, primaryType } from '../src/index.js';

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
const base = { salt: 0, symO: 'auto', faceO: 'cp', pal: 'balanced' };

// Golden hashes taken from the test-bench port. If one of these changes, every
// existing project's generated art changes too: only update them on purpose.
const GOLDEN = [
  [{ name: 'Sol Ring', colors: [], type: 'Artifact', mv: 1 }, '2c35699df95f'],
  [{ name: 'Island', colors: ['U'], type: 'Land', mv: 0 }, '87b59d6f17cc'],
  [{ name: 'Llanowar Elves', colors: ['G'], type: 'Creature', mv: 1 }, '247dfe473fae'],
  [{ name: 'Ugin, the Spirit Dragon', colors: [], type: 'Planeswalker', mv: 8 }, '221c58b26e41'],
  [{ name: 'Lightning Bolt', colors: ['R'], type: 'Instant', mv: 1 }, '7f3bac3c0293'],
];

test('golden renders are byte-identical', () => {
  for (const [o, hash] of GOLDEN) assert.equal(sha(anhelo({ ...base, ...o }).svg), hash, o.name);
});

test('same input twice gives the same SVG; salt changes it', () => {
  const o = { ...base, name: 'Rhystic Study', colors: ['U'], type: 'Enchantment', mv: 3 };
  assert.equal(anhelo(o).svg, anhelo(o).svg);
  assert.notEqual(anhelo(o).svg, anhelo({ ...o, salt: 1 }).svg);
});

test('palette mood recolours without changing the composition', () => {
  const o = { ...base, name: 'Demonic Tutor', colors: ['B'], type: 'Sorcery', mv: 2 };
  assert.equal(anhelo({ ...o, pal: 'vivid' }).meta, anhelo(o).meta);
});

test('generator never calls Math.random', () => {
  const src = readFileSync(new URL('../src/anhelo.js', import.meta.url), 'utf8');
  assert.equal(src.includes('Math.random'), false);
});

test('Scryfall mapping', () => {
  assert.equal(primaryType('Artifact Creature — Golem'), 'Creature');
  assert.equal(primaryType('Legendary Land'), 'Land');
  assert.equal(primaryType('Instant // Sorcery'), 'Instant');
  const o = optionsForCard({ name: 'Fire // Ice', type_line: 'Instant // Instant', color_identity: ['U', 'R'], cmc: 4 });
  assert.deepEqual([o.name, o.colors, o.type, o.mv], ['Fire', ['U', 'R'], 'Instant', 4]);
});
