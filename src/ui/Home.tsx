export type Screen =
  | 'home'
  | 'quiz'
  | 'analysis'
  | 'practice'
  | 'fu'
  | 'weakness'
  | 'timeattack'
  | 'stats'
  | 'settings';

interface HomeProps {
  onNavigate: (s: Screen) => void;
  onOpenTable: () => void;
}

type ItemKey = Screen | 'table' | null;

const ITEMS: { key: ItemKey; label: string; sub: string }[] = [
  { key: 'quiz', label: '点数計算問題', sub: 'アガリを見て点数を答える' },
  { key: 'analysis', label: '手牌分析問題', sub: '役・翻・符・点を個別に' },
  { key: 'practice', label: '実戦トレーニング', sub: '配牌からアガリまで' },
  { key: 'fu', label: '符計算練習', sub: '符だけを当てる' },
  { key: 'weakness', label: '苦手問題', sub: '間違えやすい条件を優先' },
  { key: 'timeattack', label: 'タイムアタック', sub: '60秒で何問？' },
  { key: 'table', label: '点数早見表', sub: '符 × 翻の一覧（問題中も確認可）' },
  { key: 'stats', label: '学習記録', sub: '正答率・連続正解' },
  { key: 'settings', label: '設定', sub: '回答方式・ルール' },
];

export default function Home({ onNavigate, onOpenTable }: HomeProps) {
  return (
    <div className="screen">
      <div className="home-title">
        <h1>麻雀 点数計算トレーナー</h1>
        <small>牌姿を見て、役・翻・符・点数を素早く</small>
      </div>
      <div className="home-grid">
        {ITEMS.map((it, i) => (
          <button
            key={i}
            disabled={it.key === null}
            onClick={() => {
              if (it.key === 'table') onOpenTable();
              else if (it.key) onNavigate(it.key);
            }}
          >
            {it.label}
            <span className="sub">{it.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
