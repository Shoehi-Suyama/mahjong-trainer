import { describe, it, expect } from 'vitest';
import { generatePracticeProblem } from '../generatePractice';
import { analyzeHand } from '../../core/analyze';
import { sortTileIds, type TileId } from '../../core/tiles';

// 「毎ツモ、不要牌(×印)を1枚切る」戦略で必ず正当なアガリに到達することを検証する（仕様 #23, #24）。

describe('generatePracticeProblem', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    it(`レベル${level}: 60局すべて、不要牌を切ればアガリに届き点数が一致する`, () => {
      for (let i = 0; i < 60; i++) {
        const pp = generatePracticeProblem(level, level * 20000 + i);

        expect(pp.startHand).toHaveLength(13);
        const D = pp.junk.length;
        expect(D).toBeGreaterThanOrEqual(3);
        expect(D).toBeLessThanOrEqual(6);
        expect(pp.draws.length).toBe(pp.isRon ? D : D + 1);

        // シミュレート: 毎ターン missing を1枚引き、junk を1枚切る
        let hand: TileId[] = [...pp.startHand];
        const junkLeft = [...pp.junk];
        const missing = pp.isRon ? pp.draws : pp.draws.slice(0, -1);
        for (const m of missing) {
          hand.push(m);
          const ji = hand.findIndex((x) => junkLeft.includes(x));
          expect(ji).toBeGreaterThanOrEqual(0);
          const jt = hand[ji];
          hand.splice(ji, 1);
          junkLeft.splice(junkLeft.indexOf(jt), 1);
        }
        expect(hand).toHaveLength(13);
        expect(sortTileIds(hand)).toEqual(sortTileIds(pp.target.concealed));

        const winTile = pp.isRon ? pp.ronTile! : pp.draws[pp.draws.length - 1];
        const tsumo = !pp.isRon;
        const re = analyzeHand({
          concealed: sortTileIds([...hand, winTile]),
          winningTile: winTile,
          tsumo,
          riichi: pp.target.riichi,
          oya: pp.target.oya,
          roundWind: pp.target.roundWind,
          seatWind: pp.target.seatWind,
          doraIndicators: pp.target.doraIndicators,
        });

        expect(re.valid).toBe(true);
        expect(re.han.total).toBe(pp.target.result.han.total);
        expect(re.fu.rounded).toBe(pp.target.result.fu.rounded);
        expect(re.score.total).toBe(pp.target.result.score.total);
      }
    });
  }
});
