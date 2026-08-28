import { useState } from 'react';
import ProblemHeader from './ProblemHeader';
import AnalysisAnswer from './AnalysisAnswer';
import { generateScoreProblem, type Problem } from '../generator/generate';
import { hashId } from '../generator/random';
import { useStats } from './useStats';

const LEVELS = [1, 2, 3, 4, 5, 6];

export default function AnalysisQuiz() {
  const { stats, record } = useStats();
  const [level, setLevel] = useState(2);
  const [problem, setProblem] = useState<Problem>(() => generateScoreProblem(2, undefined, { extras: false }));

  function next(l = level) {
    setLevel(l);
    setProblem(generateScoreProblem(l, undefined, { extras: false }));
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

      <ProblemHeader problem={problem} prompt="役・翻・符・点数を答えてください" />

      <AnalysisAnswer
        key={problem.id}
        result={problem.result}
        oya={problem.oya}
        tsumo={problem.tsumo}
        optionSeed={hashId(problem.id)}
        nextLabel="次の問題"
        onNext={() => next()}
        onGraded={(ok) => record(ok, problem.tags)}
      />

      <div className="stat-row">
        <span>正答 {stats.correct}/{stats.total}</span>
        <span>連続正解 {stats.streak}</span>
        <span>最高 {stats.bestStreak}</span>
      </div>
    </div>
  );
}
