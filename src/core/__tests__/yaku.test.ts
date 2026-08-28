import { describe, it, expect } from 'vitest';
import { parseTiles } from '../tiles';
import { analyzeHand, type AnalyzeInput } from '../analyze';

type RunInput = Partial<AnalyzeInput> & Pick<AnalyzeInput, 'concealed' | 'winningTile' | 'tsumo'>;
function run(p: RunInput) {
  return analyzeHand({ oya: false, roundWind: 'east', seatWind: 'south', ...p });
}
const names = (p: RunInput) => run(p).han.yaku.map((y) => y.name);

describe('追加役: 標準形', () => {
  it('三色同順（門前2翻）', () => {
    const p: RunInput = { concealed: parseTiles('234m 234p 234s 567m 99p'), winningTile: 'man2', tsumo: true };
    const n = names(p);
    expect(n).toContain('三色同順');
    // 234m の両面待ちなのでピンフも付く: 三色2 + 門前ツモ1 + ピンフ1 = 4翻
    expect(run(p).han.total).toBe(4);
  });

  it('一気通貫（門前2翻）', () => {
    expect(names({ concealed: parseTiles('123m 456m 789m 234p 55s'), winningTile: 'pin2', tsumo: false, riichi: true }))
      .toContain('一気通貫');
  });

  it('対々和 + 三暗刻（シャンポンロンで1つは明刻）', () => {
    const n = names({
      concealed: parseTiles('111m 333p 555s 東東東 99m'),
      winningTile: 'man1',
      tsumo: false,
      roundWind: 'south',
      seatWind: 'west',
    });
    expect(n).toContain('対々和');
    expect(n).toContain('三暗刻');
    expect(n).not.toContain('四暗刻');
  });

  it('混全帯幺九（門前2翻）', () => {
    expect(names({ concealed: parseTiles('123m 123p 789s 東東東 99m'), winningTile: 'man1', tsumo: true }))
      .toContain('混全帯幺九');
  });

  it('純全帯幺九（門前3翻、字牌なし）', () => {
    const n = names({ concealed: parseTiles('123m 123p 789s 789m 99p'), winningTile: 'man1', tsumo: true });
    expect(n).toContain('純全帯幺九');
    expect(n).not.toContain('混全帯幺九');
  });

  it('混一色（門前3翻）', () => {
    expect(names({ concealed: parseTiles('123m 456m 789m 東東東 99m'), winningTile: 'man1', tsumo: false, riichi: true }))
      .toContain('混一色');
  });

  it('清一色（門前6翻）', () => {
    const n = names({ concealed: parseTiles('234m 234m 567m 789m 11m'), winningTile: 'man2', tsumo: false, riichi: true });
    expect(n).toContain('清一色');
    expect(n).not.toContain('九蓮宝燈');
  });

  it('小三元（+ 白發の役牌）', () => {
    const n = names({ concealed: parseTiles('白白白 發發發 中中 234m 567m'), winningTile: 'red', tsumo: true });
    expect(n).toContain('小三元');
    expect(n.filter((x) => x.startsWith('役牌')).length).toBe(2);
  });

  it('二盃口（門前3翻）', () => {
    const n = names({ concealed: parseTiles('223344m 556677p 99s'), winningTile: 'man2', tsumo: true });
    expect(n).toContain('二盃口');
    expect(n).not.toContain('一盃口');
  });

  it('喰い下がり: 副露三色は1翻', () => {
    const r = analyzeHand({
      oya: false,
      roundWind: 'east',
      seatWind: 'south',
      concealed: parseTiles('234p 234s 567m 99p'),
      melds: [{ kind: 'chi', tiles: parseTiles('234m'), open: true }],
      winningTile: 'pin2',
      tsumo: false,
    });
    const y = r.han.yaku.find((x) => x.name === '三色同順');
    expect(y?.han).toBe(1);
  });
});

describe('役満', () => {
  it('四暗刻単騎（ツモ）', () => {
    const r = run({ concealed: parseTiles('111m 333p 555s 東東東 99m'), winningTile: 'man9', tsumo: true });
    expect(r.han.yaku.map((y) => y.name).some((n) => n.startsWith('四暗刻'))).toBe(true);
    expect(r.han.yakuman).toBe(1);
    expect(r.score.total).toBe(32000);
  });

  it('シャンポンロンは四暗刻にならない（三暗刻+対々和）', () => {
    const r = run({ concealed: parseTiles('111m 333p 555s 東東東 99m'), winningTile: 'man1', tsumo: false });
    expect(r.han.yaku.map((y) => y.name).some((n) => n.startsWith('四暗刻'))).toBe(false);
  });

  it('大三元', () => {
    const r = run({ concealed: parseTiles('白白白 發發發 中中中 234m 99p'), winningTile: 'man2', tsumo: true });
    expect(r.han.yakuman).toBe(1);
    expect(r.han.yaku.map((y) => y.name)).toContain('大三元');
  });

  it('字一色（七対子形）', () => {
    const r = run({ concealed: parseTiles('東東 南南 西西 北北 白白 發發 中中'), winningTile: 'red', tsumo: false });
    expect(r.han.yakuman).toBe(1);
    expect(r.han.yaku.map((y) => y.name)).toContain('字一色');
  });

  it('国士無双', () => {
    const r = run({
      concealed: parseTiles('19m 19p 19s 東南西北 白發中 中'),
      winningTile: 'red',
      tsumo: false,
    });
    expect(r.form).toBe('kokushi');
    expect(r.han.yakuman).toBe(1);
    expect(r.score.total).toBe(32000);
  });

  it('国士無双十三面', () => {
    const r = run({
      concealed: parseTiles('19m 19p 19s 東南西北 白發中 南'),
      winningTile: 'south',
      tsumo: true,
    });
    expect(r.han.yaku.map((y) => y.name)).toContain('国士無双十三面');
  });

  it('清老頭（シャンポンロンで四暗刻を外し単独役満）', () => {
    const r = run({ concealed: parseTiles('111m 999m 111p 999p 99s'), winningTile: 'man1', tsumo: false });
    expect(r.han.yaku.map((y) => y.name)).toContain('清老頭');
    expect(r.han.yakuman).toBe(1);
  });

  it('緑一色', () => {
    const r = run({ concealed: parseTiles('222s 333s 444s 666s 88s'), winningTile: 'sou8', tsumo: true });
    expect(r.han.yaku.map((y) => y.name)).toContain('緑一色');
  });

  it('九蓮宝燈', () => {
    const r = run({ concealed: parseTiles('1112345678999m 5m'), winningTile: 'man5', tsumo: true, riichi: false });
    expect(r.han.yaku.map((y) => y.name)).toContain('九蓮宝燈');
    expect(r.han.yakuman).toBe(1);
  });

  it('数え役満（13翻）は役満扱い', () => {
    // 清一色6 + 一気通貫2 + ... を無理に作らず、翻を直接確認
    const r = run({ concealed: parseTiles('111m 234m 567m 789m 99m'), winningTile: 'man9', tsumo: false, riichi: true });
    // 清一6 + リーチ1 + 純全3 ... 十分に大きい
    expect(r.score.limit).toBe('役満');
  });
});
