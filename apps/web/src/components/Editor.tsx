import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyProject, MAX_CARDS, type CardEntry, type ProjectDoc } from '@duplimancy/shared';
import { api, ApiError, tokens } from '../lib/api.ts';
import { FRAMES } from '../frames/index.ts';
import { download, exportZip, type ExportKind } from '../export/export.ts';
import { CardGrid } from './CardGrid.tsx';
import { DeckImport } from './DeckImport.tsx';
import { Inspector } from './Inspector.tsx';

type Save = 'idle' | 'saving' | 'saved' | 'conflict' | 'error';
const SAVE_DELAY_MS = 1200;

export function Editor({ slug: initialSlug, onNavigate }: { slug: string | null; onNavigate: (slug: string) => void }) {
  const [slug, setSlug] = useState(initialSlug);
  const [doc, setDoc] = useState<ProjectDoc | null>(initialSlug ? null : emptyProject());
  const [version, setVersion] = useState(0);
  const [token, setToken] = useState(() => (initialSlug ? tokens.get(initialSlug) : null));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [save, setSave] = useState<Save>('idle');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const dirty = useRef(false);
  const canEdit = !slug || !!token;

  useEffect(() => {
    if (!initialSlug) return;
    api.get(initialSlug).then(
      (p) => { setDoc(p.doc); setVersion(p.version); },
      (err) => setLoadError(err instanceof ApiError && err.status === 404 ? 'This project does not exist (or was cleaned up after a long time unopened).' : String(err)),
    );
  }, [initialSlug]);

  // Debounced autosave. The first save of a new project creates it and assigns the slug.
  useEffect(() => {
    if (!doc || !dirty.current || !canEdit) return;
    const t = setTimeout(async () => {
      dirty.current = false;
      setSave('saving');
      try {
        if (!slug) {
          const created = await api.create(doc);
          tokens.set(created.slug, created.token);
          setToken(created.token);
          setSlug(created.slug);
          setVersion(1);
          history.replaceState(null, '', `/${created.slug}`);
        } else {
          const r = await api.save(slug, token!, version, doc);
          setVersion(r.version);
        }
        setSave('saved');
      } catch (err) {
        setSave(err instanceof ApiError && err.status === 409 ? 'conflict' : 'error');
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = useCallback((fn: (d: ProjectDoc) => ProjectDoc) => {
    dirty.current = true;
    setDoc((d) => (d ? fn(d) : d));
  }, []);

  async function duplicate() {
    if (!slug) return;
    const created = await api.duplicate(slug);
    tokens.set(created.slug, created.token);
    onNavigate(created.slug);
  }

  async function runExport(kind: ExportKind) {
    if (!doc) return;
    setExporting('Starting…');
    try {
      const blob = await exportZip(doc, kind, (d, t) => setExporting(`Rendering ${d}/${t}`));
      download(blob, `${slug ?? 'duplimancy'}-${kind}.zip`);
    } catch (err) {
      alert(`Export failed: ${String(err)}`);
    } finally {
      setExporting(null);
    }
  }

  if (loadError) return <main className="center"><p>{loadError}</p><a href="/">Start a new project</a></main>;
  if (!doc) return <main className="center"><p>Loading…</p></main>;

  const selected = doc.cards.find((c) => c.id === selectedId) ?? null;
  const count = doc.cards.reduce((n, c) => n + c.qty, 0);
  const updateCard = (e: CardEntry) => edit((d) => ({ ...d, cards: d.cards.map((c) => (c.id === e.id ? e : c)) }));

  return (
    <div className="app">
      <header className="toolbar">
        <h1>Duplimancy</h1>
        <input className="project-name" value={doc.name} disabled={!canEdit} aria-label="Project name"
          onChange={(e) => edit((d) => ({ ...d, name: e.target.value }))} />
        <label>Frame for all cards
          <select value={doc.defaultFrame} disabled={!canEdit} onChange={(e) => edit((d) => ({ ...d, defaultFrame: e.target.value }))}>
            {FRAMES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <button type="button" disabled={!canEdit} onClick={() => edit((d) => ({ ...d, cards: d.cards.map((c) => ({ ...c, frame: null })) }))}>
          Reset per-card frames
        </button>
        <span className="spacer" />
        <span className="hint">{count} cards · {saveLabel(save, slug)}</span>
        <button type="button" disabled={!!exporting || !doc.cards.length} onClick={() => runExport('print')}>Export PNGs</button>
        <button type="button" disabled={!!exporting || !doc.cards.length} onClick={() => runExport('tts')}>Export TTS sheets</button>
      </header>

      {exporting && <div className="banner">{exporting}</div>}
      {!canEdit && (
        <div className="banner">
          You're viewing this project read-only: its edit key isn't saved in this browser.{' '}
          <button type="button" onClick={duplicate}>Duplicate it to edit</button>
        </div>
      )}
      {save === 'conflict' && <div className="banner">This project was changed in another tab. Reload to get the latest version.</div>}

      <div className="workspace">
        <main>
          {canEdit && doc.cards.length < MAX_CARDS && (
            <DeckImport onImport={(cards) => edit((d) => ({ ...d, cards: [...d.cards, ...cards].slice(0, MAX_CARDS) }))} />
          )}
          <CardGrid cards={doc.cards} defaultFrame={doc.defaultFrame} selectedId={selectedId} onSelect={setSelectedId} />
        </main>
        {selected && canEdit && (
          <Inspector entry={selected} defaultFrame={doc.defaultFrame} slug={slug} token={token} onChange={updateCard}
            onRemove={() => { setSelectedId(null); edit((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== selected.id) })); }} />
        )}
      </div>
    </div>
  );
}

function saveLabel(s: Save, slug: string | null) {
  if (!slug && s === 'idle') return 'not saved yet';
  return { idle: 'saved', saving: 'saving…', saved: 'saved', conflict: 'conflict', error: 'save failed' }[s];
}
