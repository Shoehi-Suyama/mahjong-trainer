// 役判定。Phase1（リーチ/門前ツモ/タンヤオ/ピンフ/役牌/一盃口）に加え、
// Phase2 の主要役（三色/一通/対々和/三暗刻/チャンタ/混一/清一/小三元/二盃口 ほか）と
// 主要な役満を判定する（仕様 #26, #27, #32, #37）。ドラは翻集計側で別枠。

import {
  type TileId,
  type HonorTileId,
  tile,
  isDragon,
  isWind,
  isSimple,
  isTerminal,
  isYaochu,
  isHonorId,
} from './tiles';
import type { StandardParse, ChiitoitsuParse, KokushiParse, WaitType, ParsedSet } from './hand';

export interface YakuContext {
  roundWind: HonorTileId;
  seatWind: HonorTileId;
  riichi: boolean;
  doubleRiichi?: boolean;
  ippatsu?: boolean;
  tsumo: boolean;
  menzen: boolean;
  // 状況役（任意）
  rinshan?: boolean; // 嶺上開花
  chankan?: boolean; // 槍槓
  haitei?: boolean; // 海底摸月
  houtei?: boolean; // 河底撈魚
  tenho?: boolean; // 天和
  chiho?: boolean; // 地和
}

export interface Yaku {
  name: string;
  han: number;
  /** 役満なら true（han は 0 扱い、点数計算は yakuman 倍数で行う） */
  yakuman?: boolean;
}

const DRAGON_NAME: Record<string, string> = { white: '白', green: '發', red: '中' };
const WIND_NAME: Record<string, string> = { east: '東', south: '南', west: '西', north: '北' };

const isSeq = (s: ParsedSet) => s.kind === 'shuntsu';
const isTri = (s: ParsedSet) => s.kind === 'kotsu' || s.kind === 'kantsu';
const seqStart = (s: ParsedSet) => Math.min(...s.tiles.map((t) => tile(t).value));
const suitOf = (id: TileId) => tile(id).suit;

function isYakuhaiTile(id: TileId, ctx: YakuContext): boolean {
  return isDragon(id) || id === ctx.roundWind || id === ctx.seatWind;
}

/** 数牌の使用スート（字牌は除く）。 */
function numberSuits(tiles: TileId[]): Set<string> {
  const s = new Set<string>();
  for (const t of tiles) if (!isHonorId(t)) s.add(suitOf(t));
  return s;
}

// ---- 複数形態で共有できる役（一色・么九系） ----

function flushYaku(allTiles: TileId[], menzen: boolean): Yaku[] {
  const suits = numberSuits(allTiles);
  if (suits.size !== 1) return [];
  const hasHonor = allTiles.some(isHonorId);
  if (!hasHonor) return [{ name: '清一色', han: menzen ? 6 : 5 }];
  return [{ name: '混一色', han: menzen ? 3 : 2 }];
}

function allTerminalHonorYaku(allTiles: TileId[]): Yaku[] {
  if (!allTiles.every(isYaochu)) return [];
  if (allTiles.every(isHonorId)) return [{ name: '字一色', han: 0, yakuman: true }];
  if (allTiles.every(isTerminal)) return [{ name: '清老頭', han: 0, yakuman: true }];
  return [{ name: '混老頭', han: 2 }];
}

// ---- 標準形の役 ----

