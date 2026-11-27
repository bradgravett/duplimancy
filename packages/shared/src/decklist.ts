export interface DecklistLine {
  qty: number;
  name: string;
  set?: string;
  collector_number?: string;
}

const SECTION = /^(\/\/|#)|^(commander|companion|deck|mainboard|main|sideboard|maybeboard|lands?|creatures?|instants?|sorcer(y|ies)|artifacts?|enchantments?|planeswalkers?|battles?|tokens?)\s*(\(\d+\))?:?$/i;
// "1 Sol Ring", "1x Sol Ring", "Sol Ring", "1 Sol Ring (C21) 263", "1 Sol Ring [C21]", "1 Sol Ring *F*"
const LINE = /^(?:(\d+)\s*x?\s+)?(.+?)(?:\s+[([]([A-Za-z0-9]{2,6})[)\]](?:\s+([\w-]+★?))?)?(?:\s+\*[A-Z]+\*)*\s*$/;

/** Parse a pasted decklist (Arena, MTGO, Moxfield, Archidekt plain-text exports). */
export function parseDecklist(text: string): { lines: DecklistLine[]; errors: string[] } {
  const merged = new Map<string, DecklistLine>();
  const errors: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || SECTION.test(line)) continue;
    const m = LINE.exec(line);
    if (!m || !m[2]) {
      errors.push(line);
      continue;
    }
    const entry: DecklistLine = { qty: m[1] ? Number(m[1]) : 1, name: m[2].trim() };
    if (m[3]) entry.set = m[3].toLowerCase();
    if (m[4]) entry.collector_number = m[4];
    const key = `${entry.name.toLowerCase()}|${entry.set ?? ''}|${entry.collector_number ?? ''}`;
    const prev = merged.get(key);
    if (prev) prev.qty += entry.qty;
    else merged.set(key, entry);
  }
  return { lines: [...merged.values()], errors };
}
