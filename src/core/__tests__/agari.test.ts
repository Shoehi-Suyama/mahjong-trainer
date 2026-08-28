import { describe, it, expect } from 'vitest';
import { parseTiles } from '../tiles';
import { isAgari, decomposeStandard, decomposeChiitoitsu, enumerateAgariShapes } from '../hand';

describe('isAgari', () => {
  it('標準形（4面子1雀頭）を認識する', () => {
    expect(isAgari(parseTiles('123m 456m 789m 111p 22s'))).toBe(true);
  });
  it('七対子を認識する', () => {
    expect(isAgari(parseTiles('11m 33m 55m 77m 99m 22p 44p'))).toBe(true);
  });
  it('字牌のみの標準形を認識する', () => {
    expect(isAgari(parseTiles('東東東 南南南 西西西 北北北 白白'))).toBe(true);
  });
  it('未完成手は false', () => {
    expect(isAgari(parseTiles('123m 456m 789m 123p 24s'))).toBe(false);
  });
  it('字牌の順子は成立しない', () => {
    expect(isAgari(parseTiles('123m 456m 789m 123s 東南西'))).toBe(false);
  });
});

describe('decomposeStandard', () => {
  it('多面待ちの手は複数の分解を返す', () => {
    const parses = decomposeStandard(parseTiles('11122233344455m'), 0);
    expect(parses.length).toBeGreaterThan(1);
  });
  it('普通の手は1通り', () => {
    const parses = decomposeStandard(parseTiles('123m 456m 789m 111p 22s'), 0);
    expect(parses).toHaveLength(1);
    expect(parses[0].pair).toBe('sou2');
  });
});

describe('decomposeChiitoitsu', () => {
  it('同じ牌4枚は七対子として認めない', () => {
    expect(decomposeChiitoitsu(parseTiles('1111m 22m 33m 44m 55m 66m'))).toBeNull();
  });
  it('7種2枚ずつは成立', () => {
    expect(decomposeChiitoitsu(parseTiles('11m 22m 33m 44m 55m 66p 77p'))).not.toBeNull();
  });
});

describe('enumerateAgariShapes: 待ち判定', () => {
  it('両面待ち', () => {
    const shapes = enumerateAgariShapes({
      concealed: parseTiles('123m 456m 789m 234p 55s'),
      winningTile: 'pin4',
      tsumo: true,
    });
    expect(shapes.some((s) => s.wait === 'ryanmen')).toBe(true);
  });
  it('カンチャン待ち', () => {
    const shapes = enumerateAgariShapes({
      concealed: parseTiles('123m 789m 789m 456p 55s'),
      winningTile: 'pin5',
      tsumo: true,
    });
    expect(shapes.some((s) => s.wait === 'kanchan')).toBe(true);
  });
  it('ペンチャン待ち（12→3）', () => {
    const shapes = enumerateAgariShapes({
      concealed: parseTiles('123m 456m 789m 123p 55s'),
      winningTile: 'pin3',
      tsumo: true,
    });
    expect(shapes.some((s) => s.wait === 'penchan')).toBe(true);
  });
  it('単騎待ち', () => {
    const shapes = enumerateAgariShapes({
      concealed: parseTiles('123m 456m 789m 111p 55s'),
      winningTile: 'sou5',
      tsumo: true,
    });
    expect(shapes.some((s) => s.wait === 'tanki')).toBe(true);
  });
  it('シャンポン待ち', () => {
    const shapes = enumerateAgariShapes({
      concealed: parseTiles('123m 456m 789m 55p 555s'),
      winningTile: 'sou5',
      tsumo: true,
    });
    expect(shapes.some((s) => s.wait === 'shanpon')).toBe(true);
  });
  it('ロンで完成した刻子は明刻扱い（open=true）', () => {
    const shapes = enumerateAgariShapes({
      concealed: parseTiles('123m 456m 789m 55p 555s'),
      winningTile: 'sou5',
      tsumo: false,
    });
    const shanpon = shapes.find((s) => s.wait === 'shanpon');
    expect(shanpon).toBeDefined();
    const souSet = shanpon!.parse.sets.find((x) => x.tiles[0] === 'sou5');
    expect(souSet?.open).toBe(true);
  });
});