export function detectStandardYaku(
  parse: StandardParse,
  wait: WaitType,
  allTiles: TileId[],
  ctx: YakuContext,
): Yaku[] {
  const yaku: Yaku[] = [];
  const sets = parse.sets;
  const allSeq = sets.every(isSeq);
  const allTri = sets.every(isTri);
  const anyHonor = allTiles.some(isHonorId);

  // タンヤオ
  if (allTiles.every(isSimple)) yaku.push({ name: 'タンヤオ', han: 1 });

  // ピンフ
  if (ctx.menzen && allSeq && !isYakuhaiTile(parse.pair, ctx) && wait === 'ryanmen') {
    yaku.push({ name: 'ピンフ', han: 1 });
  }

  // 一盃口 / 二盃口（門前限定）
  if (ctx.menzen) {
    const sig = new Map<string, number>();
    for (const s of sets) if (isSeq(s)) sig.set(s.tiles.join(''), (sig.get(s.tiles.join('')) ?? 0) + 1);
    let dbl = 0;
    for (const c of sig.values()) dbl += Math.floor(c / 2);
    if (dbl === 2) yaku.push({ name: '二盃口', han: 3 });
    else if (dbl === 1) yaku.push({ name: '一盃口', han: 1 });
  }

  // 三色同順
  {
    const bySuit = new Map<number, Set<string>>();
    for (const s of sets) {
      if (!isSeq(s)) continue;
      const st = seqStart(s);
      if (!bySuit.has(st)) bySuit.set(st, new Set());
      bySuit.get(st)!.add(suitOf(s.tiles[0]));
    }
    if ([...bySuit.values()].some((set) => set.size === 3)) {
      yaku.push({ name: '三色同順', han: ctx.menzen ? 2 : 1 });
    }
  }

  // 三色同刻
  {
    const byVal = new Map<number, Set<string>>();
    for (const s of sets) {
      if (!isTri(s) || isHonorId(s.tiles[0])) continue;
      const v = tile(s.tiles[0]).value;
      if (!byVal.has(v)) byVal.set(v, new Set());
      byVal.get(v)!.add(suitOf(s.tiles[0]));
    }
    if ([...byVal.values()].some((set) => set.size === 3)) yaku.push({ name: '三色同刻', han: 2 });
  }

  // 一気通貫
  {
    const bySuit = new Map<string, Set<number>>();
    for (const s of sets) {
      if (!isSeq(s)) continue;
      const su = suitOf(s.tiles[0]);
      if (!bySuit.has(su)) bySuit.set(su, new Set());
      bySuit.get(su)!.add(seqStart(s));
    }
    for (const starts of bySuit.values()) {
      if (starts.has(1) && starts.has(4) && starts.has(7)) {
        yaku.push({ name: '一気通貫', han: ctx.menzen ? 2 : 1 });
        break;
      }
    }
  }

  // 対々和
  if (allTri) yaku.push({ name: '対々和', han: 2 });

  // 三暗刻 / （四暗刻は役満側）
  const ankou = sets.filter((s) => isTri(s) && !s.open).length;
  if (ankou === 3) yaku.push({ name: '三暗刻', han: 2 });

  // 三槓子
  if (sets.filter((s) => s.kind === 'kantsu').length === 3) yaku.push({ name: '三槓子', han: 2 });

  // 役牌
  for (const s of sets) {
    if (!isTri(s)) continue;
    const id = s.tiles[0];
    if (isDragon(id)) yaku.push({ name: `役牌（${DRAGON_NAME[id]}）`, han: 1 });
    else {
      if (id === ctx.roundWind) yaku.push({ name: `役牌（場風 ${WIND_NAME[id]}）`, han: 1 });
      if (id === ctx.seatWind) yaku.push({ name: `役牌（自風 ${WIND_NAME[id]}）`, han: 1 });
    }
  }

  // 小三元
  {
    const dragonTri = sets.filter((s) => isTri(s) && isDragon(s.tiles[0])).length;
    if (dragonTri === 2 && isDragon(parse.pair)) yaku.push({ name: '小三元', han: 2 });
  }

  // 么九系（混老頭 / チャンタ / ジュンチャン）
  const th = allTerminalHonorYaku(allTiles);
  if (th.length > 0) {
    yaku.push(...th);
  } else {
    const groups = [...sets.map((s) => s.tiles), [parse.pair, parse.pair]];
    const everyGroupYaochu = groups.every((g) => g.some(isYaochu));
    const hasSeq = sets.some(isSeq);
    if (everyGroupYaochu && hasSeq) {
      if (anyHonor) yaku.push({ name: '混全帯幺九', han: ctx.menzen ? 2 : 1 });
      else yaku.push({ name: '純全帯幺九', han: ctx.menzen ? 3 : 2 });
    }
  }

  // 一色
  yaku.push(...flushYaku(allTiles, ctx.menzen));

  return yaku;
}

