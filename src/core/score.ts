// 点数計算（仕様 #31-35, #57）。
// 基本点 = 符 × 2^(2 + 翻)。満貫以上は固定。支払いは親子・ロンツモで分配。
// 本場（1本場ごとに +300、ツモは各家 +100）と供託（1000点棒）も加算する。

export type LimitRank = '満貫' | '跳満' | '倍満' | '三倍満' | '役満';

export interface ScoreInput {
  han: number;
  fu: number;
  oya: boolean;
  tsumo: boolean;
  /** 役満の倍数（1=役満, 2=ダブル役満…）。0 なら通常計算。 */
  yakuman?: number;
  /** 本場 */
  honba?: number;
  /** 供託（1000点棒の本数） */
  kyotaku?: number;
}

export interface RonPayment {
  type: 'ron';
  /** 放銃者の支払い（本場込み） */
  amount: number;
}

export interface TsumoPayment {
  type: 'tsumo';
  /** 子の支払い額（1人あたり、本場込み） */
  ko: number;
  /** 親の支払い額（親和了時は undefined） */
  oya?: number;
}

export interface ScoreResult {
  /** 和了者の収入合計（本場・供託込み） */
  total: number;
  /** 本場・供託を除いた素点 */
  baseTotal: number;
  basicPoints: number;
  payment: RonPayment | TsumoPayment;
  limit: LimitRank | null;
  honba: number;
  kyotaku: number;
  /** "3900点" / "700 / 1300" のような表示用文字列（本場込みの支払い） */
  display: string;
}

function ceil100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

interface Base {
  bp: number;
  limit: LimitRank | null;
}

export function basicPoints(han: number, fu: number, yakuman = 0): Base {
  if (yakuman > 0) return { bp: 8000 * yakuman, limit: '役満' };
  if (han >= 13) return { bp: 8000, limit: '役満' }; // 数え役満
  if (han >= 11) return { bp: 6000, limit: '三倍満' };
  if (han >= 8) return { bp: 4000, limit: '倍満' };
  if (han >= 6) return { bp: 3000, limit: '跳満' };
  if (han === 5) return { bp: 2000, limit: '満貫' };
  const bp = fu * Math.pow(2, 2 + han);
  if (bp >= 2000) return { bp: 2000, limit: '満貫' }; // 切り上げ満貫は採用しない（4翻30符=7700）
  return { bp, limit: null };
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const { han, fu, oya, tsumo, yakuman = 0, honba = 0, kyotaku = 0 } = input;
  const { bp, limit } = basicPoints(han, fu, yakuman);
  const kyo = kyotaku * 1000;

  if (tsumo) {
    if (oya) {
      const base = ceil100(bp * 2);
      const each = base + honba * 100;
      const baseTotal = base * 3;
      return {
        total: baseTotal + honba * 300 + kyo,
        baseTotal,
        basicPoints: bp,
        payment: { type: 'tsumo', ko: each },
        limit,
        honba,
        kyotaku,
        display: `${each.toLocaleString()} オール`,
      };
    }
    const koBase = ceil100(bp * 1);
    const oyaBase = ceil100(bp * 2);
    const koPay = koBase + honba * 100;
    const oyaPay = oyaBase + honba * 100;
    const baseTotal = oyaBase + koBase * 2;
    return {
      total: baseTotal + honba * 300 + kyo,
      baseTotal,
      basicPoints: bp,
      payment: { type: 'tsumo', ko: koPay, oya: oyaPay },
      limit,
      honba,
      kyotaku,
      display: `${koPay.toLocaleString()} / ${oyaPay.toLocaleString()}`,
    };
  }

  // ロン
  const base = ceil100(bp * (oya ? 6 : 4));
  const amount = base + honba * 300;
  return {
    total: amount + kyo,
    baseTotal: base,
    basicPoints: bp,
    payment: { type: 'ron', amount },
    limit,
    honba,
    kyotaku,
    display: `${amount.toLocaleString()}点`,
  };
}
