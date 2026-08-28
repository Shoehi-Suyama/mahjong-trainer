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
        {r.han.yakuman === 0 && r.han.akaDora > 0 && <li>赤ドラ　{r.han.akaDora}翻</li>}
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
        {(() => {
          const hasExtra = r.score.honba > 0 || r.score.kyotaku > 0;
          const p = r.score.payment;
          let payLine: string;
          if (p.type === 'ron') {
            payLine = `${p.amount.toLocaleString()}点`;
          } else if (p.oya == null) {
            // 親ツモ: 子3人が同額
            payLine = `子はそれぞれ ${p.ko.toLocaleString()}点`;
          } else {
            // 子ツモ: 他の子2人と親
            payLine = `子はそれぞれ ${p.ko.toLocaleString()}点 ／ 親は ${p.oya.toLocaleString()}点`;
          }
          const tsumoTotal =
            p.type === 'tsumo'
              ? `（${hasExtra ? '素点' : '合計'} ${r.score.baseTotal.toLocaleString()}点）`
              : '';
          return (
            <>
              <li className={hasExtra ? '' : 'total-line'}>
                {payLine}
                {tsumoTotal}
              </li>
              {r.score.honba > 0 && (
                <li>
                  ＋ {r.score.honba}本場
                  {tsumo
                    ? `各家 +${r.score.honba * 100}点（計 ${r.score.honba * 300}点）`
                    : `${r.score.honba * 300}点`}
                </li>
              )}
              {r.score.kyotaku > 0 && <li>＋ 供託　{(r.score.kyotaku * 1000).toLocaleString()}点</li>}
              {hasExtra && (
                <li className="total-line">収入合計 {r.score.total.toLocaleString()}点</li>
              )}
            </>
          );
        })()}
      </ul>
    </div>
  );
}
