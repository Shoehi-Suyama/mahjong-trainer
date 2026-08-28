import { useState, type ReactNode } from 'react';
import { calculateScore } from '../core/score';

const FUS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
const HANS = [1, 2, 3, 4];

function tsumoText(han: number, fu: number, oya: boolean): string {
  const p = calculateScore({ han, fu, oya, tsumo: true }).payment;
  if (p.type !== 'tsumo') return '';
  if (p.oya == null) return `${p.ko.toLocaleString()}オール`;
  return `子${p.ko.toLocaleString()} / 親${p.oya.toLocaleString()}`;
}

function cell(han: number, fu: number, oya: boolean): ReactNode {
  if (fu === 25 && han === 1) return <span className="pt-na">—</span>;
  const ron = fu === 20 ? null : calculateScore({ han, fu, oya, tsumo: false }).total; // 20符はツモ(平和)のみ
  return (
    <div className="pt-cell">
      <span className="pt-ron">{ron == null ? '—' : ron.toLocaleString()}</span>
      <span className="pt-tsumo">ツモ {tsumoText(han, fu, oya)}</span>
    </div>
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

  return (
    <div className="screen">
      <div className="level-tabs">
        <button className={!oya ? 'active' : ''} onClick={() => setOya(false)}>子</button>
        <button className={oya ? 'active' : ''} onClick={() => setOya(true)}>親</button>
      </div>

      <div className="card table-scroll">
        <table className="score-table">
          <caption>
            {oya ? '親' : '子'}の和了点（上：ロン和了点／下：ツモで
            {oya ? '子3人が支払う点数' : '他の子 / 親 が支払う点数'}）
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
                  <td key={h}>{cell(h, fu, oya)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card table-scroll">
        <table className="score-table">
          <caption>満貫以上（{oya ? '親' : '子'}）</caption>
          <thead>
            <tr>
              <th></th>
              <th>ロン和了点</th>
              <th>ツモ（{oya ? '各家' : '子 / 親'}）</th>
            </tr>
          </thead>
          <tbody>
            {LIMITS.map(([label, base]) => {
              const ron = c100(base * (oya ? 6 : 4));
              const tsu = oya
                ? `${c100(base * 2).toLocaleString()}オール`
                : `子${c100(base * 1).toLocaleString()} / 親${c100(base * 2).toLocaleString()}`;
              return (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{ron.toLocaleString()}</td>
                  <td>{tsu}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
