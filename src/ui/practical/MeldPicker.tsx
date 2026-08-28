import { useState } from 'react';
import Tile from '../Tile';
import TileKeypad from './TileKeypad';
import { type TileId, tile, isHonorId, tileLabel } from '../../core/tiles';
import type { Meld } from '../../core/hand';

type MeldType = 'chi' | 'pon' | 'minkan' | 'ankan' | 'kakan';

const TYPES: { key: MeldType; label: string; hint: string }[] = [
  { key: 'chi', label: 'チー', hint: '順子の一番小さい牌を選ぶ' },
  { key: 'pon', label: 'ポン', hint: '刻子の牌を選ぶ' },
  { key: 'minkan', label: '明槓', hint: '大明槓／加槓の牌を選ぶ' },
  { key: 'ankan', label: '暗槓', hint: '暗槓の牌を選ぶ' },
];

export default function MeldPicker({
  onDone,
  onClose,
}: {
  onDone: (m: Meld) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<MeldType | null>(null);

  function pick(id: TileId) {
    if (!type) return;
    if (type === 'chi') {
      if (isHonorId(id)) return;
      const { suit, value } = tile(id);
      if (value > 7) return;
      onDone({
        kind: 'chi',
        tiles: [id, `${suit}${value + 1}` as TileId, `${suit}${value + 2}` as TileId],
        open: true,
      });
      return;
    }
    if (type === 'pon') {
      onDone({ kind: 'pon', tiles: [id, id, id], open: true });
      return;
    }
    // 槓
    onDone({ kind: 'kan', tiles: [id, id, id, id], open: type !== 'ankan' });
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="副露を追加">
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>副露を追加</b>
          <button onClick={onClose} aria-label="閉じる">✕</button>
        </div>
        <div className="modal-body" style={{ padding: 14 }}>
          <div className="chip-group" style={{ marginBottom: 10 }}>
            {TYPES.map((t) => (
              <button
                key={t.key}
                className={`chip${type === t.key ? ' on' : ''}`}
                onClick={() => setType(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {type && (
            <>
              <p className="practice-hint" style={{ margin: '4px 0 8px' }}>
                {TYPES.find((t) => t.key === type)!.hint}
              </p>
              <TileKeypad
                size="sm"
                onPick={pick}
                disabled={(id) => type === 'chi' && (isHonorId(id) || tile(id).value > 7)}
              />
              {type === 'chi' && (
                <p style={{ fontSize: '0.8rem', color: '#777' }}>
                  例：3萬を選ぶと 3萬4萬5萬 の順子になります
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function meldLabel(m: Meld): string {
  const k =
    m.kind === 'chi'
      ? 'チー'
      : m.kind === 'pon'
        ? 'ポン'
        : m.open
          ? '明槓'
          : '暗槓';
  return `${k} ${m.tiles.map(tileLabel).join('')}`;
}

export function MeldChips({ melds, onRemove }: { melds: Meld[]; onRemove: (i: number) => void }) {
  if (melds.length === 0) return null;
  return (
    <div className="meld-chips">
      {melds.map((m, i) => (
        <button key={i} className="meld-chip" onClick={() => onRemove(i)} title="タップで削除">
          <span className="meld-chip-tiles">
            {m.tiles.map((id, j) => (
              <Tile key={j} id={id} size="sm" dimmed={m.open} />
            ))}
          </span>
          <span className="meld-chip-x">✕</span>
        </button>
      ))}
    </div>
  );
}
