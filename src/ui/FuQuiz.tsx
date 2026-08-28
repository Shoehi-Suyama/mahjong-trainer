// 符計算練習モード（仕様 #44）。手牌の符だけを当てる。

import { useMemo, useState } from 'react';
import ProblemHeader from './ProblemHeader';
import FuBreakdown from './FuBreakdown';
import { generateScoreProblem, type Problem } from '../generator/generate';
import { mulberry32, hashId, shuffle } from '../generator/random';
import { useStats } from './useStats';
import { useSettings } from './useSettings';

const LEVELS = [2, 3, 4, 5, 6];
const FU_OPTIONS = [20, 25, 30, 40, 50, 60, 70, 80];

function makeFuProblem(level: number): Problem {
  for (let i = 0; i < 200; i++) {
    const p = generateScoreProblem(level, undefined, { extras: false, tileExtras: false });
    if (!p.result.score.limit) return p; // 満貫以上は符不問なので除外
  }
  return generateScoreProblem(level, undefined, { extras: false, tileExtras: false });
}

export default function FuQuiz() {
  const { stats, record } = useStats();
  const { settings } = useSettings();
  const [level, setLevel] = useState(3);
  const [problem, setProblem] = useState<Problem>(() => makeFuProblem(3));
  const [picked, setPicked] = useState<number | null>(null);
  const [input, setInput] = useState('');

  const r = problem.result;
  const correct = r.fu.rounded;
  const answered = picked !== null;

  const choices = useMemo(() => {
    const rng = mulberry32(hashId(problem.id));
    const set = new Set<number>([correct]);
    // 正解の近傍を優先
    const near = FU_OPTIONS.filter((f) => Math.abs(f - correct) <= 20);
    for (const f of shuffle(rng, near)) {
      if (set.size >= 4) break;
      set.add(f);
    }
    for (const f of shuffle(rng, FU_OPTIONS)) {
      if (set.size >= 4) break;
      set.add(f);
    }
    return [...set].sort((a, b) => a - b);
  }, [problem, correct]);

  function choose(v: number) {
    if (answered) return;
    setPicked(v);
    record(v === correct, [...new Set(['fu', ...problem.tags])]);
  }

  function next(l = level) {
    setLevel(l);
    setPicked(null);
    setInput('');
    setProblem(makeFuProblem(l));
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

      <ProblemHeader problem={problem} prompt="この手牌の符は？" />

      {!answered && settings.answerMode === 'input' ? (
        <div className="card input-answer">
          <label>
            符
            <input
              type="number"
              inputMode="numeric"
              step={10}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例: 40"
              autoFocus
            />
            符
          </label>
          <button className="primary-btn" disabled={!input} onClick={() => choose(Number(input))}>
            回答する
          </button>
        </div>
      ) : (
        <div className="choices">
          {choices.map((c) => {
            const cls = !answered ? '' : c === correct ? 'correct' : c === picked ? 'wrong' : '';
            return (
              <button key={c} className={cls} disabled={answered} onClick={() => choose(c)}>
                {c}符
              </button>
            );
          })}
        </div>
      )}

      {answered && (
        <>
          <div className="card">
            <div className={`verdict ${picked === correct ? 'ok' : 'ng'}`}>
              {picked === correct ? '正解！' : '不正解'}
            </div>
            {picked !== correct && (
              <p>
                正解：<b>{correct}符</b> ／ あなたの回答：{picked}符
              </p>
            )}
            <h4 style={{ margin: '10px 0 4px', fontSize: '0.85rem', color: '#666' }}>符の内訳</h4>
            <FuBreakdown result={r} alwaysOpen />
          </div>
          <button className="primary-btn" onClick={() => next()}>
            次の問題
          </button>
          <div className="stat-row">
            <span>符の正答 {stats.byTag.fu ? `${stats.byTag.fu.correct}/${stats.byTag.fu.total}` : '0/0'}</span>
          </div>
        </>
      )}
    </div>
  );
}
