// 符計算（仕様 #28-30）。
// - 副底20
// - 面子: 明刻 中2/么九4、暗刻 中4/么九8、明槓 中8/么九16、暗槓 中16/么九32、順子0
// - 雀頭: 役牌 +2（連風牌は +4）
// - 待ち: 両面0 / シャンポン0 / カンチャン2 / ペンチャン2 / 単騎2
// - 門前ロン +10 / ツモ +2
// - 七対子25固定、平和ツモ20固定、10符切り上げ

import { type TileId, isYaochu, isDragon, tileLabel } from './tiles';
import type { StandardParse, WaitType } from './hand';
import type { YakuContext } from './yaku';
import { ruleConfig } from './ruleConfig';

export interface FuPart {
  label: string;
  fu: number;
}

export interface FuResult {
  raw: number;
  rounded: number;
  parts: FuPart[];
  /** 平和ツモ / 七対子など固定符のとき true */
  fixed: boolean;
}

interface FuInput {
  parse: StandardParse;
  wait: WaitType;
  winningSetIndex: number;
  ctx: YakuContext;
  isPinfu: boolean;
}

function ceil10(n: number): number {
  return Math.ceil(n / 10) * 10;
}

function pairFu(pair: TileId, ctx: YakuContext): number {
  if (isDragon(pair)) return 2;
  const isRound = pair === ctx.roundWind;
  const isSeat = pair === ctx.seatWind;
  if (isRound && isSeat) return ruleConfig.renpuuFu; // 連風牌（既定 +4、設定で +2）
  if (isRound || isSeat) return 2;
  return 0;
}

function tripletFu(kind: 'kotsu' | 'kantsu', open: boolean, tileId: TileId): number {
  const yao = isYaochu(tileId);
  if (kind === 'kantsu') {
    if (open) return yao ? 16 : 8;
    return yao ? 32 : 16;
  }
  if (open) return yao ? 4 : 2;
  return yao ? 8 : 4;
}

const WAIT_FU: Record<WaitType, number> = {
  ryanmen: 0,
  shanpon: 0,
  kanchan: 2,
  penchan: 2,
  tanki: 2,
};

const WAIT_LABEL: Record<WaitType, string> = {
  ryanmen: '両面待ち',
  shanpon: 'シャンポン待ち',
  kanchan: 'カンチャン待ち',
  penchan: 'ペンチャン待ち',
  tanki: '単騎待ち',
};

export function calculateChiitoitsuFu(): FuResult {
  return { raw: 25, rounded: 25, parts: [{ label: '七対子', fu: 25 }], fixed: true };
}

export function calculateFu(input: FuInput): FuResult {
  const { parse, wait, ctx, isPinfu } = input;

  // 平和形は固定
  if (isPinfu) {
    if (ctx.tsumo) {
      return { raw: 20, rounded: 20, parts: [{ label: 'ピンフ・ツモ（固定）', fu: 20 }], fixed: true };
    }
    // 門前ロンのピンフ: 20 + 10 = 30 固定
    return {
      raw: 30,
      rounded: 30,
      parts: [
        { label: '副底', fu: 20 },
        { label: '門前ロン', fu: 10 },
      ],
      fixed: true,
    };
  }

  const parts: FuPart[] = [{ label: '副底', fu: 20 }];

  for (const set of parse.sets) {
    if (set.kind === 'shuntsu') continue;
    const fu = tripletFu(set.kind, set.open, set.tiles[0]);
    const openLabel = set.kind === 'kantsu' ? (set.open ? '明槓' : '暗槓') : set.open ? '明刻' : '暗刻';
    parts.push({ label: `${openLabel}（${tileLabel(set.tiles[0])}）`, fu });
  }

  const pf = pairFu(parse.pair, ctx);
  if (pf > 0) parts.push({ label: `雀頭（役牌 ${tileLabel(parse.pair)}）`, fu: pf });

  if (WAIT_FU[wait] > 0) parts.push({ label: WAIT_LABEL[wait], fu: WAIT_FU[wait] });

  if (ctx.menzen && !ctx.tsumo) parts.push({ label: '門前ロン', fu: 10 });
  if (ctx.tsumo) parts.push({ label: 'ツモ', fu: 2 });

  let raw = parts.reduce((s, p) => s + p.fu, 0);

  // 喰いピンフ形のロン（20符）は 30符に引き上げ（Phase 1 では鳴きなしのため通常発生しない）
  if (!ctx.menzen && !ctx.tsumo && raw === 20) raw = 30;

  return { raw, rounded: ceil10(raw), parts, fixed: false };
}
