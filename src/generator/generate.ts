// 問題生成の統合。逆算で「素」を作り、analyzeHand で必ず検証してから出題する（仕様 #23, #24）。

import {
  type TileId,
  type HonorTileId,
  ALL_TILE_IDS,
  doraFromIndicator,
  sortTileIds,
} from '../core/tiles';
import type { Meld } from '../core/hand';
import { analyzeHand, type AnalyzeResult } from '../core/analyze';
import { type Rng, mulberry32, pick, randInt, shuffle } from './random';
import {
  type RawHand,
  type BuildContext,
  buildPinfu,
  buildTanyao,
  buildYakuhai,
  buildChiitoitsu,
  buildRiichiOnly,
  buildIipeikou,
  buildSanshoku,
  buildIttsuu,
  buildToitoi,
  buildHonitsu,
  buildChinitsu,
  buildChanta,
  buildKuitan,
  buildOpenYakuhai,
  buildOpenToitoi,
  buildOpenHonitsu,
  buildOpenSanshoku,
} from './builders';

export interface Problem {
  id: string;
  level: number;
  roundWind: HonorTileId;
  seatWind: HonorTileId;
  oya: boolean;
  roundLabel: string;
  seatLabel: string;
  tsumo: boolean;
  riichi: boolean;
  concealed: TileId[]; // 13枚（和了牌は別表示）
  winningTile: TileId;
  melds: Meld[];
  doraIndicators: TileId[];
  result: AnalyzeResult;
  tags: string[];
}

interface Entry {
  name: string;
  build: (rng: Rng, ctx: BuildContext) => RawHand | null;
  accept: (r: AnalyzeResult) => boolean;
}

const yakuNames = (r: AnalyzeResult) => r.han.yaku.map((y) => y.name);

const ENTRIES: Record<string, Entry> = {
  pinfu: {
    name: 'pinfu',
    build: (rng) => buildPinfu(rng),
    accept: (r) => r.valid && yakuNames(r).includes('ピンフ'),
  },
  tanyao: {
    name: 'tanyao',
    build: (rng) => buildTanyao(rng),
    accept: (r) => r.valid && yakuNames(r).includes('タンヤオ'),
  },
  yakuhai: {
    name: 'yakuhai',
    build: (rng, ctx) => buildYakuhai(rng, ctx),
    accept: (r) => r.valid && yakuNames(r).some((n) => n.startsWith('役牌')),
  },
  chiitoitsu: {
    name: 'chiitoitsu',
    build: (rng) => buildChiitoitsu(rng),
    accept: (r) => r.valid && r.form === 'chiitoitsu',
  },
  riichiOnly: {
    name: 'riichiOnly',
    build: (rng) => buildRiichiOnly(rng),
    accept: (r) =>
      r.valid &&
      r.han.yaku.length > 0 &&
      yakuNames(r).every((n) => n === 'リーチ' || n === '門前清自摸和'),
  },
  iipeikou: {
    name: 'iipeikou',
    build: (rng) => buildIipeikou(rng),
    accept: (r) => r.valid && yakuNames(r).includes('一盃口'),
  },
  sanshoku: {
    name: 'sanshoku',
    build: (rng) => buildSanshoku(rng),
    accept: (r) => r.valid && yakuNames(r).includes('三色同順'),
  },
  ittsuu: {
    name: 'ittsuu',
    build: (rng) => buildIttsuu(rng),
    accept: (r) => r.valid && yakuNames(r).includes('一気通貫'),
  },
  toitoi: {
    name: 'toitoi',
    build: (rng) => buildToitoi(rng),
    accept: (r) =>
      r.valid && yakuNames(r).includes('対々和') && r.han.yakuman === 0,
  },
  honitsu: {
    name: 'honitsu',
    build: (rng, ctx) => buildHonitsu(rng, ctx),
    accept: (r) => r.valid && yakuNames(r).includes('混一色') && r.han.yakuman === 0,
  },
  chinitsu: {
    name: 'chinitsu',
    build: (rng) => buildChinitsu(rng),
    accept: (r) => r.valid && yakuNames(r).includes('清一色') && r.han.yakuman === 0,
  },
  chanta: {
    name: 'chanta',
    build: (rng) => buildChanta(rng),
    accept: (r) =>
      r.valid &&
      (yakuNames(r).includes('混全帯幺九') || yakuNames(r).includes('純全帯幺九')) &&
      r.han.yakuman === 0,
  },

  // 副露あり（Lv.6）
  kuitan: {
    name: 'kuitan',
    build: (rng) => buildKuitan(rng),
    accept: (r) => r.valid && yakuNames(r).includes('タンヤオ') && r.form === 'standard',
  },
  openYakuhai: {
    name: 'openYakuhai',
    build: (rng, ctx) => buildOpenYakuhai(rng, ctx),
    accept: (r) => r.valid && yakuNames(r).some((n) => n.startsWith('役牌')),
  },
  openToitoi: {
    name: 'openToitoi',
    build: (rng, ctx) => buildOpenToitoi(rng, ctx),
    accept: (r) => r.valid && yakuNames(r).includes('対々和') && r.han.yakuman === 0,
  },
  openHonitsu: {
    name: 'openHonitsu',
    build: (rng, ctx) => buildOpenHonitsu(rng, ctx),
    accept: (r) => r.valid && yakuNames(r).includes('混一色') && r.han.yakuman === 0,
  },
  openSanshoku: {
    name: 'openSanshoku',
    build: (rng) => buildOpenSanshoku(rng),
    accept: (r) => r.valid && yakuNames(r).includes('三色同順'),
  },
};

