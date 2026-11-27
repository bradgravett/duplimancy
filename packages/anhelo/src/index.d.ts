export type AnheloColor = 'W' | 'U' | 'B' | 'R' | 'G';
export type AnheloType =
  | 'Creature' | 'Land' | 'Instant' | 'Sorcery' | 'Artifact'
  | 'Enchantment' | 'Planeswalker' | 'Battle';

export interface AnheloOptions {
  name: string;
  /** Colour identity; empty = colourless. */
  colors: AnheloColor[];
  type: AnheloType;
  /** Mana value, clamped to 0–16. */
  mv: number;
  /** 0 = the card's default art; reroll increments. */
  salt: number;
  symO?: 'auto' | 'none' | 'mirror' | 'mirror2' | 'rot' | 'dih' | 'wall' | 'multi';
  faceO?: 'cp' | 'all' | 'off';
  pal?: 'balanced' | 'vivid' | 'pastel' | 'parchment';
  detail?: 'on' | 'off';
}

export interface AnheloResult {
  /** 1000×740 SVG document. */
  svg: string;
  /** Human-readable description of the seeded choices. */
  meta: string;
}

export declare const ART_WIDTH: 1000;
export declare const ART_HEIGHT: 740;

export declare function anhelo(o: AnheloOptions): AnheloResult & { P: unknown };
export declare function svgDataUri(svg: string): string;

/** Minimal Scryfall-shaped input for {@link optionsForCard}. */
export interface AnheloCardInput {
  name: string;
  type_line: string;
  color_identity: string[];
  cmc?: number;
}
/** Map a Scryfall card to Anhelo options (type precedence, colour identity, mana value). */
export declare function optionsForCard(
  card: AnheloCardInput,
  opts?: Partial<Omit<AnheloOptions, 'name' | 'colors' | 'type' | 'mv'>>,
): AnheloOptions;
export declare function primaryType(typeLine: string): AnheloType;
