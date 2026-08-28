import { useState } from 'react';
import Home, { type Screen } from './ui/Home';
import PracticalCalc from './ui/practical/PracticalCalc';
import ScoreQuiz from './ui/ScoreQuiz';
import AnalysisQuiz from './ui/AnalysisQuiz';
import PracticeTraining from './ui/PracticeTraining';
import FuQuiz from './ui/FuQuiz';
import WeaknessQuiz from './ui/WeaknessQuiz';
import TimeAttack from './ui/TimeAttack';
import ScoreTableModal from './ui/ScoreTableModal';
import StatsScreen from './ui/StatsScreen';
import SettingsScreen from './ui/SettingsScreen';

const TITLES: Record<Screen, string> = {
  home: '麻雀 点数計算トレーナー',
  practical: '実戦用 点数計算',
  quiz: '点数計算問題',
  analysis: '手牌分析問題',
  practice: '実戦トレーニング',
  fu: '符計算練習',
  weakness: '苦手問題',
  timeattack: 'タイムアタック',
  stats: '学習記録',
  settings: '設定',
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [tableOpen, setTableOpen] = useState(false);

  return (
    <div className="app">
      <header className="appbar">
        {screen !== 'home' && (
          <button onClick={() => setScreen('home')}>← ホーム</button>
        )}
        <span className="appbar-title">{TITLES[screen]}</span>
        <span className="spacer" />
        <button onClick={() => setTableOpen(true)}>早見表</button>
      </header>

      {screen === 'home' && <Home onNavigate={setScreen} onOpenTable={() => setTableOpen(true)} />}
      {screen === 'practical' && <PracticalCalc />}
      {screen === 'quiz' && <ScoreQuiz />}
      {screen === 'analysis' && <AnalysisQuiz />}
      {screen === 'practice' && <PracticeTraining />}
      {screen === 'fu' && <FuQuiz />}
      {screen === 'weakness' && <WeaknessQuiz />}
      {screen === 'timeattack' && <TimeAttack />}
      {screen === 'stats' && <StatsScreen />}
      {screen === 'settings' && <SettingsScreen />}

      {tableOpen && <ScoreTableModal onClose={() => setTableOpen(false)} />}
    </div>
  );
}
