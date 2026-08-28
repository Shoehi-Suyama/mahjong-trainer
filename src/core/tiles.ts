// 牌データモデル。画像・UIには一切依存しない（仕様 #7, #8, #59-1）。

export type Suit = 'man' | 'pin' | 'sou' | 'honor';

export type SuitPrefix = 'man' | 'pin' | 'sou';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type SuitedTileId = `${SuitPrefix}${Rank}`;
export type HonorTileId =
  | 'east' | 'south' | 'west' | 'north' // 風牌 value 1..4
  | 'white' | 'green' | 'red';          // 三元牌 value 5..7 (白, 發, 中)
export type TileId = SuitedTileId | HonorTileId;

export interface Tile {
  id: TileId;
  suit: Suit;
  /** 数牌: 1..9 / 風牌: 東=1 南=2 西=3 北=4 / 三元牌: 白=5 發=6 中=7 */
  value: number;
}

const HONOR_ORDER: HonorTileId[] = ['east', 'south', 'west', 'north', 'white', 'green', 'red'];
const WIND_IDS: HonorTileId[] = ['east', 'south', 'west', 'north'];
const DRAGON_IDS: HonorTileId[] = ['white', 'green', 'red'];

const SUIT_PREFIXES: SuitPrefix[] = ['man', 'pin', 'sou'];

/** 全34種の牌ID（並び順は man1..9, pin1..9, sou1..9, 東南西北白發中）。 */
export const ALL_TILE_IDS: TileId[] = [
  ...SUIT_PREFIXES.flatMap((p) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${p}${n}` as SuitedTileId)),
  ...HONOR_ORDER,
];

const HONOR_LABEL: Record<HonorTileId, string> = {
  east: '東', south: '南', west: '西', north: '北', white: '白', green: '發', red: '中',
};

export function isHonorId(id: TileId): id is HonorTileId {
  return HONOR_ORDER.includes(id as HonorTileId);
}

export function tile(id: TileId): Tile {
  if (isHonorId(id)) {
    return { id, suit: 'honor', value: HONOR_ORDER.indexOf(id) + 1 };
  }
  const suit = id.slice(0, 3) as SuitPrefix;
  const value = Number(id.slice(3));
  return { id, suit, value };
}

export function suitOf(id: TileId): Suit {
  return tile(id).suit;
}

export function isWind(id: TileId): boolean {
  return WIND_IDS.includes(id as HonorTileId);
}

export function isDragon(id: TileId): boolean {
  return DRAGON_IDS.includes(id as HonorTileId);
}

/** 1・9の数牌 */
export function isTerminal(id: TileId): boolean {
  if (isHonorId(id)) return false;
  const v = tile(id).value;
  return v === 1 || v === 9;
}

/** 么九牌（1・9・字牌） */
export function isYaochu(id: TileId): boolean {
  return isHonorId(id) || isTerminal(id);
}

/** 中張牌（2〜8の数牌） */
export function isSimple(id: TileId): boolean {
  return !isYaochu(id);
}

/** ドラ表示牌 → ドラ本体（仕様 #36）。数牌は 9→1、風は 北→東、三元は 中→白 で循環。 */
export function doraFromIndicator(indicator: TileId): TileId {
  if (isWind(indicator)) {
    const i = WIND_IDS.indexOf(indicator as HonorTileId);
    return WIND_IDS[(i + 1) % WIND_IDS.length];
  }
  if (isDragon(indicator)) {
    const i = DRAGON_IDS.indexOf(indicator as HonorTileId);
    return DRAGON_IDS[(i + 1) % DRAGON_IDS.length];
  }
  const { suit, value } = tile(indicator);
  const next = value === 9 ? 1 : value + 1;
  return `${suit as SuitPrefix}${next as Rank}`;
}

/** 手牌全体（副露含む）に対するドラ枚数。赤ドラは初期版では扱わない（仕様 #9）。 */
export function countDora(allTiles: TileId[], indicators: TileId[]): number {
  const doraIds = indicators.map(doraFromIndicator);
  let n = 0;
  for (const t of allTiles) {
    for (const d of doraIds) if (t === d) n++;
  }
  return n;
}

const SUIT_SORT: Record<Suit, number> = { man: 0, pin: 1, sou: 2, honor: 3 };

export function compareTileIds(a: TileId, b: TileId): number {
  const ta = tile(a);
  const tb = tile(b);
  if (ta.suit !== tb.suit) return SUIT_SORT[ta.suit] - SUIT_SORT[tb.suit];
  return ta.value - tb.value;
}

export function sortTileIds(ids: TileId[]): TileId[] {
  return [...ids].sort(compareTileIds);
}

export function tileLabel(id: TileId): string {
  if (isHonorId(id)) return HONOR_LABEL[id];
  const { suit, value } = tile(id);
  const kanji = { man: '萬', pin: '筒', sou: '索' }[suit as SuitPrefix];
  return `${value}${kanji}`;
}

// ---- 記譜パーサ（出題データ・テスト用。coreロジックの本体は TileId を使う） ----

const NOTATION_HONOR: Record<string, HonorTileId> = {
  東: 'east', 南: 'south', 西: 'west', 北: 'north',
  白: 'white', 發: 'green', 発: 'green', 中: 'red',
  E: 'east', S: 'south', W: 'west', N: 'north',
};

/**
 * "123m 99p 東東 5z" のような記譜を TileId[] に展開する。
 * m/p/s = 萬筒索、z = 字牌（1..7 = 東南西北白發中）、漢字の字牌も可。
 */
export function parseTiles(notation: string): TileId[] {
  const out: TileId[] = [];
  for (const group of notation.trim().split(/\s+/).filter(Boolean)) {
    const suit = group[group.length - 1];
    if (suit === 'm' || suit === 'p' || suit === 's') {
      const prefix = ({ m: 'man', p: 'pin', s: 'sou' } as const)[suit];
      for (const ch of group.slice(0, -1)) out.push(`${prefix}${Number(ch) as Rank}`);
    } else if (suit === 'z') {
      const zmap: HonorTileId[] = ['east', 'south', 'west', 'north', 'white', 'green', 'red'];
      for (const ch of group.slice(0, -1)) out.push(zmap[Number(ch) - 1]);
    } else {
      for (const ch of group) {
        const h = NOTATION_HONOR[ch];
        if (h) out.push(h);
        else throw new Error(`parseTiles: 解釈できない記譜 "${group}"`);
      }
    }
  }
  return out;
}

export function toCounts(ids: TileId[]): Map<TileId, number> {
  const m = new Map<TileId, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}
