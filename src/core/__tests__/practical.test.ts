import { describe, it, expect } from 'vitest';
import { parseTiles } from '../tiles';
import { emptyPracticalInput, validatePractical, calcPractical } from '../practical';
import type { PracticalInput } from '../practical';

function base(over: Partial<PracticalInput>): PracticalInput {
  return { ...emptyPracticalInput(), ...over };
}

describe('validatePractical（仕様 #29）', () => {
  it('アガリ牌未指定を検出', () => {
    const errs = validatePractical(
      base({ concealed: parseTiles('123m 456m 789m 123p 55s'), winningTile: null }),
    );
    expect(errs).toContain('アガリ牌が指定されていません');
  });

  it('枚数不正を検出', () => {
    const errs = validatePractical(base({ concealed: parseTiles('123m 456m'), winningTile: 'man1' }));
    expect(errs.some((e) => e.includes('枚数'))).toBe(true);
  });

  it('同じ牌5枚以上を検出', () => {
    const errs = validatePractical(
      base({ concealed: parseTiles('1111m 1m 456m 789m 55p'), winningTile: 'man1' }),
    );
    expect(errs).toContain('同じ牌が5枚以上あります');
  });

  it('アガリ形でない手を検出', () => {
    const errs = validatePractical(
      base({ concealed: parseTiles('123m 456m 789m 12p 55s 9s'), winningTile: 'man1' }),
    );
    expect(errs).toContain('アガリの形になっていません');
  });

  it('副露ありでリーチを検出', () => {
    const errs = validatePractical(
      base({
        concealed: parseTiles('123m 456m 789m 55p'),
        melds: [{ kind: 'pon', tiles: parseTiles('東東東'), open: true }],
        winningTile: 'man1',
        riichi: true,
      }),
    );
    expect(errs).toContain('副露しているのでリーチはできません');
  });

  it('正常な入力はエラーなし', () => {
    const errs = validatePractical(
      base({ concealed: parseTiles('234m 567m 234p 678p 55s'), winningTile: 'pin6', riichi: true }),
    );
    expect(errs).toEqual([]);
  });
});

describe('calcPractical', () => {
  it('リーチ・タンヤオ・ピンフ 子ロン → 30符3翻 3900点', () => {
    const r = calcPractical(
      base({
        concealed: parseTiles('234m 567m 234p 678p 55s'),
        winningTile: 'pin6',
        tsumo: false,
        riichi: true,
        oya: false,
      }),
    );
    expect(r.valid).toBe(true);
    expect(r.han.total).toBe(3);
    expect(r.fu.rounded).toBe(30);
    expect(r.score.total).toBe(3900);
  });

  it('副露＋役牌＋本場＋供託', () => {
    const r = calcPractical(
      base({
        concealed: parseTiles('123m 456p 789s 99m'),
        melds: [{ kind: 'pon', tiles: parseTiles('中中中'), open: true }],
        winningTile: 'man1',
        tsumo: false,
        oya: false,
        honba: 1,
        kyotaku: 1,
      }),
    );
    expect(r.valid).toBe(true);
    expect(r.han.yaku.map((y) => y.name)).toContain('役牌（中）');
    // 素点 + 1本場300 + 供託1000
    expect(r.score.total).toBe(r.score.baseTotal + 300 + 1000);
  });

  it('嶺上開花が状況役として付く', () => {
    const r = calcPractical(
      base({
        concealed: parseTiles('234m 567m 234p 678p 55s'),
        winningTile: 'pin6',
        tsumo: true,
        rinshan: true,
        oya: false,
      }),
    );
    expect(r.han.yaku.map((y) => y.name)).toContain('嶺上開花');
  });
});
