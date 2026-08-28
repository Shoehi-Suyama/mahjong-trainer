import type { AnalyzeResult } from '../core/analyze';

/** 符の内訳表示（仕様 #16）。Explanation と 符計算練習で共用。 */
export default function FuBreakdown({ result: r, alwaysOpen = false }: { result: AnalyzeResult; alwaysOpen?: boolean }) {
  if (r.score.limit) return <ul><li>満貫以上のため符は不問</li></ul>;

  if (r.fu.fixed) {
    return (
      <ul>
        {r.form === 'chiitoitsu' ? (
          <li>七対子 25符（固定）</li>
        ) : (
          <>
            {r.fu.parts.map((p, i) => (
              <li key={i}>
                {p.label}　{p.fu}符
              </li>
            ))}
            <li className="total-line">{r.fu.rounded}符（固定）</li>
          </>
        )}
      </ul>
    );
  }

  if (!alwaysOpen) return null;

  return (
    <ul>
      {r.fu.parts.map((p, i) => (
        <li key={i}>
          {p.label}　{p.fu}符
        </li>
      ))}
      <li className="total-line">
        合計 {r.fu.raw}符 → 10符単位に切り上げ {r.fu.rounded}符
      </li>
    </ul>
  );
}
