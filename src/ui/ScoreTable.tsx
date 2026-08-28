import { useState } from 'react';
import { calculateScore } from '../core/score';

const FUS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
const HANS = [1, 2, 3, 4];

function cell(han: number, fu: number, oya: boolean, tsumo: boolean): string {
  // 存在しない組合せ
  if (fu === 20 && !tsumo && han <= 4) return '—'; // 20符ロンは無い（平和ツモ専用）
  if (fu === 25 && han === 1) return '—'; // 七対子は2翻以上
  const r = calculateScore({ han, fu, oya, tsumo });
  if (tsumo) return r.display;
  return r.total.toLocaleString();
}

const LIMITS: [string, number, number, number, number][] = [
  // ラベル, 子ロン, 子ツモ合計, 親ロン, 親ツモ合計
  ['満貫', 8000, 8000, 12000, 12000],
  ['跳満', 12000, 12000, 18000, 18000],
  ['倍満', 16000, 16000, 24000, 24000],
  ['三倍満', 24000, 24000, 36000, 36000],
  ['役満', 32000, 32000, 48000, 48000],
];

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
            {oya ? '親' : '子'}・{tsumo ? 'ツモ（支払い内訳／親ツモはオール）' : 'ロン（和了点）'}
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
          <caption>満貫以上</caption>
          <thead>
            <tr>
              <th></th>
              <th>子ロン</th>
              <th>子ツモ計</th>
              <th>親ロン</th>
              <th>親ツモ計</th>
            </tr>
          </thead>
          <tbody>
            {LIMITS.map(([label, kr, kt, or, ot]) => (
              <tr key={label}>
                <th>{label}</th>
                <td>{kr.toLocaleString()}</td>
                <td>{kt.toLocaleString()}</td>
                <td>{or.toLocaleString()}</td>
                <td>{ot.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
