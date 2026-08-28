import { useState } from 'react';
import FuBreakdown from './FuBreakdown';
import { useSettings } from './useSettings';
import type { AnalyzeResult } from '../core/analyze';

interface ExplanationProps {
  result: AnalyzeResult;
  oya: boolean;
  tsumo: boolean;
}

/** 正解の計算過程（仕様 #15, #16）。点数計算問題・手牌分析問題で共用。 */
export default function Explanation({ result: r, oya, tsumo }: ExplanationProps) {
  const { settings } = useSettings();
  const [showFu, setShowFu] = useState(settings.fuDetailDefaultOpen);
  const method = tsumo ? 'ツモ' : 'ロン';

  return (
    <div className="explain">
      <h4>【役】</h4>
      <ul>
        {r.han.yaku.map((y, i) => (
          <li key={i}>
            {y.name}　{y.yakuman ? '役満' : `${y.han}翻`}
          </li>
        ))}
        {r.han.yakuman === 0 && r.han.dora > 0 && <li>ドラ　{r.han.dora}翻</li>}
        {r.han.yakuman === 0 && r.han.uraDora > 0 && <li>裏ドラ　{r.han.uraDora}翻</li>}
        <li className="total-line">
          {r.han.yakuman > 0
            ? r.han.yakuman >= 2
              ? `${r.han.yakuman}倍役満`
              : '役満'
            : `合計 ${r.han.total}翻${r.score.limit ? `（${r.score.limit}）` : ''}`}
        </li>
      </ul>

      <h4>【符】</h4>
      {r.score.limit || r.fu.fixed ? (
        <FuBreakdown result={r} />
      ) : (
        <>
          <button className="linkbtn" onClick={() => setShowFu((v) => !v)}>
            {showFu ? '符の内訳を閉じる' : '詳しい計算を見る'}
          </button>
          {showFu ? (
            <FuBreakdown result={r} alwaysOpen />
          ) : (
            <p style={{ margin: '4px 0' }}>{r.fu.rounded}符</p>
          )}
        </>
      )}

      <h4>【点数】</h4>
      <ul>
        <li>
          {`${oya ? '親' : '子'}・${method}　`}
          {r.han.yakuman > 0
            ? r.han.yakuman >= 2
              ? `${r.han.yakuman}倍役満`
              : '役満'
            : r.score.limit
              ? `${r.han.total}翻 ${r.score.limit}`
              : `${r.fu.rounded}符${r.han.total}翻`}
        </li>
        <li className="total-line">
          {r.score.display}
          {r.score.payment.type === 'tsumo' && `（合計 ${r.score.total.toLocaleString()}点）`}
        </li>
      </ul>
    </div>
  );
}
