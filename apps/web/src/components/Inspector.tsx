import { useRef, useState } from 'react';
import type { CardEntry } from '@duplimancy/shared';
import { MAX_UPLOAD_BYTES } from '@duplimancy/shared';
import { FRAMES } from '../frames/index.ts';
import { api } from '../lib/api.ts';
import { CardPreview } from './CardPreview.tsx';

type Pal = 'balanced' | 'vivid' | 'pastel' | 'parchment';

export function Inspector({ entry, defaultFrame, slug, token, onChange, onRemove }: {
  entry: CardEntry; defaultFrame: string; slug: string | null; token: string | null;
  onChange: (e: CardEntry) => void; onRemove: () => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const salt = entry.art.kind === 'anhelo' ? entry.art.salt : 0;
  const pal: Pal = entry.art.kind === 'anhelo' ? entry.art.pal ?? 'balanced' : 'balanced';

  async function upload(f: File) {
    if (!slug || !token) return setMsg('Save the project before uploading art.');
    if (f.size > MAX_UPLOAD_BYTES) return setMsg('That image is over 15 MB.');
    const contentType = f.type as 'image/png' | 'image/jpeg' | 'image/webp';
    try {
      setMsg('Uploading…');
      const p = await api.presign(slug, token, { contentType, bytes: f.size });
      const res = await fetch(p.url, { method: 'PUT', headers: p.headers, body: f });
      if (!res.ok) throw new Error(`upload ${res.status}`);
      onChange({ ...entry, art: { kind: 'upload', key: p.key, url: p.publicUrl } });
      setMsg(null);
    } catch (err) {
      setMsg(`Upload failed: ${String(err)}`);
    }
  }

  return (
    <aside className="inspector">
      <CardPreview entry={entry} frameId={entry.frame ?? defaultFrame} />
      <label>Frame
        <select value={entry.frame ?? ''} onChange={(e) => onChange({ ...entry, frame: e.target.value || null })}>
          <option value="">Project default</option>
          {FRAMES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>
      <fieldset>
        <legend>Art</legend>
        <div className="row">
          <button type="button" onClick={() => onChange({ ...entry, art: { kind: 'anhelo', salt: salt + 1, pal } })}>Reroll</button>
          <button type="button" onClick={() => onChange({ ...entry, art: { kind: 'anhelo', salt: 0, pal } })}>Default art</button>
          <button type="button" onClick={() => file.current?.click()}>Upload…</button>
        </div>
        {entry.art.kind === 'anhelo' && (
          <label>Palette
            <select value={pal} onChange={(e) => onChange({ ...entry, art: { kind: 'anhelo', salt, pal: e.target.value as Pal } })}>
              <option value="balanced">Balanced</option><option value="vivid">Vivid</option>
              <option value="pastel">Pastel</option><option value="parchment">Aged parchment</option>
            </select>
          </label>
        )}
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
        {msg && <p className="hint">{msg}</p>}
      </fieldset>
      <label>Copies
        <input type="number" min={1} max={99} value={entry.qty}
          onChange={(e) => onChange({ ...entry, qty: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })} />
      </label>
      <button type="button" className="danger" onClick={onRemove}>Remove card</button>
    </aside>
  );
}
