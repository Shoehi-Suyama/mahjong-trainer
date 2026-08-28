// アガリ形の判定と面子分解（仕様 #54: isAgari / analyzeHand の土台）。
// 副露は Phase 1 では未使用だが、データ構造は将来に備えて用意する。

import {
  type TileId,
  type SuitPrefix,
  type Rank,
  tile,
  isHonorId,
  toCounts,
  sortTileIds,
  compareTileIds,
} from './tiles';

export type MeldKind = 'chi' | 'pon' | 'kan';

export interface Meld {
  kind: MeldKind;
  tiles: TileId[]; // chi/pon: 3枚, kan: 4枚
  /** true = 明（ポン・チー・大明槓）, false = 暗（暗槓） */
  open: boolean;
}

export type SetKind = 'shuntsu' | 'kotsu' | 'kantsu';

export interface ParsedSet {
  kind: SetKind;
  tiles: TileId[];
  /** 明面子（ロン・副露）なら true。手内の暗面子なら false。 */
  open: boolean;
  /** 副露由来か（符計算・門前判定に使用） */
  fromMeld: boolean;
}

export interface StandardParse {
  type: 'standard';
  pair: TileId;
  sets: ParsedSet[]; // 常に4面子
}

export interface ChiitoitsuParse {
  type: 'chiitoitsu';
  pairs: TileId[]; // 7対子
}

export interface KokushiParse {
  type: 'kokushi';
  /** 対子になっている么九牌（十三面待ちの場合もどれか1つ） */
  pairTile: TileId;
  /** 純正十三面待ち（13種すべて1枚 + 和了牌）だったか */
  thirteenWait: boolean;
}

export type HandParse = StandardParse | ChiitoitsuParse | KokushiParse;

export type WaitType = 'ryanmen' | 'penchan' | 'kanchan' | 'shanpon' | 'tanki';

export interface AgariShape {
  parse: StandardParse;
  wait: WaitType;
  /** 和了牌が完成させた面子の sets index。単騎の場合は -1（雀頭）。 */
  winningSetIndex: number;
}

export interface HandInput {
  /** 手の内の牌（和了牌を含む）。副露牌は含めない。 */
  concealed: TileId[];
  melds?: Meld[];
  winningTile: TileId;
  tsumo: boolean;
}

// ---- 面子分解（標準形） ----

function idToKey(id: TileId): number {
  if (isHonorId(id)) return 30 + tile(id).value; // 31..37
  const { suit, value } = tile(id);
  const base = { man: 0, pin: 10, sou: 20 }[suit as SuitPrefix];
  return base + value; // 1..9, 11..19, 21..29
}

function keyToId(key: number): TileId {
  if (key >= 31) {
    const zmap: TileId[] = ['east', 'south', 'west', 'north', 'white', 'green', 'red'];
    return zmap[key - 31];
  }
  const suit: SuitPrefix = key < 10 ? 'man' : key < 20 ? 'pin' : 'sou';
  const value = key % 10;
  return `${suit}${value as Rank}`;
}

function meldToParsedSet(m: Meld): ParsedSet {
  if (m.kind === 'kan') {
    return { kind: 'kantsu', tiles: sortTileIds(m.tiles), open: m.open, fromMeld: true };
  }
  if (m.kind === 'pon') {
    return { kind: 'kotsu', tiles: sortTileIds(m.tiles), open: true, fromMeld: true };
  }
  return { kind: 'shuntsu', tiles: sortTileIds(m.tiles), open: true, fromMeld: true };
}

/**
 * 手内の牌（副露を除く、和了牌を含む枚数）を 面子＋雀頭 に分解する全パターンを返す。
 * 同一の多重集合分割は1回だけ（最小の牌から確定的に消費するため重複は出ない）。
 */
export function decomposeStandard(concealedTiles: TileId[], melds: Meld[] | number = []): StandardParse[] {
  const meldList = typeof melds === 'number' ? [] : melds;
  const meldCount = typeof melds === 'number' ? melds : melds.length;
  const meldSets = meldList.map(meldToParsedSet);

  const counts = new Array(38).fill(0);
  for (const id of concealedTiles) counts[idToKey(id)]++;
  const needSets = 4 - meldCount;

  const results: StandardParse[] = [];
  const seen = new Set<string>();

  const pairKeys = counts.map((c, k) => (c >= 2 ? k : -1)).filter((k) => k >= 0);

  for (const pairKey of pairKeys) {
    counts[pairKey] -= 2;
    for (const sets of allSetPartitions(counts, needSets)) {
      const parse: StandardParse = {
        type: 'standard',
        pair: keyToId(pairKey),
        sets: [...meldSets, ...sets]
          .map((s) => ({ ...s, tiles: sortTileIds(s.tiles) }))
          .sort((a, b) => compareTileIds(a.tiles[0], b.tiles[0])),
      };
      const sig =
        parse.pair + '|' + parse.sets.map((s) => s.kind + s.tiles.join('') + (s.open ? 'o' : '')).join(',');
      if (!seen.has(sig)) {
        seen.add(sig);
        results.push(parse);
      }
    }
    counts[pairKey] += 2;
  }
  return results;
}

