import { Zip, ZipPassThrough } from 'fflate';
import type { ProjectDoc } from '@duplimancy/shared';
import { artUrl } from '../lib/art.ts';
import { placeholderRenderer } from './placeholder.ts';
import { CARD_PX, type CardRenderer } from './renderer.ts';

/** Tabletop Simulator deck sheets: 10×7 grid, slot 70 reserved for TTS's hidden-card face. */
export const TTS = { cols: 10, rows: 7, perSheet: 69, cellW: 409, cellH: 571 } as const;

export type ExportKind = 'print' | 'tts';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Uploaded art comes from Spaces; the bucket needs CORS for this origin or the canvas is tainted.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

const toBlob = (cv: HTMLCanvasElement | OffscreenCanvas) =>
  cv instanceof OffscreenCanvas ? cv.convertToBlob({ type: 'image/png' })
    : new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));

const safe = (s: string) => s.replace(/[^\w\- ,']+/g, '').trim().slice(0, 80) || 'card';

/**
 * Renders every card and streams the PNGs into a zip, one card at a time so an
 * 800-card cube doesn't hold 800 canvases in memory.
 */
export async function exportZip(
  doc: ProjectDoc,
  kind: ExportKind,
  onProgress: (done: number, total: number) => void,
  renderer: CardRenderer = placeholderRenderer,
): Promise<Blob> {
  const parts: Blob[] = [];
  let zipErr: Error | null = null;
  const zip = new Zip((err, chunk) => {
    if (err) zipErr = err;
    else parts.push(new Blob([chunk]));
  });
  const add = async (name: string, blob: Blob) => {
    const f = new ZipPassThrough(name); // PNGs are already compressed
    zip.add(f);
    f.push(new Uint8Array(await blob.arrayBuffer()), true);
  };

  // Expand quantities: 3 Islands = 3 slots on a TTS sheet, but one print PNG with a count.
  const total = doc.cards.length;
  let sheet: HTMLCanvasElement | null = null;
  let slot = 0;
  let sheetNo = 1;
  const flushSheet = async () => {
    if (!sheet) return;
    await add(`tts/sheet-${String(sheetNo++).padStart(2, '0')}.png`, await toBlob(sheet));
    sheet = null;
    slot = 0;
  };

  for (let i = 0; i < total; i++) {
    const e = doc.cards[i]!;
    const art = await loadImage(await artUrl(e));
    const cv = await renderer.render(e, e.frame ?? doc.defaultFrame, art);
    if (kind === 'print') {
      await add(`print/${String(i + 1).padStart(3, '0')} ${safe(e.card.name)}${e.qty > 1 ? ` x${e.qty}` : ''}.png`, await toBlob(cv));
    } else {
      for (let q = 0; q < e.qty; q++) {
        if (!sheet) {
          sheet = document.createElement('canvas');
          sheet.width = TTS.cols * TTS.cellW;
          sheet.height = TTS.rows * TTS.cellH;
        }
        const x = (slot % TTS.cols) * TTS.cellW, y = Math.floor(slot / TTS.cols) * TTS.cellH;
        sheet.getContext('2d')!.drawImage(cv as CanvasImageSource, 0, 0, CARD_PX.w, CARD_PX.h, x, y, TTS.cellW, TTS.cellH);
        if (++slot === TTS.perSheet) await flushSheet();
      }
    }
    onProgress(i + 1, total);
    // yield so the progress bar paints
    await new Promise((r) => setTimeout(r));
  }
  await flushSheet();
  zip.end();
  if (zipErr) throw zipErr;
  return new Blob(parts, { type: 'application/zip' });
}

export function download(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
