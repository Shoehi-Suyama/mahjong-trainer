import { useEffect } from 'react';
import ScoreTable from './ScoreTable';

export default function ScoreTableModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="点数早見表">
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>点数早見表</b>
          <button onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <ScoreTable />
        </div>
      </div>
    </div>
  );
}
