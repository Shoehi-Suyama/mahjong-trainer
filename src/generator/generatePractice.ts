// 実戦トレーニング用の問題（仕様 #17-23）。
// 完成形（generateScoreProblem）から逆算し、配牌＋ツモ列を用意する。
// 打牌選択は採点しない（仕様 #18）。× 印の不要牌を切ればテンパイ→アガリに到達する。

import { type TileId, ALL_TILE_IDS, sortTileIds, isYaochu } from '../core/tiles';
import { type Rng, mulberry32, randInt, shuffle } from './random';
import { generateScoreProblem, type Problem } from './generate';

export interface PracticeProblem {
  target: Problem;
  /** 配牌13枚 */
  startHand: TileId[];
  /** ツモ列。ツモ和了なら末尾が和了牌。ロンなら不足分のみ（和了牌は ronTile）。 */
  draws: TileId[];
  /** 配牌中の不要牌（ヒント表示用） */
  junk: TileId[];
  isRon: boolean;
  ronTile?: TileId;
}

function tallyAll(tiles: TileId[]): Map<TileId, number> {
  const m = new Map<TileId, number>();
  for (const t of tiles) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

function pickJunk(rng: Rng, count: number, avoid: TileId[]): TileId[] {
  const used = tallyAll(avoid);
  // 孤立しやすい么九牌を優先、足りなければ他も
  const pool = shuffle(rng, [
    ...ALL_TILE_IDS.filter(isYaochu),
    ...ALL_TILE_IDS.filter((t) => !isYaochu(t)),
  ]);
  const out: TileId[] = [];
  const outCount = new Map<TileId, number>();
  for (const t of pool) {
    if (out.length >= count) break;
    const total = (used.get(t) ?? 0) + (outCount.get(t) ?? 0);
    if (total >= 1) continue; // 完全に未使用の牌だけ不要牌にする（見た目が紛らわしくない）
    out.push(t);
    outCount.set(t, 1);
  }
  return out;
}

export function generatePracticeProblem(level = 1, seed?: number): PracticeProblem {
  const s = seed ?? (Math.random() * 2 ** 32) >>> 0;
  const rng: Rng = mulberry32(s);
  const target = generateScoreProblem(level, s ^ 0x9e3779b9);

  const goal = target.concealed; // 13枚のテンパイ形
  const winning = target.winningTile;

  const D = randInt(rng, 3, 6); // ツモ回数
  const idx = shuffle(rng, goal.map((_, i) => i)).slice(0, D);
  const missingSet = new Set(idx);
  const kept = goal.filter((_, i) => !missingSet.has(i));
  const missing = idx.map((i) => goal[i]);

  const junk = pickJunk(rng, D, [...goal, winning, ...target.doraIndicators]);
  const startHand = sortTileIds([...kept, ...junk]);

  const draws = shuffle(rng, [...missing]);
  if (target.tsumo) {
    return { target, startHand, draws: [...draws, winning], junk, isRon: false };
  }
  return { target, startHand, draws, junk, isRon: true, ronTile: winning };
}
