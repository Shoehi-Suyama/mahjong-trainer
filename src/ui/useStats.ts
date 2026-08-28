import { useCallback, useEffect, useState } from 'react';

export interface TagStat {
  total: number;
  correct: number;
}

export interface Stats {
  total: number;
  correct: number;
  streak: number;
  bestStreak: number;
  byTag: Record<string, TagStat>;
  /** タイムアタック最高正解数（60秒） */
  bestTimeAttack: number;
}

const KEY = 'mahjong-trainer:stats:v1';

const empty: Stats = { total: 0, correct: 0, streak: 0, bestStreak: 0, byTag: {}, bestTimeAttack: 0 };

function load(): Stats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...empty };
    return { ...empty, ...(JSON.parse(raw) as Stats) };
  } catch {
    return { ...empty };
  }
}

export function useStats() {
  const [stats, setStats] = useState<Stats>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(stats));
    } catch {
      /* 保存に失敗しても致命的ではない */
    }
  }, [stats]);

  const record = useCallback((correct: boolean, tags: string[]) => {
    setStats((s) => {
      const byTag = { ...s.byTag };
      for (const tag of tags) {
        const cur = byTag[tag] ?? { total: 0, correct: 0 };
        byTag[tag] = { total: cur.total + 1, correct: cur.correct + (correct ? 1 : 0) };
      }
      const streak = correct ? s.streak + 1 : 0;
      return {
        ...s,
        total: s.total + 1,
        correct: s.correct + (correct ? 1 : 0),
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
        byTag,
      };
    });
  }, []);

  const recordTimeAttack = useCallback((correctCount: number) => {
    setStats((s) => ({ ...s, bestTimeAttack: Math.max(s.bestTimeAttack, correctCount) }));
  }, []);

  const reset = useCallback(() => setStats({ ...empty, byTag: {} }), []);

  return { stats, record, recordTimeAttack, reset };
}
