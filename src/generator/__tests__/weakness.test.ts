import { describe, it, expect } from 'vitest';
import { pickWeakTags, generateWeaknessProblem } from '../weakness';
import { analyzeHand } from '../../core/analyze';

describe('pickWeakTags', () => {
  it('サンプル十分＆低正答率のタグだけを低い順に返す', () => {
    const w = pickWeakTags({
      ron: { total: 20, correct: 6 }, // 30%
      oya: { total: 10, correct: 9 }, // 90% → 除外
      fu: { total: 8, correct: 4 }, // 50%
      dora: { total: 2, correct: 0 }, // サンプル不足 → 除外
    });
    expect(w.map((x) => x.tag)).toEqual(['ron', 'fu']);
  });

  it('弱点がなければ空配列', () => {
    expect(pickWeakTags({ ron: { total: 10, correct: 10 } })).toEqual([]);
  });
});

describe('generateWeaknessProblem', () => {
  it('データ不足なら null', () => {
    expect(generateWeaknessProblem({})).toBeNull();
    expect(generateWeaknessProblem({ ron: { total: 1, correct: 0 } })).toBeNull();
  });

  it('弱点タグに一致した正当な問題を返す', () => {
    for (const tag of ['toitoi', 'chiitoitsu', 'fu', 'tsumo', 'oya']) {
      const res = generateWeaknessProblem({ [tag]: { total: 10, correct: 2 } });
      expect(res).not.toBeNull();
      expect(res!.targetTag).toBe(tag);
      expect(res!.problem.tags).toContain(tag);
      // 生成物は常に正当
      const q = res!.problem;
      const re = analyzeHand({
        concealed: [...q.concealed, q.winningTile],
        melds: q.melds,
        winningTile: q.winningTile,
        tsumo: q.tsumo,
        riichi: q.riichi,
        oya: q.oya,
        roundWind: q.roundWind,
        seatWind: q.seatWind,
        doraIndicators: q.doraIndicators,
        uraIndicators: q.uraIndicators,
        akaDora: q.akaTiles.length,
        honba: q.honba,
        kyotaku: q.kyotaku,
      });
      expect(re.valid).toBe(true);
      expect(re.score.total).toBe(res!.problem.result.score.total);
    }
  });
});
