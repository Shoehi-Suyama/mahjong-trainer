// アガリ形の「素」を組み立てる（仕様 #23: 正解から逆算して問題を作る）。
// ここでは牌の並びだけを作り、役・翻・符・点は analyzeHand に判定させる（唯一の真実）。

import {
  type TileId,
  type HonorTileId,
  type SuitPrefix,
  type Rank,
} from '../core/tiles';
import type { Meld } from '../core/hand';
import { type Rng, pick, randInt, shuffle } from './random';

export interface RawHand {
  /** 手の内（和了牌を含む）。副露があれば 14 - 3×副露数 枚。 */
  concealed: TileId[];
  winningTile: TileId;
  tsumo: boolean;
  riichi: boolean;
  melds?: Meld[];
}

export interface BuildContext {
  roundWind: HonorTileId;
  seatWind: HonorTileId;
}

const SUITS: SuitPrefix[] = ['man', 'pin', 'sou'];
const GUEST_WINDS: HonorTileId[] = ['east', 'south', 'west', 'north'];

function s(suit: SuitPrefix, v: number): TileId {
  return `${suit}${v as Rank}`;
}
function shuntsu(suit: SuitPrefix, start: number): TileId[] {
  return [s(suit, start), s(suit, start + 1), s(suit, start + 2)];
}
function kotsu(id: TileId): TileId[] {
  return [id, id, id];
}

function counts(ids: TileId[]): Map<TileId, number> {
  const m = new Map<TileId, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}
export function withinFour(ids: TileId[]): boolean {
  for (const c of counts(ids).values()) if (c > 4) return false;
  return true;
}

function assemble(sets: TileId[][], pair: TileId): TileId[] {
  return [...sets.flat(), pair, pair];
}

// ---- 各ビルダー。失敗時は null を返し、呼び出し側で再試行する。 ----

export function buildPinfu(rng: Rng): RawHand | null {
  const sets: TileId[][] = [];
  for (let i = 0; i < 4; i++) sets.push(shuntsu(pick(rng, SUITS), randInt(rng, 1, 7)));
  // 両面になりうる順子（開始2..6）を1つ選び、その端を和了牌にする
  const idx = sets.findIndex((set) => {
    const start = Number(set[0].slice(3));
    return start >= 2 && start <= 6;
  });
  if (idx < 0) return null;
  const start = Number(sets[idx][0].slice(3));
  const suit = sets[idx][0].slice(0, 3) as SuitPrefix;
  const winLow = rng() < 0.5;
  const winningTile = winLow ? s(suit, start) : s(suit, start + 2);

  const pairVal = randInt(rng, 1, 9);
  const pair = s(pick(rng, SUITS), pairVal);

  const concealed = assemble(sets, pair);
  if (!withinFour(concealed)) return null;
  return { concealed, winningTile, tsumo: rng() < 0.5, riichi: rng() < 0.6 };
}

export function buildTanyao(rng: Rng): RawHand | null {
  const sets: TileId[][] = [];
  const nSh = randInt(rng, 3, 4);
  for (let i = 0; i < nSh; i++) sets.push(shuntsu(pick(rng, SUITS), randInt(rng, 2, 6)));
  while (sets.length < 4) sets.push(kotsu(s(pick(rng, SUITS), randInt(rng, 2, 8))));
  const pair = s(pick(rng, SUITS), randInt(rng, 2, 8));

  const concealed = assemble(sets, pair);
  if (!withinFour(concealed)) return null;
  const winningTile = pick(rng, shuffle(rng, [...concealed]));
  return { concealed, winningTile, tsumo: rng() < 0.5, riichi: rng() < 0.4 };
}

export function buildYakuhai(rng: Rng, ctx: BuildContext): RawHand | null {
  const honorPool: HonorTileId[] = ['white', 'green', 'red', ctx.roundWind, ctx.seatWind];
  const honor = pick(rng, honorPool);
  const sets: TileId[][] = [kotsu(honor)];
  for (let i = 0; i < 3; i++) {
    if (rng() < 0.6) sets.push(shuntsu(pick(rng, SUITS), randInt(rng, 1, 7)));
    else sets.push(kotsu(s(pick(rng, SUITS), randInt(rng, 1, 9))));
  }
  // 雀頭は非役牌の数牌
  const pair = s(pick(rng, SUITS), randInt(rng, 1, 9));

  const concealed = assemble(sets, pair);
  if (!withinFour(concealed)) return null;
  // 和了牌: 役牌の刻子（シャンポン）か、他の面子から
  const winningTile =
    rng() < 0.35 ? honor : pick(rng, shuffle(rng, sets.slice(1).flat()));
  return { concealed, winningTile, tsumo: rng() < 0.5, riichi: rng() < 0.3 };
}

