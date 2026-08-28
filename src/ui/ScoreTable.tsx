import { useState, type ReactNode } from 'react';
import { calculateScore } from '../core/score';

const FUS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
const HANS = [1, 2, 3, 4];

const n = (v: number) => v.toLocaleString();

function tsumoStr(han: number, fu: number, oya: boolean): string {
  const p = calculateScore({ han, fu, oya, tsumo: true }).payment;
  if (p.type !== 'tsumo') return '';
  if (p.oya == null) return n(p.ko); // 親ツモ：各家同額
  return `${n(p.ko)} / ${n(p.oya)}`; // 子ツモ：小さい方が子・大きい方が親
}

function cell(han: number, fu: number, oya: boolean): ReactNode {
  if (fu === 25 && han === 1) return <span className="pt-na">—</span>;
  const ron = fu === 20 ? null : calculateScore({ han, fu, oya, tsumo: false }).total;
  return (
    <div className="pt-cell">
      <span className="pt-ron">{ron == null ? '—' : n(ron)}</span>
      <span className="pt-tsumo">{tsumoStr(han, fu, oya)}</span>
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

      <p className="table-note">
        上段＝ロン和了点／下段＝ツモ
        {oya ? '（各家同額）' : '（子の支払い／親の支払い）'}
      </p>

      <div className="card table-scroll">
        <table className="score-table compact">
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
        <table className="score-table compact">
          <thead>
            <tr>
              <th>満貫以上</th>
              <th>ロン</th>
              <th>ツモ</th>
            </tr>
          </thead>
          <tbody>
            {LIMITS.map(([label, base]) => {
              const ron = c100(base * (oya ? 6 : 4));
              const tsu = oya
                ? n(c100(base * 2))
                : `${n(c100(base * 1))} / ${n(c100(base * 2))}`;
              return (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{n(ron)}</td>
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
