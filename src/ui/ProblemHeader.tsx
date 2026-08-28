import HandView from './HandView';
import Tile from './Tile';
import type { Problem } from '../generator/generate';

interface ProblemHeaderProps {
  problem: Problem;
  prompt: string;
}

/** 局・親子・アガリ方法・ドラ表示牌・手牌（仕様 #11）。点数問題／分析問題で共用。 */
export default function ProblemHeader({ problem, prompt }: ProblemHeaderProps) {
  const showUra = problem.uraIndicators.length > 0 && problem.riichi;
  return (
    <div className="card">
      <div className="meta-row">
        <span>
          <b>{problem.roundLabel}</b>
          {problem.honba > 0 && <> ・{problem.honba}本場</>}
        </span>
        <span>
          あなた：<b>{problem.oya ? '親' : '子'}</b>（{problem.seatLabel}）
        </span>
        <span>
          アガリ：<b>{problem.tsumo ? 'ツモ' : 'ロン'}</b>
        </span>
        {problem.riichi && (
          <span>
            <b>リーチ</b>
          </span>
        )}
        {problem.kyotaku > 0 && <span>供託 {problem.kyotaku * 1000}点</span>}
        <span className="dora-inline">
          ドラ表示：
          {problem.doraIndicators.map((id, i) => (
            <Tile key={i} id={id} size="sm" />
          ))}
        </span>
        {showUra && (
          <span className="dora-inline">
            裏ドラ表示：
            {problem.uraIndicators.map((id, i) => (
              <Tile key={i} id={id} size="sm" />
            ))}
          </span>
        )}
      </div>

      <HandView
        concealed={problem.concealed}
        winningTile={problem.winningTile}
        melds={problem.melds}
        akaTiles={problem.akaTiles}
        tsumo={problem.tsumo}
        size="md"
      />

      <p style={{ textAlign: 'center', fontWeight: 700, margin: '10px 0 0' }}>{prompt}</p>
    </div>
  );
}
