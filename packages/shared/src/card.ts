/**
 * Scryfall-shaped card data (see docs/kit-spec.md §4). Rules text and stats only:
 * we never store or fetch Scryfall/WotC image URLs.
 */
export interface CardFace {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  colors?: string[];
}

export interface CardData extends CardFace {
  /** Scryfall oracle id: stable across reprints. */
  oracle_id: string;
  layout: string;
  type_line: string;
  cmc: number;
  color_identity: string[];
  rarity?: string;
  set?: string;
  collector_number?: string;
  card_faces?: CardFace[];
}

/** Fields we keep from a Scryfall card object. Everything else (incl. image_uris) is dropped. */
export const CARD_FIELDS = [
  'oracle_id', 'name', 'layout', 'mana_cost', 'type_line', 'oracle_text', 'flavor_text',
  'power', 'toughness', 'loyalty', 'defense', 'colors', 'color_identity', 'cmc', 'rarity',
  'set', 'collector_number',
] as const;
const FACE_FIELDS = [
  'name', 'mana_cost', 'type_line', 'oracle_text', 'flavor_text', 'power', 'toughness',
  'loyalty', 'defense', 'colors',
] as const;

function pick<T extends readonly string[]>(src: Record<string, unknown>, keys: T) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (src[k] !== undefined) out[k] = src[k];
  return out;
}

/** Reduce a raw Scryfall card to {@link CardData}. */
export function toCardData(raw: Record<string, unknown>): CardData {
  const card = pick(raw, CARD_FIELDS) as unknown as CardData;
  // Multi-face cards keep oracle_id on the faces for some layouts (e.g. reversible_card).
  const faces = raw.card_faces as Record<string, unknown>[] | undefined;
  if (faces?.length) card.card_faces = faces.map((f) => pick(f, FACE_FIELDS) as unknown as CardFace);
  if (!card.oracle_id && faces?.[0]?.oracle_id) card.oracle_id = faces[0].oracle_id as string;
  if (!card.type_line && card.card_faces?.[0]?.type_line) card.type_line = card.card_faces[0].type_line;
  return card;
}