export function detectStandardYakuman(
  parse: StandardParse,
  wait: WaitType,
  allTiles: TileId[],
  ctx: YakuContext,
): Yaku[] {
  const yaku: Yaku[] = [];
  const sets = parse.sets;

  // 四暗刻（ロンで完成した刻子は open 扱いのため自動的に除外される）
  const ankou = sets.filter((s) => isTri(s) && !s.open).length;
  if (ankou === 4) yaku.push({ name: wait === 'tanki' ? '四暗刻単騎' : '四暗刻', han: 0, yakuman: true });

  // 大三元
  if (sets.filter((s) => isTri(s) && isDragon(s.tiles[0])).length === 3) {
    yaku.push({ name: '大三元', han: 0, yakuman: true });
  }

  // 小四喜 / 大四喜
  const windTri = sets.filter((s) => isTri(s) && isWind(s.tiles[0])).length;
  if (windTri === 4) yaku.push({ name: '大四喜', han: 0, yakuman: true });
  else if (windTri === 3 && isWind(parse.pair)) yaku.push({ name: '小四喜', han: 0, yakuman: true });

  // 字一色 / 清老頭（allTerminalHonorYaku で役満判定済みのものを拾う）
  for (const y of allTerminalHonorYaku(allTiles)) if (y.yakuman) yaku.push(y);

  // 緑一色
  const GREEN = new Set<TileId>(['sou2', 'sou3', 'sou4', 'sou6', 'sou8', 'green']);
  if (allTiles.every((t) => GREEN.has(t))) yaku.push({ name: '緑一色', han: 0, yakuman: true });

  // 四槓子
  if (sets.filter((s) => s.kind === 'kantsu').length === 4) yaku.push({ name: '四槓子', han: 0, yakuman: true });

  // 九蓮宝燈（門前・一色・字牌なし・1112345678999+1）
  if (ctx.menzen && !allTiles.some(isHonorId) && numberSuits(allTiles).size === 1) {
    const c = new Array(10).fill(0);
    for (const t of allTiles) c[tile(t).value]++;
    const ok =
      c[1] >= 3 && c[9] >= 3 && [2, 3, 4, 5, 6, 7, 8].every((v) => c[v] >= 1) && allTiles.length === 14;
    if (ok) yaku.push({ name: '九蓮宝燈', han: 0, yakuman: true });
  }

  return yaku;
}

// ---- 七対子形 ----

export function detectChiitoitsuYaku(parse: ChiitoitsuParse, _ctx: YakuContext): Yaku[] {
  const tiles = parse.pairs.flatMap((p) => [p, p]);
  const yaku: Yaku[] = [{ name: '七対子', han: 2 }];
  if (tiles.every(isSimple)) yaku.push({ name: 'タンヤオ', han: 1 });
  const th = allTerminalHonorYaku(tiles);
  if (th.length > 0) yaku.push(...th.filter((y) => !y.yakuman)); // 混老頭
  yaku.push(...flushYaku(tiles, true));
  return yaku;
}

export function detectChiitoitsuYakuman(parse: ChiitoitsuParse): Yaku[] {
  const tiles = parse.pairs.flatMap((p) => [p, p]);
  return allTerminalHonorYaku(tiles).filter((y) => y.yakuman); // 字一色
}

// ---- 国士無双 ----

export function detectKokushiYaku(parse: KokushiParse): Yaku[] {
  return [
    parse.thirteenWait
      ? { name: '国士無双十三面', han: 0, yakuman: true }
      : { name: '国士無双', han: 0, yakuman: true },
  ];
}

// ---- 両形態共通（リーチ・ツモ・状況役） ----

export function contextYaku(ctx: YakuContext): Yaku[] {
  const yaku: Yaku[] = [];
  if (ctx.doubleRiichi) yaku.push({ name: 'ダブルリーチ', han: 2 });
  else if (ctx.riichi) yaku.push({ name: 'リーチ', han: 1 });
  if (ctx.ippatsu && (ctx.riichi || ctx.doubleRiichi)) yaku.push({ name: '一発', han: 1 });
  if (ctx.menzen && ctx.tsumo) yaku.push({ name: '門前清自摸和', han: 1 });
  if (ctx.rinshan) yaku.push({ name: '嶺上開花', han: 1 });
  if (ctx.chankan) yaku.push({ name: '槍槓', han: 1 });
  if (ctx.haitei) yaku.push({ name: '海底摸月', han: 1 });
  if (ctx.houtei) yaku.push({ name: '河底撈魚', han: 1 });
  if (ctx.tenho) yaku.push({ name: '天和', han: 0, yakuman: true });
  if (ctx.chiho) yaku.push({ name: '地和', han: 0, yakuman: true });
  return yaku;
}

export { isHonorId, tile };
