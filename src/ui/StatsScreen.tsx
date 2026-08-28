import { useStats } from './useStats';
import { tagLabel } from './tagLabels';

export default function StatsScreen() {
  const { stats, reset } = useStats();
  const rate = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
  const tags = Object.entries(stats.byTag).sort(
    (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total,
  );

  return (
    <div className="screen">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>全体</h3>
        <div className="stat-row">
          <span>総問題数 {stats.total}</span>
          <span>正解 {stats.correct}</span>
          <span>正答率 {rate}%</span>
        </div>
        <div className="stat-row">
          <span>連続正解 {stats.streak}</span>
          <span>最高連続 {stats.bestStreak}</span>
          <span>タイムアタック最高 {stats.bestTimeAttack}問</span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>カテゴリ別（正答率が低い順）</h3>
        {tags.length === 0 && <p style={{ color: '#777' }}>まだ記録がありません。</p>}
        <table className="score-table">
          <tbody>
            {tags.map(([tag, s]) => (
              <tr key={tag}>
                <th style={{ textAlign: 'left' }}>{tagLabel(tag)}</th>
                <td>{s.correct}/{s.total}</td>
                <td>{Math.round((s.correct / s.total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="linkbtn" onClick={reset}>
        学習記録をリセット
      </button>
    </div>
  );
}
