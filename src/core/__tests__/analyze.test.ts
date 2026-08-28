import { describe, it, expect } from 'vitest';
import { parseTiles } from '../tiles';
import { analyzeHand, type AnalyzeInput } from '../analyze';

type RunInput = Partial<AnalyzeInput> &
  Pick<AnalyzeInput, 'concealed' | 'winningTile' | 'tsumo'>;

function run(p: RunInput) {
  return analyzeHand({
    oya: false,
    roundWind: 'east',
    seatWind: 'south',
    ...p,
  });
}

describe('analyzeHand: 統合', () => {
  it('リーチ・タンヤオ・ピンフ 子ロン → 30符3翻 3900点（仕様 #15）', () => {
    const r = run({
      concealed: parseTiles('234m 567m 234p 678p 55s'),
      winningTile: 'pin6',
      tsumo: false,
      riichi: true,
    });
    expect(r.valid).toBe(true);
    const names = r.han.yaku.map((y) => y.name).sort();
    expect(names).toEqual(['タンヤオ', 'ピンフ', 'リーチ']);
    expect(r.han.total).toBe(3);
    expect(r.fu.rounded).toBe(30);
    expect(r.score.total).toBe(3900);
  });

  it('ピンフ・ツモ 子 → 20符2翻 400/700（合計1500）', () => {
    const r = run({
      concealed: parseTiles('123m 789m 234p 678p 55s'),
      winningTile: 'pin6',
      tsumo: true,
    });
    expect(r.han.yaku.map((y) => y.name).sort()).toEqual(['ピンフ', '門前清自摸和']);
    expect(r.fu.rounded).toBe(20);
    expect(r.score.total).toBe(1500);
    expect(r.score.payment).toEqual({ type: 'tsumo', ko: 400, oya: 700 });
  });

  it('七対子・リーチ 子ロン → 25符3翻 3200点', () => {
    const r = run({
      concealed: parseTiles('11m 88m 22p 99p 33s 55s 77s'),
      winningTile: 'sou7',
      tsumo: false,
      riichi: true,
    });
    expect(r.form).toBe('chiitoitsu');
    expect(r.han.total).toBe(3);
    expect(r.fu.rounded).toBe(25);
    expect(r.score.total).toBe(3200);
  });

  it('役牌（中）暗刻・門前ツモ 子 → 30符2翻 500/1000（合計2000）', () => {
    const r = run({
      concealed: parseTiles('123m 456m 789p 中中中 55p'),
      winningTile: 'red',
      tsumo: true,
    });
    const names = r.han.yaku.map((y) => y.name).sort();
    expect(names).toEqual(['役牌（中）', '門前清自摸和']);
    expect(r.fu.rounded).toBe(30);
    expect(r.score.total).toBe(2000);
  });

  it('一盃口・リーチ 子ロン（カンチャン待ち）→ 40符2翻 2600点', () => {
    const r = run({
      concealed: parseTiles('123m 123m 456p 789p 55s'),
      winningTile: 'pin8', // 789p のカンチャン → ピンフ不成立
      tsumo: false,
      riichi: true,
    });
    expect(r.han.yaku.map((y) => y.name)).toContain('一盃口');
    expect(r.han.yaku.map((y) => y.name)).not.toContain('ピンフ');
    expect(r.han.total).toBe(2);
    expect(r.fu.rounded).toBe(40); // 20 + 門前ロン10 + カンチャン2 = 32 → 40
    expect(r.score.total).toBe(2600);
  });

  it('ドラは役ではない: 役なしの手は valid=false（仕様 #37）', () => {
    const r = run({
      // 北(客風)刻子でピンフ・役牌なし、字牌ありでタンヤオなし、一盃口・一通・三色なし
      concealed: parseTiles('234m 567m 678s 北北北 55p'),
      winningTile: 'north',
      tsumo: false,
      doraIndicators: parseTiles('9p'), // ドラ=1p、手に無し。仮にあっても役にはならない
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('役なし');
  });

  it('ドラ表示牌からドラを数えて翻に加算（別枠）', () => {
    const r = run({
      concealed: parseTiles('234m 567m 234p 678p 55s'),
      winningTile: 'pin6',
      tsumo: false,
      riichi: true,
      doraIndicators: parseTiles('1s'), // ドラ = 2s ではなく… 55s のためドラ表示1s→ドラ2s、手に無し
    });
    // 手にドラが無いので dora=0、リーチ+タンヤオ+ピンフの3翻のまま
    expect(r.han.dora).toBe(0);
    expect(r.han.total).toBe(3);

    const r2 = run({
      concealed: parseTiles('234m 567m 234p 678p 55s'),
      winningTile: 'pin6',
      tsumo: false,
      riichi: true,
      doraIndicators: parseTiles('4s'), // ドラ = 5s、雀頭に2枚
    });
    expect(r2.han.dora).toBe(2);
    expect(r2.han.total).toBe(5);
    expect(r2.score.limit).toBe('満貫');
    expect(r2.score.total).toBe(8000);
  });

  it('親のリーチのみ 40符1翻 → 2000点', () => {
    const r = run({
      oya: true,
      seatWind: 'east',
      concealed: parseTiles('234m 567m 99m 234p 678p'),
      winningTile: 'man9', // 単騎
      tsumo: false,
      riichi: true,
    });
    expect(r.han.total).toBe(1);
    expect(r.fu.rounded).toBe(40); // 20 + 単騎2 + 門前ロン10 = 32 → 40
    expect(r.score.total).toBe(2000);
  });
});
