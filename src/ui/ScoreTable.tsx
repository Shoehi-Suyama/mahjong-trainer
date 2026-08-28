import { useState, type ReactNode } from 'react';
import { calculateScore } from '../core/score';

const FUS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
const HANS = [1, 2, 3, 4];

function cell(han: number, fu: number, oya: boolean, tsumo: boolean): ReactNode {
  // 存在しない組合せ
  if (fu === 20 && !tsumo && han <= 4) return '—'; // 20符ロンは無い（平和ツモ専用）
  if (fu === 25 && han === 1) return '—'; // 七対子は2翻以上
  const r = calculateScore({ han, fu, oya, tsumo });
  if (!tsumo) return r.total.toLocaleString();

  const p = r.payment;
  if (p.type !== 'tsumo') return r.total.toLocaleString();
  if (p.oya == null) {
    // 親ツモ: 子3人が同額
    return `${p.ko.toLocaleString()}オール`;
  }
  // 子ツモ: 他の子2人が p.ko、親が p.oya
  return (
    <span className="tsumo-cell">
      <span>子 {p.ko.toLocaleString()}</span>
      <span>親 {p.oya.toLocaleString()}</span>
    </span>
  );
}

// ラベル, 基本点
const LIMITS: [string, number][] = [
  ['満貫', 2000],
  ['跳満', 3000],
  ['倍満', 4000],
  ['三倍満', 6000],
  ['役満', 8000],
];
const c100 = (n: number) => Math.ceil(n / 100) * 100;

export default function ScoreTable() {
  const [oya, setOya] = useState(false);
  const [tsumo, setTsumo] = useState(false);

  return (
    <div className="screen">
      <div className="level-tabs">
        <button className={!oya ? 'active' : ''} onClick={() => setOya(false)}>子</button>
        <button className={oya ? 'active' : ''} onClick={() => setOya(true)}>親</button>
        <span style={{ width: 12 }} />
        <button className={!tsumo ? 'active' : ''} onClick={() => setTsumo(false)}>ロン</button>
        <button className={tsumo ? 'active' : ''} onClick={() => setTsumo(true)}>ツモ</button>
      </div>

      <div className="card table-scroll">
        <table className="score-table">
          <caption>
            {oya ? '親' : '子'}・
            {tsumo
              ? oya
                ? 'ツモ（子3人がそれぞれ支払う点数）'
                : 'ツモ（他の子 / 親 がそれぞれ支払う点数）'
              : 'ロン（和了点）'}
          </caption>
          <thead>
            <tr>
              <th>符＼翻</th>
              {HANS.map((h) => (
                <th key={h}>{h}翻</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FUS.map((fu) => (
              <tr key={fu}>
                <th>{fu}符</th>
                {HANS.map((h) => (
                  <td key={h}>{cell(h, fu, oya, tsumo)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card table-scroll">
        <table className="score-table">
          <caption>満貫以上（ツモは合計。かっこ内は 子 / 親 の支払い）</caption>
          <thead>
            <tr>
              <th></th>
              <th>子ロン</th>
              <th>子ツモ</th>
              <th>親ロン</th>
              <th>親ツモ</th>
            </tr>
          </thead>
          <tbody>
            {LIMITS.map(([label, base]) => {
              const koRon = c100(base * 4);
              const oyaRon = c100(base * 6);
              const koTsumoKo = c100(base * 1);
              const koTsumoOya = c100(base * 2);
              const oyaTsumoEach = c100(base * 2);
              return (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{koRon.toLocaleString()}</td>
                  <td>
                    {(koTsumoKo * 2 + koTsumoOya).toLocaleString()}
                    <br />
                    <small>
                      ({koTsumoKo.toLocaleString()} / {koTsumoOya.toLocaleString()})
                    </small>
                  </td>
                  <td>{oyaRon.toLocaleString()}</td>
                  <td>
                    {(oyaTsumoEach * 3).toLocaleString()}
                    <br />
                    <small>({oyaTsumoEach.toLocaleString()}オール)</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
