import { useState } from 'react';
import { parseDecklist, type CardEntry } from '@duplimancy/shared';
import { resolveCards } from '../lib/scryfall.ts';

export function DeckImport({ onImport }: { onImport: (cards: CardEntry[]) => void }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    const { lines, errors } = parseDecklist(text);
    if (!lines.length) return setStatus('No cards found in that list.');
    setBusy(true);
    try {
      const { found, missing } = await resolveCards(lines, (d, t) => setStatus(`Looking up cards… ${d}/${t}`));
      onImport(found.map(({ line, card }) => ({ id: crypto.randomUUID(), qty: line.qty, card, art: { kind: 'anhelo', salt: 0 }, frame: null })));
      const skipped = [...missing.map((m) => m.name), ...errors];
      setStatus(skipped.length ? `Added ${found.length}. Not found: ${skipped.join(', ')}` : `Added ${found.length} cards.`);
      setText('');
    } catch (err) {
      setStatus(`Lookup failed: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="import">
      <label htmlFor="decklist">Paste a decklist</label>
      <textarea id="decklist" rows={8} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={'1 Sol Ring\n1 Command Tower\n1x Llanowar Elves (M19) 314'} />
      <button type="button" onClick={run} disabled={busy || !text.trim()}>Add cards</button>
      {status && <p className="hint">{status}</p>}
    </section>
  );
}
