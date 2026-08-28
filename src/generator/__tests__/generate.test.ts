import { describe, it, expect } from 'vitest';
import { generateScoreProblem, scoreChoices } from '../generate';
import { analyzeHand } from '../../core/analyze';
import { mulberry32 } from '../random';

describe('generateScoreProblem: 生成物は常に正当（仕様 #24）', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    it(`レベル${level}: 100問すべて valid で、再解析が一致する`, () => {
      for (let i = 0; i < 100; i++) {
        const p = generateScoreProblem(level, level * 100000 + i);

        // 手牌は13枚、和了牌を足すと14枚
        expect(p.concealed).toHaveLength(13);

        // 保存された result を独立に再現できる
        const re = analyzeHand({
          concealed: [...p.concealed, p.winningTile],
          melds: p.melds,
          winningTile: p.winningTile,
          tsumo: p.tsumo,
          riichi: p.riichi,
          oya: p.oya,
          roundWind: p.roundWind,
          seatWind: p.seatWind,
          doraIndicators: p.doraIndicators,
          uraIndicators: p.uraIndicators,
          akaDora: p.akaTiles.length,
          honba: p.honba,
          kyotaku: p.kyotaku,
        });

        expect(re.valid).toBe(true);
        expect(re.han.total).toBe(p.result.han.total);
        expect(re.fu.rounded).toBe(p.result.fu.rounded);
        expect(re.score.total).toBe(p.result.score.total);
        expect(re.score.total).toBeGreaterThan(0);

        // 役が最低1つある（ドラのみの手は出題しない）
        expect(re.han.yaku.length).toBeGreaterThan(0);

        // 親・子が座に整合
        expect(p.oya).toBe(p.seatWind === 'east');
      }
    });
  }
});

describe('レベル6（副露あり）: 生成物は常に正当', () => {
  it('100問すべて valid・再解析一致で、副露を含み手牌長が整合する', () => {
    let meldSeen = 0;
    for (let i = 0; i < 100; i++) {
      const p = generateScoreProblem(6, 600000 + i);
      expect(p.melds.length).toBeGreaterThanOrEqual(1);
      expect(p.melds.length).toBeLessThanOrEqual(3);
      meldSeen += p.melds.length;

      // 手内は 13 - 3×副露数
      expect(p.concealed).toHaveLength(13 - 3 * p.melds.length);
      // 門前ではない（open 副露あり）
      expect(p.melds.every((m) => m.open)).toBe(true);
      expect(p.riichi).toBe(false);

      const re = analyzeHand({
        concealed: [...p.concealed, p.winningTile],
        melds: p.melds,
        winningTile: p.winningTile,
        tsumo: p.tsumo,
        riichi: p.riichi,
        oya: p.oya,
        roundWind: p.roundWind,
        seatWind: p.seatWind,
        doraIndicators: p.doraIndicators,
        uraIndicators: p.uraIndicators,
        akaDora: p.akaTiles.length,
        honba: p.honba,
        kyotaku: p.kyotaku,
      });
      expect(re.valid).toBe(true);
      expect(re.han.yaku.length).toBeGreaterThan(0);
      expect(re.score.total).toBe(p.result.score.total);
      expect(re.fu.rounded).toBe(p.result.fu.rounded);
      // 門前役は付かない
      expect(re.han.yaku.map((y) => y.name)).not.toContain('ピンフ');
      expect(re.han.yaku.map((y) => y.name)).not.toContain('門前清自摸和');
      expect(p.tags).toContain('meld');
    }
    expect(meldSeen).toBeGreaterThan(100);
  });
});

describe('追加役が出題に現れる', () => {
  it('Lv2〜5 を多数生成すると三色・一通・対々和・混一・清一・チャンタが少なくとも1回ずつ出る', () => {
    const seen = new Set<string>();
    for (const level of [2, 3, 4, 5]) {
      for (let i = 0; i < 120; i++) {
        for (const y of generateScoreProblem(level, level * 7777 + i).result.han.yaku) seen.add(y.name);
      }
    }
    for (const y of ['三色同順', '一気通貫', '対々和', '混一色', '清一色']) {
      expect(seen.has(y)).toBe(true);
    }
    expect(seen.has('混全帯幺九') || seen.has('純全帯幺九')).toBe(true);
  });

  it('Lv3〜4 で赤ドラ・裏ドラ・本場・供託がそれぞれ出題される', () => {
    const tags = new Set<string>();
    for (const level of [3, 4]) {
      for (let i = 0; i < 200; i++) {
        for (const t of generateScoreProblem(level, level * 3131 + i).tags) tags.add(t);
      }
    }
    for (const t of ['aka', 'ura', 'honba', 'kyotaku']) expect(tags.has(t)).toBe(true);
  });

  it('extras:false / tileExtras:false で本場・供託・赤・裏が付かない', () => {
    for (let i = 0; i < 80; i++) {
      const p = generateScoreProblem(4, 9000 + i, { extras: false, tileExtras: false });
      expect(p.honba).toBe(0);
      expect(p.kyotaku).toBe(0);
      expect(p.akaTiles).toHaveLength(0);
      expect(p.uraIndicators).toHaveLength(0);
    }
  });
});

describe('scoreChoices', () => {
  it('正解を必ず含み、指定個数を返す', () => {
    const rng = mulberry32(1);
    const choices = scoreChoices(3900, rng, 6);
    expect(choices).toContain(3900);
    expect(choices).toHaveLength(6);
    expect([...choices]).toEqual([...choices].sort((a, b) => a - b));
  });

  it('ラダー外の点数でも正解を含む', () => {
    const choices = scoreChoices(3901);
    expect(choices).toContain(3901);
  });
});
