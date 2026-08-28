// 実戦用 点数計算モードの入力データ構造と検証（仕様 #29, #41, #42）。
// 計算そのものは既存の analyzeHand を再利用する。UI からは独立。

import { type TileId, type HonorTileId } from './tiles';
import { type Meld, isAgari } from './hand';
import { analyzeHand, type AnalyzeResult } from './analyze';

export interface PracticalInput {
  /** 副露を除く手牌（アガリ牌を含む）。14 - 3×副露数 枚。 */
  concealed: TileId[];
  melds: Meld[];
  winningTile: TileId | null;
  tsumo: boolean;
  oya: boolean;
  /** 場風（east/south） */
  roundWind: HonorTileId;
  /** 自風（親なら east） */
  seatWind: HonorTileId;
  riichi: boolean;
  doubleRiichi: boolean;
  ippatsu: boolean;
  haitei: boolean;
  houtei: boolean;
  rinshan: boolean;
  chankan: boolean;
  tenho: boolean;
  chiho: boolean;
  /** ドラの合計枚数（表ドラ＋赤ドラ）。翻に直接加算する。 */
  dora: number;
  /** 裏ドラの枚数（リーチ時のみ有効） */
  uraDora: number;
  honba: number;
  kyotaku: number;
}

export function emptyPracticalInput(): PracticalInput {
  return {
    concealed: [],
    melds: [],
    winningTile: null,
    tsumo: false,
    oya: false,
    roundWind: 'east',
    seatWind: 'south',
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    haitei: false,
    houtei: false,
    rinshan: false,
    chankan: false,
    tenho: false,
    chiho: false,
    dora: 0,
    uraDora: 0,
    honba: 0,
    kyotaku: 0,
  };
}

/** 計算前チェック（仕様 #29）。問題なければ空配列。 */
export function validatePractical(input: PracticalInput): string[] {
  const errs: string[] = [];
  const meldCount = input.melds.length;
  const need = 14 - 3 * meldCount;

  if (input.concealed.length !== need) {
    errs.push(
      meldCount > 0
        ? `手牌の枚数が合いません（副露${meldCount}組なら手牌は ${need} 枚、現在 ${input.concealed.length} 枚）`
        : `手牌の枚数が合いません（アガリ牌を含めて ${need} 枚、現在 ${input.concealed.length} 枚）`,
    );
  }

  const counts = new Map<TileId, number>();
  for (const t of [...input.concealed, ...input.melds.flatMap((m) => m.tiles)]) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  for (const c of counts.values()) {
    if (c > 4) {
      errs.push('同じ牌が5枚以上あります');
      break;
    }
  }

  if (!input.winningTile) {
    errs.push('アガリ牌が指定されていません');
  } else if (!input.concealed.includes(input.winningTile)) {
    errs.push('アガリ牌が手牌に含まれていません');
  }

  if ((input.riichi || input.doubleRiichi) && input.melds.some((m) => m.open)) {
    errs.push('副露しているのでリーチはできません');
  }
  if (input.ippatsu && !input.riichi && !input.doubleRiichi) {
    errs.push('一発はリーチ時のみ指定できます');
  }

  if (errs.length === 0 && input.winningTile) {
    if (!isAgari(input.concealed, input.melds)) {
      errs.push('アガリの形になっていません');
    }
  }
  return errs;
}

export function calcPractical(input: PracticalInput): AnalyzeResult {
  return analyzeHand({
    concealed: input.concealed,
    melds: input.melds,
    winningTile: input.winningTile!,
    tsumo: input.tsumo,
    riichi: input.riichi,
    doubleRiichi: input.doubleRiichi,
    ippatsu: input.ippatsu,
    haitei: input.haitei,
    houtei: input.houtei,
    rinshan: input.rinshan,
    chankan: input.chankan,
    tenho: input.tenho,
    chiho: input.chiho,
    oya: input.oya,
    roundWind: input.roundWind,
    seatWind: input.seatWind,
    doraCount: input.dora,
    uraDoraCount: input.uraDora,
    honba: input.honba,
    kyotaku: input.kyotaku,
  });
}
