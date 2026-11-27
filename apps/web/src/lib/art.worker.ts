/// <reference lib="webworker" />
import { anhelo, type AnheloOptions } from '@duplimancy/anhelo';

// Anhelo keeps module-level state between calls, which is fine: each call is synchronous.
self.onmessage = (e: MessageEvent<{ id: number; opts: AnheloOptions }>) => {
  const { id, opts } = e.data;
  try {
    (self as DedicatedWorkerGlobalScope).postMessage({ id, svg: anhelo(opts).svg });
  } catch (err) {
    (self as DedicatedWorkerGlobalScope).postMessage({ id, error: String(err) });
  }
};
