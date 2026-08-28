// 点数計算（仕様 #31-35, #57）。
// 基本点 = 符 × 2^(2 + 翻)。満貫以上は固定。支払いは親子・ロンツモで分配。

export type LimitRank = '満貫' | '跳満' | '倍満' | '三倍満' | '役満';

export interface ScoreInput {
  han: number;
  fu: number;
  oya: boolean;
  tsumo: boolean;
  /** 役満の倍数（1=役満, 2=ダブル役満…）。0 なら通常計算。 */
  yakuman?: number;
}

export interface RonPayment {
  type: 'ron';
  /** 放銃者の支払い（= 和了点） */
  amount: number;
}

export interface TsumoPayment {
  type: 'tsumo';
  /** 子の支払い額（1人あたり） */
  ko: number;
  /** 親の支払い額（親和了時は undefined） */
  oya?: number;
}

export interface ScoreResult {
  total: number;
  basicPoints: number;
  payment: RonPayment | TsumoPayment;
  limit: LimitRank | null;
  /** "3900点" / "700 / 1300" のような表示用文字列 */
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
  const { han, fu, oya, tsumo, yakuman = 0 } = input;
  const { bp, limit } = basicPoints(han, fu, yakuman);

  if (tsumo) {
    if (oya) {
      const each = ceil100(bp * 2);
      return {
        total: each * 3,
        basicPoints: bp,
        payment: { type: 'tsumo', ko: each },
        limit,
        display: `${each.toLocaleString()} オール`,
      };
    }
    const koPay = ceil100(bp * 1);
    const oyaPay = ceil100(bp * 2);
    return {
      total: oyaPay + koPay * 2,
      basicPoints: bp,
      payment: { type: 'tsumo', ko: koPay, oya: oyaPay },
      limit,
      display: `${koPay.toLocaleString()} / ${oyaPay.toLocaleString()}`,
    };
  }

  // ロン
  const amount = ceil100(bp * (oya ? 6 : 4));
  return {
    total: amount,
    basicPoints: bp,
    payment: { type: 'ron', amount },
    limit,
    display: `${amount.toLocaleString()}点`,
  };
}