interface LevelSpec {
  entries: string[];
  han: [number, number];
  doraProb: number;
  minFu?: number;
}

const LEVELS: Record<number, LevelSpec> = {
  1: { entries: ['tanyao', 'yakuhai', 'riichiOnly', 'pinfu'], han: [1, 2], doraProb: 0 },
  2: { entries: ['pinfu', 'tanyao', 'yakuhai', 'iipeikou', 'sanshoku', 'ittsuu'], han: [2, 3], doraProb: 0.3 },
  3: {
    entries: ['pinfu', 'yakuhai', 'iipeikou', 'chiitoitsu', 'sanshoku', 'ittsuu', 'chanta', 'toitoi'],
    han: [3, 5],
    doraProb: 0.6,
  },
  4: {
    entries: ['yakuhai', 'riichiOnly', 'chiitoitsu', 'toitoi', 'chanta'],
    han: [2, 5],
    doraProb: 0.5,
    minFu: 40,
  },
  5: {
    entries: ['pinfu', 'chiitoitsu', 'honitsu', 'chinitsu', 'sanshoku', 'ittsuu'],
    han: [2, 8],
    doraProb: 0.6,
  },
  6: {
    entries: ['kuitan', 'openYakuhai', 'openToitoi', 'openHonitsu', 'openSanshoku'],
    han: [1, 6],
    doraProb: 0.4,
  },
};

const SEAT_LABEL: Record<HonorTileId, string> = {
  east: '東家', south: '南家', west: '西家', north: '北家',
  white: '', green: '', red: '',
};

function pickDoraIndicatorFavoring(concealed: TileId[], rng: Rng): TileId | null {
  for (const ind of shuffle(rng, [...ALL_TILE_IDS])) {
    const dora = doraFromIndicator(ind);
    const n = concealed.filter((t) => t === dora).length;
    if (n >= 1 && n <= 2) return ind;
  }
  return null;
}

function pickZeroDoraIndicator(concealed: TileId[], rng: Rng): TileId {
  for (const ind of shuffle(rng, [...ALL_TILE_IDS])) {
    const dora = doraFromIndicator(ind);
    if (!concealed.includes(dora)) return ind;
  }
  return pick(rng, ALL_TILE_IDS);
}

function removeOne(tiles: TileId[], target: TileId): TileId[] {
  const out = [...tiles];
  const i = out.indexOf(target);
  if (i >= 0) out.splice(i, 1);
  return out;
}

function deriveTags(p: Omit<Problem, 'tags'>): string[] {
  const t = new Set<string>();
  t.add(p.tsumo ? 'tsumo' : 'ron');
  t.add(p.oya ? 'oya' : 'child');
  const names = p.result.han.yaku.map((y) => y.name);
  if (names.includes('ピンフ')) t.add('pinfu');
  if (names.includes('リーチ')) t.add('riichi');
  if (names.some((n) => n.startsWith('役牌'))) t.add('yakuhai');
  if (p.result.form === 'chiitoitsu') t.add('chiitoitsu');
  const TAGGED_YAKU: Record<string, string> = {
    三色同順: 'sanshoku', 一気通貫: 'ittsuu', 対々和: 'toitoi', 三暗刻: 'sanankou',
    混一色: 'honitsu', 清一色: 'chinitsu', 混全帯幺九: 'chanta', 純全帯幺九: 'chanta',
    一盃口: 'iipeikou', 二盃口: 'iipeikou',
  };
  for (const n of names) if (TAGGED_YAKU[n]) t.add(TAGGED_YAKU[n]);
  if (names.includes('タンヤオ') && p.melds.length > 0) t.add('kuitan');
  if (p.melds.length > 0) t.add('meld');
  if (p.result.han.dora > 0) t.add('dora');
  if (p.result.form === 'standard' && p.result.fu.rounded >= 40) t.add('fu');
  if (p.result.han.total <= 2) t.add('basic');
  return [...t];
}

