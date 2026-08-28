import { useState } from 'react';
import Home, { type Screen } from './ui/Home';
import ScoreQuiz from './ui/ScoreQuiz';
import AnalysisQuiz from './ui/AnalysisQuiz';
import PracticeTraining from './ui/PracticeTraining';
import FuQuiz from './ui/FuQuiz';
import WeaknessQuiz from './ui/WeaknessQuiz';
import TimeAttack from './ui/TimeAttack';
import ScoreTable from './ui/ScoreTable';
import StatsScreen from './ui/StatsScreen';
import SettingsScreen from './ui/SettingsScreen';

const TITLES: Record<Screen, string> = {
  home: '麻雀 点数計算トレーナー',
  quiz: '点数計算問題',
  analysis: '手牌分析問題',
  practice: '実戦トレーニング',
  fu: '符計算練習',
  weakness: '苦手問題',
  timeattack: 'タイムアタック',
  table: '点数早見表',
  stats: '学習記録',
  settings: '設定',
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <div className="app">
      <header className="appbar">
        {screen !== 'home' ? (
          <button onClick={() => setScreen('home')}>← ホーム</button>
        ) : (
          <span>麻雀 点数計算トレーナー</span>
        )}
        <span className="spacer" />
        {screen !== 'home' && <span>{TITLES[screen]}</span>}
        {screen === 'home' && <button onClick={() => setScreen('table')}>点数早見表</button>}
      </header>

      {screen === 'home' && <Home onNavigate={setScreen} />}
      {screen === 'quiz' && <ScoreQuiz />}
      {screen === 'analysis' && <AnalysisQuiz />}
      {screen === 'practice' && <PracticeTraining />}
      {screen === 'fu' && <FuQuiz />}
      {screen === 'weakness' && <WeaknessQuiz />}
      {screen === 'timeattack' && <TimeAttack />}
      {screen === 'table' && <ScoreTable />}
      {screen === 'stats' && <StatsScreen />}
      {screen === 'settings' && <SettingsScreen />}
    </div>
  );
}
