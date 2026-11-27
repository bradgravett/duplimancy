// TEMPORARY: canvas drawing of the built-in "plain" frame so export works end to end.
// Replace with the typst.ts kit renderer; don't grow this into a second frame engine.
import type { CardEntry } from '@duplimancy/shared';
import { CARD_PX, type CardRenderer } from './renderer.ts';

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxY: number) {
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        if (y > maxY) return;
        ctx.fillText(line, x, y);
        y += lh;
        line = word;
      } else line = test;
    }
    if (y > maxY) return;
    ctx.fillText(line, x, y);
    y += lh * 1.35;
  }
}

export const placeholderRenderer: CardRenderer = {
  async render(entry: CardEntry, _frameId: string, art: HTMLImageElement) {
    const { w, h } = CARD_PX;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d')!;
    const face = entry.card.card_faces?.[0] ?? entry.card;
    const m = 36;
    ctx.fillStyle = '#16161a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3efe6';
    ctx.fillRect(m, m, w - 2 * m, h - 2 * m);
    // art box: Anhelo's 1000×740 aspect, cover-fit for uploads
    const ax = m + 14, ay = m + 74, aw = w - 2 * (m + 14), ah = Math.round(aw * 0.74);
    const s = Math.max(aw / art.naturalWidth, ah / art.naturalHeight);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ax, ay, aw, ah);
    ctx.clip();
    ctx.drawImage(art, ax + (aw - art.naturalWidth * s) / 2, ay + (ah - art.naturalHeight * s) / 2, art.naturalWidth * s, art.naturalHeight * s);
    ctx.restore();
    ctx.fillStyle = '#16161a';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 38px Georgia, serif';
    ctx.fillText(face.name, ax, m + 54, aw - 160);
    ctx.textAlign = 'right';
    ctx.font = '30px Georgia, serif';
    ctx.fillText(face.mana_cost ?? '', ax + aw, m + 54);
    ctx.textAlign = 'left';
    ctx.font = 'italic 28px Georgia, serif';
    ctx.fillText(face.type_line ?? entry.card.type_line, ax, ay + ah + 44, aw);
    ctx.font = '26px Georgia, serif';
    wrap(ctx, face.oracle_text ?? '', ax, ay + ah + 96, aw, 32, h - m - 70);
    const pt = face.power !== undefined ? `${face.power}/${face.toughness}` : face.loyalty ?? face.defense;
    if (pt) {
      ctx.textAlign = 'right';
      ctx.font = '700 36px Georgia, serif';
      ctx.fillText(pt, ax + aw, h - m - 24);
    }
    return cv;
  },
};
