import { useState } from 'react';
import ProblemHeader from './ProblemHeader';
import ScoreAnswer from './ScoreAnswer';
import { generateScoreProblem, type Problem } from '../generator/generate';
import { useStats } from './useStats';

const LEVELS = [1, 2, 3, 4, 5, 6];

// 本場・供託は入れず、符×翻の純粋な点数だけを問う
const OPTS = { extras: false } as const;

export default function ScoreQuiz() {
  const { stats, record } = useStats();
  const [level, setLevel] = useState(1);
  const [problem, setProblem] = useState<Problem>(() => generateScoreProblem(1, undefined, OPTS));

  function next(l = level) {
    setLevel(l);
    setProblem(generateScoreProblem(l, undefined, OPTS));
  }

  return (
    <div className="screen">
      <div className="level-tabs">
        {LEVELS.map((l) => (
          <button key={l} className={l === level ? 'active' : ''} onClick={() => next(l)}>
            Lv.{l}
          </button>
        ))}
      </div>

      <ProblemHeader problem={problem} prompt="このアガリは何点？" />

      <ScoreAnswer
        key={problem.id}
        problem={problem}
        onGraded={(ok) => record(ok, problem.tags)}
        onNext={() => next()}
      />

      <div className="stat-row">
        <span>正答 {stats.correct}/{stats.total}</span>
        <span>連続正解 {stats.streak}</span>
        <span>最高 {stats.bestStreak}</span>
      </div>
    </div>
  );
}