export function generateScoreProblem(level = 1, seed?: number): Problem {
  const rng: Rng = seed != null ? mulberry32(seed) : mulberry32((Math.random() * 2 ** 32) >>> 0);
  const spec = LEVELS[level] ?? LEVELS[1];

  for (let attempt = 0; attempt < 800; attempt++) {
    const roundWind: HonorTileId = rng() < 0.7 ? 'east' : 'south';
    const seatWind: HonorTileId = pick(rng, ['east', 'south', 'west', 'north'] as HonorTileId[]);
    const oya = seatWind === 'east';
    const ctx: BuildContext = { roundWind, seatWind };

    const entry = ENTRIES[pick(rng, spec.entries)];
    const raw = entry.build(rng, ctx);
    if (!raw) continue;
    const melds: Meld[] = raw.melds ?? [];
    if (raw.concealed.length !== 14 - 3 * melds.length || !raw.concealed.includes(raw.winningTile)) {
      continue;
    }
    const allTiles = [...raw.concealed, ...melds.flatMap((m) => m.tiles)];

    const baseInput = {
      concealed: raw.concealed,
      melds,
      winningTile: raw.winningTile,
      tsumo: raw.tsumo,
      riichi: raw.riichi,
      oya,
      roundWind,
      seatWind,
    };
    const base = analyzeHand(baseInput);
    if (!entry.accept(base)) continue;

    let doraIndicators: TileId[] = [];
    if (rng() < spec.doraProb) {
      const ind = pickDoraIndicatorFavoring(allTiles, rng);
      doraIndicators = ind ? [ind] : [pickZeroDoraIndicator(allTiles, rng)];
    } else {
      doraIndicators = [pickZeroDoraIndicator(allTiles, rng)];
    }

    const result = analyzeHand({ ...baseInput, doraIndicators });
    if (!result.valid || !entry.accept(result)) continue;

    const han = result.han.total;
    const hiCap = spec.han[1] + (result.han.dora > 0 ? 2 : 0);
    if (han < spec.han[0] || han > hiCap) continue;
    if (spec.minFu && !(result.form === 'standard' && result.fu.rounded >= spec.minFu)) continue;
    if (result.score.limit === '役満') continue;

    const kyoku = randInt(rng, 1, 4);
    const partial: Omit<Problem, 'tags'> = {
      id: `${Date.now().toString(36)}-${attempt}`,
      level,
      roundWind,
      seatWind,
      oya,
      roundLabel: `${roundWind === 'east' ? '東' : '南'}${kyoku}局`,
      seatLabel: SEAT_LABEL[seatWind],
      tsumo: raw.tsumo,
      riichi: raw.riichi,
      concealed: sortTileIds(removeOne(raw.concealed, raw.winningTile)),
      winningTile: raw.winningTile,
      melds,
      doraIndicators,
      result,
    };
    return { ...partial, tags: deriveTags(partial) };
  }

  throw new Error(`generateScoreProblem: レベル${level}の問題を生成できませんでした`);
}

const SCORE_LADDER = [
  1000, 1300, 1500, 1600, 2000, 2300, 2600, 2900, 3200, 3900, 4000, 4500, 5200, 5800,
  6400, 7700, 8000, 9600, 11600, 12000, 16000, 18000, 24000, 32000, 36000, 48000,
];

/** 選択式の点数候補（正解＋近い誤答）。 */
export function scoreChoices(correctTotal: number, rng: Rng = mulberry32(correctTotal), n = 6): number[] {
  let idx = SCORE_LADDER.indexOf(correctTotal);
  if (idx < 0) {
    // ラダー外の値はそのまま候補に含め、近傍を補う
    idx = SCORE_LADDER.findIndex((v) => v > correctTotal);
    if (idx < 0) idx = SCORE_LADDER.length - 1;
  }
  const set = new Set<number>([correctTotal]);
  let spread = 1;
  while (set.size < n && spread < SCORE_LADDER.length) {
    for (const d of [spread, -spread]) {
      const j = idx + d;
      if (j >= 0 && j < SCORE_LADDER.length) set.add(SCORE_LADDER[j]);
    }
    spread++;
  }
  return shuffle(rng, [...set]).slice(0, n).sort((a, b) => a - b);
}
