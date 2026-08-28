// 実戦トレーニング用の問題（仕様 #17-23）。
// 完成形（generateScoreProblem）から逆算し、配牌＋ツモ列を用意する。
// 打牌選択は採点しない（仕様 #18）が、不要牌は「孤立牌」なので牌効率どおりに切れば手が進む。

import {
  type TileId,
  ALL_TILE_IDS,
  sortTileIds,
  isHonorId,
  isYaochu,
  isTerminal,
  tile,
} from '../core/tiles';
import { type Rng, mulberry32, pick, randInt, shuffle } from './random';
import { generateScoreProblem, type Problem } from './generate';

export interface PracticeProblem {
  target: Problem;
  /** 目標のテンパイ形（13枚）。＝ target.concealed */
  goal: TileId[];
  /** 配牌13枚 */
  startHand: TileId[];
  /** ツモ列。ツモ和了なら末尾が和了牌。ロンなら不足分のみ（和了牌は ronTile）。 */
  draws: TileId[];
  /** 配牌中の「切るべき」孤立牌（表示はしない。生成の内部情報＆テスト用） */
  junk: TileId[];
  isRon: boolean;
  ronTile?: TileId;
}

function tally(tiles: TileId[]): Map<TileId, number> {
  const m = new Map<TileId, number>();
  for (const t of tiles) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

/**
 * 手牌のどの牌ともつながらない（同種なし・数牌は±2以内に何もない）孤立牌を選ぶ。
 * 字牌 → 老頭牌 → それ以外の順で優先し、牌効率上あきらかに切る牌になるようにする。
 */
function pickIsolatedJunk(rng: Rng, count: number, hand: TileId[], avoid: TileId[]): TileId[] {
  const handCounts = tally(hand);
  const blocked = tally(avoid);

  const connects = (id: TileId): boolean => {
    if ((handCounts.get(id) ?? 0) > 0) return true;
    if (isHonorId(id)) return false;
    const { suit, value } = tile(id);
    for (let d = 1; d <= 2; d++) {
      for (const v of [value - d, value + d]) {
        if (v >= 1 && v <= 9 && (handCounts.get(`${suit}${v}` as TileId) ?? 0) > 0) return true;
      }
    }
    return false;
  };

  const tiers = [
    ALL_TILE_IDS.filter(isHonorId),
    ALL_TILE_IDS.filter(isTerminal),
    ALL_TILE_IDS.filter((t) => !isYaochu(t)),
  ];

  const out: TileId[] = [];
  const used = new Set<TileId>();
  for (const tier of tiers) {
    for (const t of shuffle(rng, tier)) {
      if (out.length >= count) break;
      if (used.has(t) || (blocked.get(t) ?? 0) > 0) continue;
      if (connects(t)) continue;
      out.push(t);
      used.add(t);
    }
    if (out.length >= count) break;
  }
  // 予備（孤立牌が足りなければ未使用牌で埋める）
  while (out.length < count) {
    const t = pick(rng, ALL_TILE_IDS);
    if (!used.has(t) && (blocked.get(t) ?? 0) === 0) {
      out.push(t);
      used.add(t);
    }
  }
  return out;
}

export function generatePracticeProblem(level = 1, seed?: number): PracticeProblem {
  const s = seed ?? (Math.random() * 2 ** 32) >>> 0;
  const rng: Rng = mulberry32(s);
  const target = generateScoreProblem(level, s ^ 0x9e3779b9, { extras: false, tileExtras: false });

  const goal = target.concealed; // 13枚のテンパイ形
  const winning = target.winningTile;

  const D = randInt(rng, 3, 5); // ツモ回数
  const idx = shuffle(rng, goal.map((_, i) => i)).slice(0, D);
  const missingSet = new Set(idx);
  const kept = goal.filter((_, i) => !missingSet.has(i));
  const missing = idx.map((i) => goal[i]);

  const junk = pickIsolatedJunk(rng, D, [...goal, winning, ...target.doraIndicators], [
    ...goal,
    winning,
    ...target.doraIndicators,
  ]);
  const startHand = sortTileIds([...kept, ...junk]);

  const draws = shuffle(rng, [...missing]);
  if (target.tsumo) {
    return { target, goal, startHand, draws: [...draws, winning], junk, isRon: false };
  }
  return { target, goal, startHand, draws, junk, isRon: true, ronTile: winning };
}