export function buildChiitoitsu(rng: Rng): RawHand | null {
  const all: TileId[] = [];
  for (const suit of SUITS) for (let v = 1; v <= 9; v++) all.push(s(suit, v));
  for (const h of ['east', 'south', 'west', 'north', 'white', 'green', 'red'] as HonorTileId[]) all.push(h);
  const chosen = shuffle(rng, all).slice(0, 7);
  const concealed = chosen.flatMap((id) => [id, id]);
  const winningTile = pick(rng, chosen);
  return { concealed, winningTile, tsumo: rng() < 0.5, riichi: rng() < 0.7 };
}

export function buildRiichiOnly(rng: Rng): RawHand | null {
  // 端牌入り順子＋非役牌の刻子＋雀頭。タンヤオ・ピンフ・一盃口・役牌を排除。
  const sets: TileId[][] = [];
  sets.push(shuntsu(pick(rng, SUITS), rng() < 0.5 ? 1 : 7)); // 端を含む
  sets.push(shuntsu(pick(rng, SUITS), randInt(rng, 1, 7)));
  sets.push(shuntsu(pick(rng, SUITS), randInt(rng, 1, 7)));
  sets.push(kotsu(s(pick(rng, SUITS), randInt(rng, 2, 8)))); // 刻子 → ピンフ不成立
  // 同一順子（一盃口）を避ける
  const sig = sets.slice(0, 3).map((x) => x.join(''));
  if (new Set(sig).size !== sig.length) return null;

  const pair = rng() < 0.5 ? s(pick(rng, SUITS), rng() < 0.5 ? 1 : 9) : pick(rng, GUEST_WINDS);

  const concealed = assemble(sets, pair);
  if (!withinFour(concealed)) return null;
  const winningTile = pick(rng, shuffle(rng, sets.slice(0, 3).flat()));
  return { concealed, winningTile, tsumo: rng() < 0.45, riichi: true };
}

export function buildIipeikou(rng: Rng): RawHand | null {
  const suit = pick(rng, SUITS);
  const start = randInt(rng, 1, 7);
  const twin = shuntsu(suit, start);
  const sets: TileId[][] = [twin, [...twin]];
  for (let i = 0; i < 2; i++) {
    if (rng() < 0.6) sets.push(shuntsu(pick(rng, SUITS), randInt(rng, 1, 7)));
    else sets.push(kotsu(s(pick(rng, SUITS), randInt(rng, 1, 9))));
  }
  const pair = s(pick(rng, SUITS), randInt(rng, 1, 9));
  const concealed = assemble(sets, pair);
  if (!withinFour(concealed)) return null;
  const winningTile = pick(rng, shuffle(rng, sets[2].concat(sets[3])));
  return { concealed, winningTile, tsumo: rng() < 0.4, riichi: rng() < 0.5 };
}

export function buildSanshoku(rng: Rng): RawHand | null {
  const start = randInt(rng, 1, 7);
  const sets: TileId[][] = SUITS.map((su) => shuntsu(su, start));
  sets.push(
    rng() < 0.6
      ? shuntsu(pick(rng, SUITS), randInt(rng, 1, 7))
      : kotsu(s(pick(rng, SUITS), randInt(rng, 1, 9))),
  );
  const pair = s(pick(rng, SUITS), randInt(rng, 1, 9));
  const concealed = assemble(sets, pair);
  if (!withinFour(concealed)) return null;
  const winningTile = pick(rng, shuffle(rng, sets.flat()));
  return { concealed, winningTile, tsumo: rng() < 0.45, riichi: rng() < 0.4 };
}

export function buildIttsuu(rng: Rng): RawHand | null {
  const suit = pick(rng, SUITS);
  const sets: TileId[][] = [shuntsu(suit, 1), shuntsu(suit, 4), shuntsu(suit, 7)];
  sets.push(
    rng() < 0.5
      ? shuntsu(pick(rng, SUITS), randInt(rng, 1, 7))
      : kotsu(s(pick(rng, SUITS), randInt(rng, 1, 9))),
  );
  const pair = s(pick(rng, SUITS), randInt(rng, 1, 9));
  const concealed = assemble(sets, pair);
  if (!withinFour(concealed)) return null;
  const winningTile = pick(rng, shuffle(rng, sets.flat()));
  return { concealed, winningTile, tsumo: rng() < 0.45, riichi: rng() < 0.4 };
}