/** counts から need 面子への全分割を列挙する。常に最小キーを消費して重複を防ぐ。 */
function allSetPartitions(counts: number[], need: number): ParsedSet[][] {
  if (need === 0) return counts.every((c) => c === 0) ? [[]] : [];

  const k = counts.findIndex((c) => c > 0);
  if (k < 0) return [];

  const out: ParsedSet[][] = [];

  // 刻子
  if (counts[k] >= 3) {
    counts[k] -= 3;
    for (const rest of allSetPartitions(counts, need - 1)) {
      out.push([
        { kind: 'kotsu', tiles: [keyToId(k), keyToId(k), keyToId(k)], open: false, fromMeld: false },
        ...rest,
      ]);
    }
    counts[k] += 3;
  }

  // 順子（字牌・8,9始まりは不可）
  const isSuited = k < 31;
  const rank = k % 10;
  if (isSuited && rank >= 1 && rank <= 7 && counts[k + 1] > 0 && counts[k + 2] > 0) {
    counts[k]--; counts[k + 1]--; counts[k + 2]--;
    for (const rest of allSetPartitions(counts, need - 1)) {
      out.push([
        { kind: 'shuntsu', tiles: [keyToId(k), keyToId(k + 1), keyToId(k + 2)], open: false, fromMeld: false },
        ...rest,
      ]);
    }
    counts[k]++; counts[k + 1]++; counts[k + 2]++;
  }

  return out;
}

// ---- 七対子 ----

export function decomposeChiitoitsu(concealedTiles: TileId[]): ChiitoitsuParse | null {
  if (concealedTiles.length !== 14) return null;
  const counts = toCounts(concealedTiles);
  if (counts.size !== 7) return null;
  for (const c of counts.values()) if (c !== 2) return null;
  return { type: 'chiitoitsu', pairs: sortTileIds([...counts.keys()]) };
}

const KOKUSHI_TILES: TileId[] = [
  'man1', 'man9', 'pin1', 'pin9', 'sou1', 'sou9',
  'east', 'south', 'west', 'north', 'white', 'green', 'red',
];

export function decomposeKokushi(concealedTiles: TileId[], winningTile: TileId): KokushiParse | null {
  if (concealedTiles.length !== 14) return null;
  const counts = toCounts(concealedTiles);
  for (const id of counts.keys()) if (!KOKUSHI_TILES.includes(id)) return null;
  let pairTile: TileId | null = null;
  for (const t of KOKUSHI_TILES) {
    const c = counts.get(t) ?? 0;
    if (c === 0) return null;
    if (c === 2) {
      if (pairTile) return null; // 対子が2つはあり得ない
      pairTile = t;
    } else if (c !== 1) {
      return null;
    }
  }
  if (!pairTile) return null;
  // 13種すべて1枚だった状態から和了 → 十三面待ち
  const beforeWin = toCounts(concealedTiles);
  beforeWin.set(winningTile, (beforeWin.get(winningTile) ?? 0) - 1);
  const thirteenWait = KOKUSHI_TILES.every((t) => (beforeWin.get(t) ?? 0) === 1);
  return { type: 'kokushi', pairTile, thirteenWait };
}

// ---- アガリ判定 ----

export function isAgari(concealedTiles: TileId[], melds: Meld[] = []): boolean {
  if (decomposeChiitoitsu(concealedTiles)) return true;
  if (melds.length === 0 && decomposeKokushi(concealedTiles, concealedTiles[0])) return true;
  return decomposeStandard(concealedTiles, melds).length > 0;
}

// ---- 待ちの分類 ----

function classifyWait(set: ParsedSet, winningTile: TileId): WaitType | null {
  if (!set.tiles.includes(winningTile)) return null;
  if (set.kind === 'kotsu' || set.kind === 'kantsu') return 'shanpon';
  // 順子
  const vals = set.tiles.map((t) => tile(t).value).sort((a, b) => a - b);
  const w = tile(winningTile).value;
  if (w === vals[1]) return 'kanchan';
  if (w === vals[0]) {
    // 和了牌が下端: 残り2枚は vals[1],vals[2]。それが 8-9 なら辺張（7待ち）、他は両面。
    return vals[2] === 9 ? 'penchan' : 'ryanmen';
  }
  // 和了牌が上端: 残り2枚は vals[0],vals[1]。それが 1-2 なら辺張（3待ち）、他は両面。
  return vals[0] === 1 ? 'penchan' : 'ryanmen';
}

/**
 * 和了牌の位置ごとに待ちを分類した全候補を返す。
 * fu / yaku 側で最も有利な組合せを選ぶ（仕様: 高点法）。
 */
export function enumerateAgariShapes(input: HandInput): AgariShape[] {
  const melds = input.melds ?? [];
  const parses = decomposeStandard(input.concealed, melds);
  const out: AgariShape[] = [];

  for (const parse of parses) {
    let matched = false;
    parse.sets.forEach((set, i) => {
      const wait = classifyWait(set, input.winningTile);
      if (wait) {
        matched = true;
        const sets = parse.sets.map((s, j) =>
          i === j && !input.tsumo && (s.kind === 'kotsu' || s.kind === 'kantsu')
            ? { ...s, open: true } // ロンで完成した刻子は明刻扱い
            : { ...s },
        );
        out.push({ parse: { ...parse, sets }, wait, winningSetIndex: i });
      }
    });
    // 単騎（雀頭で和了）
    if (parse.pair === input.winningTile) {
      matched = true;
      out.push({ parse: { ...parse, sets: parse.sets.map((s) => ({ ...s })) }, wait: 'tanki', winningSetIndex: -1 });
    }
    if (!matched) {
      // 和了牌が手内に無い＝不正入力だが、フォールバックとして単騎扱いを避ける
    }
  }
  return out;
}
