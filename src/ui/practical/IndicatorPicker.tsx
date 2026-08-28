import Tile from '../Tile';
import TileKeypad from './TileKeypad';
import { doraFromIndicator, tileLabel, type TileId } from '../../core/tiles';

export default function IndicatorPicker({
  title,
  indicators,
  onChange,
  onClose,
}: {
  title: string;
  indicators: TileId[];
  onChange: (next: TileId[]) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{title}</b>
          <button onClick={onClose} aria-label="閉じる">✕</button>
        </div>
        <div className="modal-body" style={{ padding: 14 }}>
          <div className="ind-list">
            {indicators.length === 0 && <span style={{ color: '#999' }}>（なし）</span>}
            {indicators.map((id, i) => (
              <button
                key={i}
                className="ind-item"
                onClick={() => onChange(indicators.filter((_, j) => j !== i))}
                title="タップで削除"
              >
                <Tile id={id} size="sm" />
                <span className="ind-arrow">→ {tileLabel(doraFromIndicator(id))}</span>
                <span className="meld-chip-x">✕</span>
              </button>
            ))}
          </div>
          <p className="practice-hint" style={{ margin: '8px 0' }}>
            表示牌をタップして追加。もう一度タップで削除。
          </p>
          <TileKeypad size="sm" onPick={(id) => onChange([...indicators, id])} />
          <button className="primary-btn" onClick={onClose} style={{ marginTop: 10 }}>
            決定
          </button>
        </div>
      </div>
    </div>
  );
}