export function buildToitoi(rng: Rng, _ctx?: BuildContext): RawHand | null {
  const used = new Set<TileId>();
  const sets: TileId[][] = [];
  while (sets.length < 4) {
    const id: TileId =
      rng() < 0.7
        ? s(pick(rng, SUITS), randInt(rng, 1, 9))
        : pick(rng, ['white', 'green', 'red', ...GUEST_WINDS] as TileId[]);
    if (used.has(id)) continue;
    used.add(id);
    sets.push(kotsu(id));
  }
  let pair: TileId;
  do {
    pair = s(pick(rng, SUITS), randInt(rng, 1, 9));
  } while (used.has(pair));
  const concealed = assemble(sets, pair);
  if (!withinFour(concealed)) return null;
  // 和了牌は刻子のどれか（シャンポン）。ツモにすると四暗刻になり得るのでロン寄りに。
  const winningTile = pick(rng, shuffle(rng, sets.flat()));
  return { concealed, winningTile, tsumo: rng() < 0.2, riichi: false };
}

export function buildHonitsu(rng: Rng, ctx: BuildContext): RawHand | null {
  const suit = pick(rng, SUITS);
  const honors: TileId[] = ['white', 'green', 'red', ctx.roundWind, ctx.seatWind];
  const sets: TileId[][] = [];
  const nHonorSets = randInt(rng, 1, 2);
  const usedHonor = new Set<TileId>();
  for (let i = 0; i < nHonorSets; i++) {
    let h: TileId;
    do {
      h = pick(rng, honors);
    } while (usedHonor.has(h));
    usedHonor.add(h);
    sets.push(kotsu(h));
  }
  while (sets.length < 4) {
    sets.push(
      rng() < 0.7 ? shuntsu(suit, randInt(rng, 1, 7)) : kotsu(s(suit, randInt(rng, 1, 9))),
    );
  }
  const pair = rng() < 0.5 ? s(suit, randInt(rng, 1, 9)) : pick(rng, honors);
  const concealed = assemble(sets, pair);
  if (!withinFour(concealed)) return null;
  const winningTile = pick(rng, shuffle(rng, sets.flat()));
  return { concealed, winningTile, tsumo: rng() < 0.4, riichi: rng() < 0.4 };
}

export function buildChinitsu(rng: Rng): RawHand | null {
  const suit = pick(rng, SUITS);
  const sets: TileId[][] = [];
  while (sets.length < 4) {
    sets.push(
      rng() < 0.75 ? shuntsu(suit, randInt(rng, 1, 7)) : kotsu(s(suit, randInt(rng, 1, 9))),
    );
  }
  const pair = s(suit, randInt(rng, 1, 9));
  const concealed = assemble(sets, pair);
  if (!withinFour(concealed)) return null;
  const winningTile = pick(rng, shuffle(rng, sets.flat()));
  return { concealed, winningTile, tsumo: rng() < 0.4, riichi: rng() < 0.4 };
}

export function buildChanta(rng: Rng): RawHand | null {
  // 各面子・雀頭に么九を含める。順子は 123 か 789、刻子/雀頭は么九牌。
  const sets: TileId[][] = [];
  const yaoTiles: TileId[] = [
    'man1', 'man9', 'pin1', 'pin9', 'sou1', 'sou9',
    'east', 'south', 'west', 'north', 'white', 'green', 'red',
  ];
  let hasSeq = false;
  for (let i = 0; i < 4; i++) {
    if (rng() < 0.6) {
      hasSeq = true;
      const su = pick(rng, SUITS);
      sets.push(shuntsu(su, rng() < 0.5 ? 1 : 7));
    } else {
      sets.push(kotsu(pick(rng, yaoTiles)));
    }
  }
  if (!hasSeq) sets[0] = shuntsu(pick(rng, SUITS), rng() < 0.5 ? 1 : 7);
  const pair = pick(rng, yaoTiles);
  const concealed = assemble(sets, pair);
  if (!withinFour(concealed)) return null;
  const winningTile = pick(rng, shuffle(rng, sets.flat()));
  return { concealed, winningTile, tsumo: rng() < 0.4, riichi: rng() < 0.5 };
}

// ---- 副露（鳴き）あり（仕様 #25 Lv.6） ----

const DRAGONS: HonorTileId[] = ['white', 'green', 'red'];

