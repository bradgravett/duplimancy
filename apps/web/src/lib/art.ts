import { optionsForCard, type AnheloOptions } from '@duplimancy/anhelo';
import type { CardEntry } from '@duplimancy/shared';

/**
 * Anhelo runs in a small worker pool so a 800-card list doesn't block the UI.
 * Results are cached as object URLs keyed by the exact options (art is deterministic).
 */
const POOL_SIZE = Math.min(4, Math.max(1, (navigator.hardwareConcurrency ?? 2) - 1));
const workers = Array.from({ length: POOL_SIZE }, () => new Worker(new URL('./art.worker.ts', import.meta.url), { type: 'module' }));
const pending = new Map<number, { resolve: (svg: string) => void; reject: (e: Error) => void }>();
let nextId = 0;
for (const w of workers) {
  w.onmessage = (e: MessageEvent<{ id: number; svg?: string; error?: string }>) => {
    const p = pending.get(e.data.id);
    pending.delete(e.data.id);
    if (e.data.svg !== undefined) p?.resolve(e.data.svg);
    else p?.reject(new Error(e.data.error));
  };
}

function generate(opts: AnheloOptions): Promise<string> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    workers[id % POOL_SIZE]!.postMessage({ id, opts });
  });
}

const cache = new Map<string, Promise<string>>();
const MAX_CACHE = 1500;

export function anheloOptions(entry: CardEntry): AnheloOptions | null {
  if (entry.art.kind !== 'anhelo') return null;
  return optionsForCard(entry.card, { salt: entry.art.salt, pal: entry.art.pal ?? 'balanced' });
}

/** Object URL for the entry's art (generated or uploaded). */
export function artUrl(entry: CardEntry): Promise<string> {
  if (entry.art.kind === 'upload') return Promise.resolve(entry.art.url);
  const opts = anheloOptions(entry)!;
  const key = JSON.stringify(opts);
  let hit = cache.get(key);
  if (!hit) {
    hit = generate(opts).then((svg) => URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
    cache.set(key, hit);
    if (cache.size > MAX_CACHE) {
      const [oldKey, old] = cache.entries().next().value!;
      cache.delete(oldKey);
      old.then((u) => URL.revokeObjectURL(u));
    }
  }
  return hit;
}
