import { anhelo, svgDataUri } from './anhelo.js';

export { anhelo, svgDataUri };
export const ART_WIDTH = 1000;
export const ART_HEIGHT = 740;

// First match wins: an "Artifact Creature" draws as a creature, an "Artifact Land" as a land.
const PRECEDENCE = ['Planeswalker', 'Battle', 'Creature', 'Land', 'Artifact', 'Enchantment', 'Instant', 'Sorcery'];
const ORDER = 'WUBRG';

export function primaryType(typeLine) {
  // Only the front face's types (before " // ") and only the supertype/type half (before " — ").
  const front = (typeLine || '').split(' // ')[0].split(' — ')[0];
  return PRECEDENCE.find((t) => front.includes(t)) ?? 'Artifact';
}

export function optionsForCard(card, opts = {}) {
  const colors = (card.color_identity || [])
    .filter((c) => ORDER.includes(c))
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return {
    name: card.name.split(' // ')[0],
    colors,
    type: primaryType(card.type_line),
    mv: Math.round(card.cmc ?? 0),
    salt: 0,
    symO: 'auto',
    faceO: 'cp',
    pal: 'balanced',
    ...opts,
  };
}
