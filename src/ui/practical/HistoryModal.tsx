import type { HistoryEntry } from './useCalcHistory';

function fmtDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function HistoryModal({
  history,
  onRestore,
  onClear,
  onClose,
}: {
  history: HistoryEntry[];
  onRestore: (e: HistoryEntry) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="計算履歴">
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>計算履歴</b>
          <button onClick={onClose} aria-label="閉じる">✕</button>
        </div>
        <div className="modal-body" style={{ padding: 12 }}>
          {history.length === 0 && <p style={{ color: '#777' }}>まだ履歴がありません。</p>}
          {history.map((e, i) => {
            const s = e.summary;
            const rank =
              s.yakuman > 0 ? (s.yakuman >= 2 ? `${s.yakuman}倍役満` : '役満') : s.limit ? `${s.han}翻 ${s.limit}` : `${s.han}翻${s.fu}符`;
            return (
              <button key={i} className="hist-item" onClick={() => onRestore(e)}>
                <div className="hist-top">
                  <span>{fmtDate(e.at)}</span>
                  <b>{s.total.toLocaleString()}点</b>
                </div>
                <div className="hist-sub">
                  {s.oya ? '親' : '子'}・{s.tsumo ? 'ツモ' : 'ロン'}　{rank}
                </div>
                <div className="hist-yaku">{s.yaku.join('・') || '（役なし）'}</div>
              </button>
            );
          })}
          {history.length > 0 && (
            <button className="linkbtn" onClick={onClear} style={{ marginTop: 8 }}>
              履歴をすべて削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
