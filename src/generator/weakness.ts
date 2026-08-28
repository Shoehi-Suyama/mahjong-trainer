// 苦手問題モード（仕様 #39, #40）。回答履歴のタグ別正答率から弱点を選び、
// 同じ特徴を持つ別の牌姿を優先出題する。

import { type Rng, mulberry32, pick, randInt } from './random';
import { generateScoreProblem, type Problem } from './generate';

export interface TagStatLike {
  total: number;
  correct: number;
}

export interface WeakTag {
  tag: string;
  accuracy: number;
  total: number;
}

// 苦手問題では出題しないタグ（本場・供託は点数計算問題では扱わない）
const EXCLUDED_TAGS = new Set(['honba', 'kyotaku']);

/** サンプル数が十分で正答率が低いタグを、低い順に返す。 */
export function pickWeakTags(
  byTag: Record<string, TagStatLike>,
  minSamples = 3,
  threshold = 0.75,
): WeakTag[] {
  return Object.entries(byTag)
    .filter(([tag, s]) => s.total >= minSamples && !EXCLUDED_TAGS.has(tag))
    .map(([tag, s]) => ({ tag, accuracy: s.correct / s.total, total: s.total }))
    .filter((w) => w.accuracy < threshold)
    .sort((a, b) => a.accuracy - b.accuracy);
}

// タグ → 出やすいレベル
const TAG_LEVELS: Record<string, number[]> = {
  fu: [4], dora: [3, 4], chiitoitsu: [3, 5], toitoi: [3, 4],
  sanshoku: [2, 3], ittsuu: [2, 3], honitsu: [5], chinitsu: [5],
  chanta: [3, 4], iipeikou: [2, 3], sanankou: [4],
  meld: [6], kuitan: [6],
  aka: [3, 4], ura: [3, 4],
  pinfu: [2, 3], riichi: [1, 2], yakuhai: [1, 2],
  tsumo: [1, 2, 3], ron: [1, 2, 3], oya: [2, 3, 4], child: [2, 3, 4],
  basic: [1, 2],
};

export interface WeaknessResult {
  problem: Problem;
  targetTag: string;
  accuracy: number;
}

/** 弱点タグに一致する問題を生成。データ不足なら null。 */
export function generateWeaknessProblem(
  byTag: Record<string, TagStatLike>,
  rng: Rng = mulberry32((Math.random() * 2 ** 32) >>> 0),
): WeaknessResult | null {
  const weak = pickWeakTags(byTag);
  if (weak.length === 0) return null;

  const candidates = weak.slice(0, 4);
  const chosen = candidates[randInt(rng, 0, candidates.length - 1)];
  const levels = TAG_LEVELS[chosen.tag] ?? [2, 3, 4];

  for (let i = 0; i < 400; i++) {
    const p = generateScoreProblem(pick(rng, levels), undefined, { extras: false });
    if (p.tags.includes(chosen.tag)) {
      return { problem: p, targetTag: chosen.tag, accuracy: chosen.accuracy };
    }
  }
  return {
    problem: generateScoreProblem(pick(rng, levels), undefined, { extras: false }),
    targetTag: chosen.tag,
    accuracy: chosen.accuracy,
  };
}
