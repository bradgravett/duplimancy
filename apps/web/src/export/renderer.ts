import type { CardEntry } from '@duplimancy/shared';

/** 63×88 mm at 300 dpi. */
export const CARD_PX = { w: 744, h: 1039 } as const;

/**
 * Turns one card into a full-size PNG-ready canvas. The final implementation compiles
 * the card's Typst kit in the browser (typst.ts) → SVG → canvas, so print output and
 * kit uploads share one renderer. Until kits exist, {@link placeholderRenderer} stands in.
 */
export interface CardRenderer {
  render(entry: CardEntry, frameId: string, art: HTMLImageElement): Promise<OffscreenCanvas | HTMLCanvasElement>;
}
