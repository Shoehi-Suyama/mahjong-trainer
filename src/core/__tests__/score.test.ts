import { describe, it, expect } from 'vitest';
import { calculateScore, basicPoints } from '../score';

// 仕様 #57 の既知の正解と一致することを確認する。

describe('子ロン（仕様 #57）', () => {
  const cases: [number, number, number][] = [
    [30, 1, 1000],
    [30, 2, 2000],
    [30, 3, 3900],
    [30, 4, 7700],
    [40, 1, 1300],
    [40, 2, 2600],
    [40, 3, 5200],
    [50, 1, 1600],
    [50, 2, 3200],
    [50, 3, 6400],
  ];
  for (const [fu, han, expected] of cases) {
    it(`${fu}符${han}翻 子ロン → ${expected}点`, () => {
      const r = calculateScore({ han, fu, oya: false, tsumo: false });
      expect(r.total).toBe(expected);
      expect(r.payment).toEqual({ type: 'ron', amount: expected });
    });
  }
});

describe('親ロン', () => {
  const cases: [number, number, number][] = [
    [30, 1, 1500],
    [30, 2, 2900],
    [30, 3, 5800],
    [30, 4, 11600],
    [40, 2, 3900],
    [40, 3, 7700],
    [50, 3, 9600],
  ];
  for (const [fu, han, expected] of cases) {
    it(`${fu}符${han}翻 親ロン → ${expected}点`, () => {
      expect(calculateScore({ han, fu, oya: true, tsumo: false }).total).toBe(expected);
    });
  }
});

describe('子ツモ', () => {
  it('30符3翻 子ツモ → 1000/2000（計4000）', () => {
    const r = calculateScore({ han: 3, fu: 30, oya: false, tsumo: true });
    expect(r.payment).toEqual({ type: 'tsumo', ko: 1000, oya: 2000 });
    expect(r.total).toBe(4000);
  });
  it('40符4翻 子ツモ → 満貫 2000/4000（計8000）', () => {
    const r = calculateScore({ han: 4, fu: 40, oya: false, tsumo: true });
    expect(r.total).toBe(8000);
    expect(r.limit).toBe('満貫');
  });
  it('平和ツモ 20符2翻 子 → 400/700（計1500）', () => {
    const r = calculateScore({ han: 2, fu: 20, oya: false, tsumo: true });
    expect(r.payment).toEqual({ type: 'tsumo', ko: 400, oya: 700 });
    expect(r.total).toBe(1500);
  });
});

describe('親ツモ', () => {
  it('30符3翻 親ツモ → 2000オール（計6000）', () => {
    const r = calculateScore({ han: 3, fu: 30, oya: true, tsumo: true });
    expect(r.payment).toEqual({ type: 'tsumo', ko: 2000 });
    expect(r.total).toBe(6000);
  });
});

describe('満貫以上（仕様 #32）', () => {
  it('5翻 → 満貫（子ロン8000 / 親ロン12000）', () => {
    expect(calculateScore({ han: 5, fu: 30, oya: false, tsumo: false }).total).toBe(8000);
    expect(calculateScore({ han: 5, fu: 30, oya: true, tsumo: false }).total).toBe(12000);
  });
  it('6翻 → 跳満（子12000 / 親18000）', () => {
    expect(calculateScore({ han: 6, fu: 40, oya: false, tsumo: false }).total).toBe(12000);
    expect(calculateScore({ han: 7, fu: 40, oya: true, tsumo: false }).total).toBe(18000);
  });
  it('8翻 → 倍満（子16000）', () => {
    expect(calculateScore({ han: 8, fu: 30, oya: false, tsumo: false }).total).toBe(16000);
  });
  it('11翻 → 三倍満（子24000）', () => {
    expect(calculateScore({ han: 11, fu: 30, oya: false, tsumo: false }).total).toBe(24000);
  });
  it('13翻 → 役満（子32000 / 親48000）', () => {
    expect(calculateScore({ han: 13, fu: 30, oya: false, tsumo: false }).total).toBe(32000);
    expect(calculateScore({ han: 13, fu: 30, oya: true, tsumo: false }).total).toBe(48000);
  });
  it('4翻30符は満貫にならない（7700）', () => {
    expect(basicPoints(4, 30).limit).toBeNull();
    expect(calculateScore({ han: 4, fu: 30, oya: false, tsumo: false }).total).toBe(7700);
  });
  it('4翻40符は満貫（切り上げではなく基本点2000到達）', () => {
    expect(calculateScore({ han: 4, fu: 40, oya: false, tsumo: false }).total).toBe(8000);
  });
});

describe('本場・供託（仕様 #58）', () => {
  it('30符3翻 子ロン 2本場 → 3900 + 600 = 4500', () => {
    const r = calculateScore({ han: 3, fu: 30, oya: false, tsumo: false, honba: 2 });
    expect(r.payment).toEqual({ type: 'ron', amount: 4500 });
    expect(r.total).toBe(4500);
    expect(r.baseTotal).toBe(3900);
  });

  it('30符3翻 子ツモ 1本場 → 1100/2100（各 +100）計 4300', () => {
    const r = calculateScore({ han: 3, fu: 30, oya: false, tsumo: true, honba: 1 });
    expect(r.payment).toEqual({ type: 'tsumo', ko: 1100, oya: 2100 });
    expect(r.total).toBe(4300); // 素点4000 + 本場300
  });

  it('30符3翻 親ツモ 3本場 → 2300オール 計 6900', () => {
    const r = calculateScore({ han: 3, fu: 30, oya: true, tsumo: true, honba: 3 });
    expect(r.payment).toEqual({ type: 'tsumo', ko: 2300 });
    expect(r.total).toBe(6900); // 素点6000 + 本場900
  });

  it('供託1000点は和了者の収入に加算（放銃者の支払いは不変）', () => {
    const r = calculateScore({ han: 3, fu: 30, oya: false, tsumo: false, kyotaku: 1 });
    expect(r.payment).toEqual({ type: 'ron', amount: 3900 });
    expect(r.total).toBe(4900);
  });

  it('本場と供託の同時適用: 40符3翻 子ロン 1本場 + 供託2本 → 5200 + 300 + 2000 = 7500', () => {
    const r = calculateScore({ han: 3, fu: 40, oya: false, tsumo: false, honba: 1, kyotaku: 2 });
    expect(r.total).toBe(7500);
  });
});
