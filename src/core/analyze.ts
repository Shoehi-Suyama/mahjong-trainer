// 統合エントリ（仕様 #54 analyzeHand）。
// 手牌・和了牌・場況から 役 / 翻 / 符 / 点数 を確定する。高点法で最良の解釈を選ぶ。

import { type TileId, type HonorTileId, countDora } from './tiles';
import {
  type Meld,
  type StandardParse,
  type WaitType,
  decomposeChiitoitsu,
  decomposeKokushi,
  enumerateAgariShapes,
} from './hand';
import {
  type Yaku,
  type YakuContext,
  detectStandardYaku,
  detectStandardYakuman,
  detectChiitoitsuYaku,
  detectChiitoitsuYakuman,
  detectKokushiYaku,
  contextYaku,
} from './yaku';
import { type FuResult, calculateFu, calculateChiitoitsuFu } from './fu';
import { type ScoreResult, calculateScore } from './score';

export interface AnalyzeInput {
  /** 手の内（和了牌を含む）。副露は melds に分ける。 */
  concealed: TileId[];
  melds?: Meld[];
  winningTile: TileId;
  tsumo: boolean;
  riichi?: boolean;
  doubleRiichi?: boolean;
  ippatsu?: boolean;
  oya: boolean;
  roundWind: HonorTileId;
  seatWind: HonorTileId;
  doraIndicators?: TileId[];
  uraIndicators?: TileId[];
  /** 赤ドラの枚数（赤5）。役ではなく翻に加算する。 */
  akaDora?: number;
  /** 本場 */
  honba?: number;
  /** 供託（1000点棒の本数） */
  kyotaku?: number;
}

export interface HanBreakdown {
  yaku: Yaku[];
  dora: number;
  uraDora: number;
  akaDora: number;
  /** 通常役＋ドラ＋赤ドラの合計翻。役満のときは 0。 */
  total: number;
  /** 役満の倍数（0=通常, 1=役満, 2=ダブル役満…） */
  yakuman: number;
}

export interface AnalyzeResult {
  agari: boolean;
  /** 役なし（ドラのみ等）で和了不可なら false */
  valid: boolean;
  reason?: string;
  han: HanBreakdown;
  fu: FuResult;
  score: ScoreResult;
  wait: WaitType | null;
  form: 'standard' | 'chiitoitsu' | 'kokushi';
}

function isMenzen(melds: Meld[]): boolean {
  return melds.every((m) => m.kind === 'kan' && !m.open); // 副露なし or 暗槓のみ
}

const NO_FU: FuResult = { raw: 0, rounded: 0, parts: [], fixed: true };

export function analyzeHand(input: AnalyzeInput): AnalyzeResult {
  const melds = input.melds ?? [];
  const doraInd = input.doraIndicators ?? [];
  const uraInd = input.uraIndicators ?? [];
  const menzen = isMenzen(melds);

  const ctx: YakuContext = {
    roundWind: input.roundWind,
    seatWind: input.seatWind,
    riichi: !!input.riichi,
    doubleRiichi: input.doubleRiichi,
    ippatsu: input.ippatsu,
    tsumo: input.tsumo,
    menzen,
  };

  const allTiles: TileId[] = [...input.concealed, ...melds.flatMap((m) => m.tiles)];
  const dora = countDora(allTiles, doraInd);
  const uraDora = ctx.riichi || ctx.doubleRiichi ? countDora(allTiles, uraInd) : 0;
  const akaDora = input.akaDora ?? 0;
  const honba = input.honba ?? 0;
  const kyotaku = input.kyotaku ?? 0;

  const candidates: AnalyzeResult[] = [];

  const build = (
    yaku: Yaku[],
    fu: FuResult,
    wait: WaitType,
    form: AnalyzeResult['form'],
  ): AnalyzeResult => {
    const yakumanCount = yaku.filter((y) => y.yakuman).length;
    const normalHan = yaku.reduce((s, y) => s + (y.yakuman ? 0 : y.han), 0);
    const hanTotal = yakumanCount > 0 ? 0 : normalHan + dora + uraDora + akaDora;
    const score = calculateScore({
      han: hanTotal,
      fu: fu.rounded,
      oya: input.oya,
      tsumo: input.tsumo,
      yakuman: yakumanCount,
      honba,
      kyotaku,
    });
    const scoringYaku = yakumanCount > 0 ? yaku.filter((y) => y.yakuman) : yaku;
    return {
      agari: true,
      valid: yaku.length > 0,
      reason: yaku.length > 0 ? undefined : '役なし',
      han: { yaku: scoringYaku, dora, uraDora, akaDora, total: hanTotal, yakuman: yakumanCount },
      fu,
      score,
      wait,
      form,
    };
  };

  // ---- 国士無双 ----
  if (melds.length === 0) {
    const kokushi = decomposeKokushi(input.concealed, input.winningTile);
    if (kokushi) {
      candidates.push(build(detectKokushiYaku(kokushi), NO_FU, 'tanki', 'kokushi'));
    }
  }

  // ---- 七対子 ----
  const chiitoi = decomposeChiitoitsu(input.concealed);
  if (chiitoi) {
    const yakuman = detectChiitoitsuYakuman(chiitoi);
    const yaku =
      yakuman.length > 0
        ? [...yakuman, ...contextYaku(ctx)]
        : [...detectChiitoitsuYaku(chiitoi, ctx), ...contextYaku(ctx)];
    candidates.push(build(yaku, calculateChiitoitsuFu(), 'tanki', 'chiitoitsu'));
  }

  // ---- 標準形 ----
  const shapes = enumerateAgariShapes({
    concealed: input.concealed,
    melds,
    winningTile: input.winningTile,
    tsumo: input.tsumo,
  });

  for (const shape of shapes) {
    const parse: StandardParse = shape.parse;
    const yakuman = detectStandardYakuman(parse, shape.wait, allTiles, ctx);
    if (yakuman.length > 0) {
      candidates.push(build([...yakuman, ...contextYaku(ctx)], NO_FU, shape.wait, 'standard'));
      continue;
    }
    const handYaku = detectStandardYaku(parse, shape.wait, allTiles, ctx);
    const yaku = [...contextYaku(ctx), ...handYaku];
    const isPinfu = handYaku.some((y) => y.name === 'ピンフ');
    const fu = calculateFu({
      parse,
      wait: shape.wait,
      winningSetIndex: shape.winningSetIndex,
      ctx,
      isPinfu,
    });
    candidates.push(build(yaku, fu, shape.wait, 'standard'));
  }

  if (candidates.length === 0) {
    return {
      agari: false,
      valid: false,
      reason: 'アガリ形ではありません',
      han: { yaku: [], dora, uraDora, akaDora, total: 0, yakuman: 0 },
      fu: { raw: 0, rounded: 0, parts: [], fixed: false },
      score: calculateScore({ han: 0, fu: 0, oya: input.oya, tsumo: input.tsumo }),
      wait: null,
      form: 'standard',
    };
  }

  // 高点法: 有効な候補のうち 点数 → 翻 → 符 の順で最大を選ぶ
  const valid = candidates.filter((c) => c.valid);
  const pool = valid.length > 0 ? valid : candidates;
  pool.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    if (b.han.total !== a.han.total) return b.han.total - a.han.total;
    return b.fu.rounded - a.fu.rounded;
  });
  return pool[0];
}
