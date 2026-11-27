import { toCardData, type CardData, type DecklistLine } from '@duplimancy/shared';

// Scryfall asks for 50–100 ms between requests and a descriptive User-Agent (set by the browser).
// We only read rules text and stats here; image_uris are discarded in toCardData.
const BATCH = 75;
const DELAY_MS = 100;

type Identifier = { name: string } | { set: string; collector_number: string } | { name: string; set: string };

function identifier(l: DecklistLine): Identifier {
  if (l.set && l.collector_number) return { set: l.set, collector_number: l.collector_number };
  if (l.set) return { name: l.name, set: l.set };
  return { name: l.name };
}

export async function resolveCards(
  lines: DecklistLine[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ found: { line: DecklistLine; card: CardData }[]; missing: DecklistLine[] }> {
  const found: { line: DecklistLine; card: CardData }[] = [];
  const missing: DecklistLine[] = [];
  for (let i = 0; i < lines.length; i += BATCH) {
    if (i > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
    const chunk = lines.slice(i, i + BATCH);
    const res = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ identifiers: chunk.map(identifier) }),
    });
    if (!res.ok) throw new Error(`Scryfall ${res.status}`);
    const json = (await res.json()) as { data: Record<string, unknown>[]; not_found: unknown[] };
    // Scryfall returns found cards in request order, skipping not_found ones.
    const notFound = new Set(json.not_found.map((x) => JSON.stringify(x)));
    let j = 0;
    for (const line of chunk) {
      if (notFound.has(JSON.stringify(identifier(line)))) missing.push(line);
      else if (json.data[j]) found.push({ line, card: toCardData(json.data[j++]!) });
    }
    onProgress?.(Math.min(i + BATCH, lines.length), lines.length);
  }
  return { found, missing };
}
