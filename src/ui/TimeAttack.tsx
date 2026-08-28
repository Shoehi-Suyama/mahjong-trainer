// タイムアタック（仕様 #42）。60秒で「このアガリは何点？」を何問正解できるか。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProblemHeader from './ProblemHeader';
import { generateScoreProblem, scoreChoices, type Problem } from '../generator/generate';
import { mulberry32, hashId } from '../generator/random';
import { useStats } from './useStats';

const DURATION = 60_000;
const LEVELS = [1, 2, 3];

type Phase = 'ready' | 'running' | 'done';

export default function TimeAttack() {
  const { stats, record, recordTimeAttack } = useStats();
  const [level, setLevel] = useState(2);
  const [phase, setPhase] = useState<Phase>('ready');
  const [problem, setProblem] = useState<Problem | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(DURATION);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const deadlineRef = useRef(0);
  const qStartRef = useRef(0);
  const totalTimeRef = useRef(0);
  const advanceRef = useRef<number | undefined>(undefined);
  const correctRef = useRef(0);

  const nextProblem = useCallback((l: number) => {
    setPicked(null);
    setProblem(generateScoreProblem(l, undefined, { extras: false }));
    qStartRef.current = performance.now();
  }, []);

  const finish = useCallback(() => {
    window.clearTimeout(advanceRef.current);
    setProblem(null);
    setPhase('done');
    recordTimeAttack(correctRef.current);
  }, [recordTimeAttack]);

  function start(l = level) {
    setLevel(l);
    correctRef.current = 0;
    setCorrectCount(0);
    setWrongCount(0);
    totalTimeRef.current = 0;
    deadlineRef.current = Date.now() + DURATION;
    setRemaining(DURATION);
    setPhase('running');
    nextProblem(l);
  }

  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      const left = deadlineRef.current - Date.now();
      if (left <= 0) {
        setRemaining(0);
        finish();
      } else {
        setRemaining(left);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, finish]);

  useEffect(() => () => window.clearTimeout(advanceRef.current), []);

  const choices = useMemo(
    () => (problem ? scoreChoices(problem.result.score.total, mulberry32(hashId(problem.id))) : []),
    [problem],
  );

  function choose(v: number) {
    if (picked !== null || !problem || phase !== 'running') return;
    setPicked(v);
    totalTimeRef.current += performance.now() - qStartRef.current;
    const ok = v === problem.result.score.total;
    if (ok) {
      correctRef.current += 1;
      setCorrectCount(correctRef.current);
    } else {
      setWrongCount((c) => c + 1);
    }
    record(ok, [...new Set([...problem.tags, 'timeattack'])]);
    advanceRef.current = window.setTimeout(() => {
      if (Date.now() < deadlineRef.current) nextProblem(level);
    }, 550);
  }

  const answered = correctCount + wrongCount;
  const secs = Math.ceil(remaining / 1000);

  if (phase === 'ready') {
    return (
      <div className="screen">
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>タイムアタック</h3>
          <p>60秒で「このアガリは何点？」に何問答えられるか挑戦。</p>
          <p style={{ color: '#777' }}>これまでの最高：{stats.bestTimeAttack} 問正解</p>
        </div>
        <div className="level-tabs" style={{ justifyContent: 'center' }}>
          {LEVELS.map((l) => (
            <button key={l} className={l === level ? 'active' : ''} onClick={() => setLevel(l)}>
              Lv.{l}
            </button>
          ))}
        </div>
        <button className="primary-btn" onClick={() => start()}>
          スタート
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const avg = answered ? totalTimeRef.current / answered / 1000 : 0;
    const rate = answered ? Math.round((correctCount / answered) * 100) : 0;
    const isBest = correctCount >= stats.bestTimeAttack && correctCount > 0;
    return (
      <div className="screen">
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>終了！</h3>
          {isBest && <p className="verdict ok">自己ベスト更新！</p>}
          <p style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0' }}>{correctCount} 問正解</p>
          <div className="stat-row" style={{ justifyContent: 'center' }}>
            <span>不正解 {wrongCount}</span>
            <span>正答率 {rate}%</span>
            <span>平均 {avg.toFixed(1)}秒/問</span>
          </div>
          <p style={{ color: '#777' }}>最高記録：{stats.bestTimeAttack} 問</p>
        </div>
        <button className="primary-btn" onClick={() => start()}>
          もう一度
        </button>
        <button className="ghost-btn" style={{ width: '100%' }} onClick={() => setPhase('ready')}>
          レベルを変える
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="ta-bar">
        <span className={secs <= 10 ? 'ta-time danger' : 'ta-time'}>残り {secs} 秒</span>
        <span>正解 {correctCount}／{answered}</span>
      </div>

      {problem && (
        <>
          <ProblemHeader problem={problem} prompt="このアガリは何点？" />
          <div className="choices">
            {choices.map((c) => {
              const cls =
                picked === null
                  ? ''
                  : c === problem.result.score.total
                    ? 'correct'
                    : c === picked
                      ? 'wrong'
                      : '';
              return (
                <button key={c} className={cls} disabled={picked !== null} onClick={() => choose(c)}>
                  {c.toLocaleString()}点
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
