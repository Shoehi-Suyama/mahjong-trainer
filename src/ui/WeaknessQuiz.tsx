// 苦手問題モード（仕様 #40）。正答率の低いタグを優先して同条件の別牌姿を出題する。

import { useState } from 'react';
import ProblemHeader from './ProblemHeader';
import ScoreAnswer from './ScoreAnswer';
import { generateWeaknessProblem, type WeaknessResult } from '../generator/weakness';
import { useStats } from './useStats';
import { tagLabel } from './tagLabels';

export default function WeaknessQuiz() {
  const { stats, record } = useStats();
  const [state, setState] = useState<WeaknessResult | null>(() => generateWeaknessProblem(stats.byTag));

  function next() {
    setState(generateWeaknessProblem(stats.byTag));
  }

  if (!state) {
    return (
      <div className="screen">
        <div className="card">
          <p>
            まだ苦手データがありません。「点数計算問題」や「手牌分析問題」を
            10問ほど解くと、間違えやすい条件（親ロン・40符・七対子など）を
            自動で見つけて優先出題します。
          </p>
        </div>
      </div>
    );
  }

  const { problem, targetTag, accuracy } = state;

  return (
    <div className="screen">
      <div className="card" style={{ background: '#fff6e5', borderColor: '#e8c98a' }}>
        <b>苦手ポイント：{tagLabel(targetTag)}</b>
        <span style={{ color: '#777', marginLeft: 8 }}>
          （これまでの正答率 {Math.round(accuracy * 100)}%）
        </span>
      </div>

      <ProblemHeader problem={problem} prompt="このアガリは何点？" />

      <ScoreAnswer
        key={problem.id}
        problem={problem}
        onGraded={(ok) => record(ok, problem.tags)}
        onNext={next}
        nextLabel="次の苦手問題"
      />

      <div className="stat-row">
        <span>正答 {stats.correct}/{stats.total}</span>
        <span>連続正解 {stats.streak}</span>
      </div>
    </div>
  );
}
