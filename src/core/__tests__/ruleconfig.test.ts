import { describe, it, expect, afterEach } from 'vitest';
import { parseTiles } from '../tiles';
import { analyzeHand } from '../analyze';
import { setRuleConfig } from '../ruleConfig';

afterEach(() => setRuleConfig({ renpuuFu: 4 }));

// 東場・東家（親）で 東 を雀頭にした手。白暗刻(8) + 東雀頭(連風) + 門前ロン(10)。
function renpuuHand() {
  return analyzeHand({
    concealed: parseTiles('123m 456p 789s 白白白 東東'),
    winningTile: 'man1', // 123m 両面
    tsumo: false,
    riichi: true,
    oya: true,
    roundWind: 'east',
    seatWind: 'east',
  });
}

const pairFu = (r: ReturnType<typeof renpuuHand>) =>
  r.fu.parts.find((p) => p.label.includes('雀頭'))?.fu;

describe('連風牌の雀頭符（ruleConfig.renpuuFu）', () => {
  it('既定 +4: 20 + 白暗刻8 + 連風東4 + 門前ロン10 = 42 → 50符', () => {
    setRuleConfig({ renpuuFu: 4 });
    const r = renpuuHand();
    expect(pairFu(r)).toBe(4);
    expect(r.fu.raw).toBe(42);
    expect(r.fu.rounded).toBe(50);
  });

  it('+2 設定: 連風東2 → 20 + 8 + 2 + 10 = 40 → 40符', () => {
    setRuleConfig({ renpuuFu: 2 });
    const r = renpuuHand();
    expect(pairFu(r)).toBe(2);
    expect(r.fu.raw).toBe(40);
    expect(r.fu.rounded).toBe(40);
  });
});
