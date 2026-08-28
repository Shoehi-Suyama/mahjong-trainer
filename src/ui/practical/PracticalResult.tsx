import { useState } from 'react';
import Explanation from '../Explanation';
import type { AnalyzeResult } from '../../core/analyze';

function payoutLines(r: AnalyzeResult): string[] {
  const p = r.score.payment;
  if (p.type === 'ron') {
    return [`放銃者の支払い ${p.amount.toLocaleString()}点`];
  }
  if (p.oya == null) {
    return [`子はそれぞれ ${p.ko.toLocaleString()}点（${(p.ko * 3).toLocaleString()}点）`];
  }
  return [
    `子はそれぞれ ${p.ko.toLocaleString()}点`,
    `親は ${p.oya.toLocaleString()}点`,
  ];
}

export function resultToText(r: AnalyzeResult, oya: boolean, tsumo: boolean): string {
  const method = `${oya ? '親' : '子'}・${tsumo ? 'ツモ' : 'ロン'}`;
  const head = r.han.yakuman > 0 ? (r.han.yakuman >= 2 ? `${r.han.yakuman}倍役満` : '役満') : r.score.limit ? `${r.han.total}翻 ${r.score.limit}` : `${r.han.total}翻 ${r.fu.rounded}符`;
  const yaku = r.han.yaku.map((y) => `${y.name} ${y.yakuman ? '役満' : `${y.han}翻`}`);
  if (r.han.yakuman === 0) {
    if (r.han.dora > 0) yaku.push(`ドラ ${r.han.dora}翻`);
    if (r.han.akaDora > 0) yaku.push(`赤ドラ ${r.han.akaDora}翻`);
    if (r.han.uraDora > 0) yaku.push(`裏ドラ ${r.han.uraDora}翻`);
  }
  const lines = [method, head, ...yaku];
  lines.push(`アガリ点 ${r.score.baseTotal.toLocaleString()}点`);
  if (r.score.honba > 0) lines.push(`${r.score.honba}本場 +${(r.score.honba * 300).toLocaleString()}点`);
  if (r.score.kyotaku > 0) lines.push(`供託 ${(r.score.kyotaku * 1000).toLocaleString()}点`);
  lines.push(`獲得合計 ${r.score.total.toLocaleString()}点`);
  return lines.join('\n');
}

interface Props {
  result: AnalyzeResult;
  oya: boolean;
  tsumo: boolean;
  onNext: () => void;
  onClose: () => void;
}

export default function PracticalResult({ result: r, oya, tsumo, onNext, onClose }: Props) {
  const [detail, setDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  const method = `${oya ? '親' : '子'}・${tsumo ? 'ツモ' : 'ロン'}`;
  const headline =
    r.han.yakuman > 0
      ? r.han.yakuman >= 2
        ? `${r.han.yakuman}倍役満`
        : '役満'
      : r.score.limit
        ? `${r.han.total}翻 ${r.score.limit}`
        : `${r.fu.rounded}符 ${r.han.total}翻`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(resultToText(r, oya, tsumo));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="計算結果">
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>計算結果</b>
          <button onClick={onClose} aria-label="閉じる">✕</button>
        </div>
        <div className="modal-body" style={{ padding: 16 }}>
          {!r.valid ? (
            <p className="hint">役がありません。この牌姿ではアガれません（アガリ牌・条件を確認してください）。</p>
          ) : (
            <>
              <div className="result-hero">
                <div className="result-total">{r.score.total.toLocaleString()}点</div>
                <div className="result-method">
                  {method}　{headline}
                </div>
              </div>

              <ul className="result-payout">
                {payoutLines(r).map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
                {(r.score.honba > 0 || r.score.kyotaku > 0) && (
                  <>
                    <li className="result-sep">アガリ点 {r.score.baseTotal.toLocaleString()}点</li>
                    {r.score.honba > 0 && (
                      <li>
                        {r.score.honba}本場　+{(r.score.honba * 300).toLocaleString()}点
                        {tsumo ? `（各家 +${r.score.honba * 100}点）` : ''}
                      </li>
                    )}
                    {r.score.kyotaku > 0 && <li>供託　{(r.score.kyotaku * 1000).toLocaleString()}点</li>}
                    <li className="result-sep">獲得合計 {r.score.total.toLocaleString()}点</li>
                  </>
                )}
              </ul>

              <button className="linkbtn" onClick={() => setDetail((v) => !v)}>
                {detail ? '詳細を閉じる' : '詳細を見る'}
              </button>
              {detail && (
                <div className="card" style={{ marginTop: 6 }}>
                  <Explanation result={r} oya={oya} tsumo={tsumo} />
                </div>
              )}

              <div className="practice-actions" style={{ marginTop: 12 }}>
                <button className="ghost-btn" onClick={copy}>
                  {copied ? 'コピーしました' : '結果をコピー'}
                </button>
              </div>
            </>
          )}

          <div className="practice-actions" style={{ marginTop: 14 }}>
            <button className="primary-btn" onClick={onNext}>
              次のアガリ
            </button>
            <button className="ghost-btn" onClick={onClose}>
              入力に戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
