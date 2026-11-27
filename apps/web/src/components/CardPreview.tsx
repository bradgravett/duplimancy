import { useEffect, useState } from 'react';
import type { CardEntry } from '@duplimancy/shared';
import { artUrl } from '../lib/art.ts';
import { frameFor } from '../frames/index.ts';

/** HTML/CSS preview of one card (CLAUDE.md: editor previews are HTML + CSS). */
export function CardPreview({ entry, frameId, load = true }: { entry: CardEntry; frameId: string; load?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!load) return;
    let live = true;
    artUrl(entry).then((u) => live && setSrc(u));
    return () => { live = false; };
  }, [entry.art, entry.card.name, load]);

  const c = entry.card;
  const face = c.card_faces?.[0] ?? c;
  const pt = face.power !== undefined ? `${face.power}/${face.toughness}` : face.loyalty ?? face.defense;
  return (
    <div className="card-wrap">
    <div className={`card ${frameFor(frameId).className}`}>
      <div className="card-title">
        <span className="card-name">{face.name}</span>
        <span className="card-cost">{face.mana_cost}</span>
      </div>
      <div className="card-art">{src && <img src={src} alt="" draggable={false} />}</div>
      <div className="card-type">{face.type_line ?? c.type_line}</div>
      <div className="card-text">
        {(face.oracle_text ?? '').split('\n').map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {pt && <div className="card-pt">{pt}</div>}
    </div>
    </div>
  );
}
