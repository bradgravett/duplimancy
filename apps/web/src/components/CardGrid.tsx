import { memo } from 'react';
import type { CardEntry } from '@duplimancy/shared';
import { useVisible } from '../lib/useVisible.ts';
import { CardPreview } from './CardPreview.tsx';

const Tile = memo(function Tile({ entry, frameId, selected, onSelect }: {
  entry: CardEntry; frameId: string; selected: boolean; onSelect: (id: string) => void;
}) {
  const [ref, visible] = useVisible<HTMLButtonElement>();
  return (
    <button ref={ref} type="button" className={`tile${selected ? ' selected' : ''}`} onClick={() => onSelect(entry.id)}>
      <CardPreview entry={entry} frameId={frameId} load={visible} />
      {entry.qty > 1 && <span className="qty">×{entry.qty}</span>}
    </button>
  );
});

export function CardGrid({ cards, defaultFrame, selectedId, onSelect }: {
  cards: CardEntry[]; defaultFrame: string; selectedId: string | null; onSelect: (id: string) => void;
}) {
  return (
    <div className="grid">
      {cards.map((e) => (
        <Tile key={e.id} entry={e} frameId={e.frame ?? defaultFrame} selected={e.id === selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}
