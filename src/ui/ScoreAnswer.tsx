// 点数を答える共通パーツ（点数計算問題・苦手問題で共用）。
// 設定に応じて選択式 / 数字入力式（仕様 #12）。

import { useMemo, useState } from 'react';
import Explanation from './Explanation';
import { scoreChoices, type Problem } from '../generator/generate';
import { mulberry32, hashId } from '../generator/random';
import { useSettings } from './useSettings';

interface ScoreAnswerProps {
  problem: Problem;
  onGraded: (correct: boolean) => void;
  onNext: () => void;
  nextLabel?: string;
}

export default function ScoreAnswer({ problem, onGraded, onNext, nextLabel = '次の問題' }: ScoreAnswerProps) {
  const { settings } = useSettings();
  const [picked, setPicked] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const choices = useMemo(
    () => scoreChoices(problem.result.score.total, mulberry32(hashId(problem.id))),
    [problem],
  );
  const r = problem.result;
  const correct = r.score.total;
  const answered = picked !== null;
  const isCorrect = picked === correct;

  function grade(v: number) {
    if (answered) return;
    setPicked(v);
    onGraded(v === correct);
  }

  return (
    <>
      {!answered && settings.answerMode === 'input' ? (
        <div className="card input-answer">
          <label>
            点数
            <input
              type="number"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例: 3900"
              autoFocus
            />
            点
          </label>
          <button className="primary-btn" disabled={!input} onClick={() => grade(Number(input))}>
            回答する
          </button>
        </div>
      ) : (
        <div className="choices">
          {choices.map((c) => {
            const cls = !answered ? '' : c === correct ? 'correct' : c === picked ? 'wrong' : '';
            return (
              <button key={c} className={cls} disabled={answered} onClick={() => grade(c)}>
                {c.toLocaleString()}点
              </button>
            );
          })}
        </div>
      )}

      {answered && (
        <>
          <div className="card">
            <div className={`verdict ${isCorrect ? 'ok' : 'ng'}`}>{isCorrect ? '正解！' : '不正解'}</div>
            {!isCorrect && (
              <p>
                正解：<b>{correct.toLocaleString()}点</b> ／ あなたの回答：{picked?.toLocaleString()}点
              </p>
            )}
            <Explanation result={r} oya={problem.oya} tsumo={problem.tsumo} />
          </div>
          <button className="primary-btn" onClick={onNext}>
            {nextLabel}
          </button>
        </>
      )}
    </>
  );
}