/** 4面子から meldIdx の面子を明副露にし、和了牌は手内の面子から取る。 */
function meldHand(
  rng: Rng,
  sets: TileId[][],
  pair: TileId,
  meldIdx: number[],
  tsumoProb = 0.4,
): RawHand | null {
  const idx = new Set(meldIdx);
  const melds: Meld[] = meldIdx.map((i) => {
    const t = sets[i];
    const kind: Meld['kind'] = t[0] === t[1] ? 'pon' : 'chi';
    return { kind, tiles: [...t], open: true };
  });
  const concealedSets = sets.filter((_, i) => !idx.has(i));
  if (concealedSets.length === 0) return null;
  const concealed = [...concealedSets.flat(), pair, pair];
  const all = [...concealed, ...melds.flatMap((m) => m.tiles)];
  if (!withinFour(all)) return null;
  const winningTile = pick(rng, shuffle(rng, concealedSets.flat()));
  return { concealed, melds, winningTile, tsumo: rng() < tsumoProb, riichi: false };
}

export function buildKuitan(rng: Rng): RawHand | null {
  const sets: TileId[][] = [];
  const nSeq = randInt(rng, 2, 4);
  for (let i = 0; i < nSeq; i++) sets.push(shuntsu(pick(rng, SUITS), randInt(rng, 2, 6)));
  while (sets.length < 4) sets.push(kotsu(s(pick(rng, SUITS), randInt(rng, 2, 8))));
  const pair = s(pick(rng, SUITS), randInt(rng, 2, 8));
  const meldCount = randInt(rng, 1, 2);
  const meldIdx = shuffle(rng, [1, 2, 3]).slice(0, meldCount); // index0 は手内に残す
  return meldHand(rng, sets, pair, meldIdx);
}

export function buildOpenYakuhai(rng: Rng, ctx: BuildContext): RawHand | null {
  const honor = pick(rng, [...DRAGONS, ctx.roundWind, ctx.seatWind]);
  const sets: TileId[][] = [kotsu(honor)];
  for (let i = 0; i < 3; i++) {
    sets.push(
      rng() < 0.6
        ? shuntsu(pick(rng, SUITS), randInt(rng, 1, 7))
        : kotsu(s(pick(rng, SUITS), randInt(rng, 1, 9))),
    );
  }
  const pair = s(pick(rng, SUITS), randInt(rng, 1, 9));
  const meldIdx = rng() < 0.3 ? [0, randInt(rng, 1, 3)] : [0];
  return meldHand(rng, sets, pair, [...new Set(meldIdx)]);
}

export function buildOpenToitoi(rng: Rng, _ctx?: BuildContext): RawHand | null {
  const used = new Set<TileId>();
  const sets: TileId[][] = [];
  while (sets.length < 4) {
    const id: TileId =
      rng() < 0.7
        ? s(pick(rng, SUITS), randInt(rng, 1, 9))
        : pick(rng, [...DRAGONS, ...GUEST_WINDS] as TileId[]);
    if (used.has(id)) continue;
    used.add(id);
    sets.push(kotsu(id));
  }
  let pair: TileId;
  do {
    pair = s(pick(rng, SUITS), randInt(rng, 1, 9));
  } while (used.has(pair));
  const meldCount = randInt(rng, 1, 3);
  const meldIdx = shuffle(rng, [1, 2, 3]).slice(0, meldCount);
  return meldHand(rng, sets, pair, meldIdx, 0.15);
}

export function buildOpenHonitsu(rng: Rng, ctx: BuildContext): RawHand | null {
  const suit = pick(rng, SUITS);
  const honors: TileId[] = [...DRAGONS, ctx.roundWind, ctx.seatWind];
  const sets: TileId[][] = [kotsu(pick(rng, honors))];
  while (sets.length < 4) {
    sets.push(rng() < 0.6 ? shuntsu(suit, randInt(rng, 1, 7)) : kotsu(s(suit, randInt(rng, 1, 9))));
  }
  const pair = rng() < 0.5 ? s(suit, randInt(rng, 1, 9)) : pick(rng, honors);
  const meldIdx = rng() < 0.4 ? [0, shuffle(rng, [1, 2, 3])[0]] : [0];
  return meldHand(rng, sets, pair, [...new Set(meldIdx)]);
}

export function buildOpenSanshoku(rng: Rng): RawHand | null {
  const start = randInt(rng, 1, 7);
  const sets: TileId[][] = SUITS.map((su) => shuntsu(su, start));
  sets.push(
    rng() < 0.6
      ? shuntsu(pick(rng, SUITS), randInt(rng, 1, 7))
      : kotsu(s(pick(rng, SUITS), randInt(rng, 1, 9))),
  );
  const pair = s(pick(rng, SUITS), randInt(rng, 1, 9));
  const meldIdx = [randInt(rng, 0, 2)]; // 三色のうち1つを鳴く
  return meldHand(rng, sets, pair, meldIdx);
}
