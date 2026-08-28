import { useCallback, useEffect, useState } from 'react';
import { setRuleConfig } from '../core/ruleConfig';

export type AnswerMode = 'choice' | 'input';

export interface Settings {
  /** 点数・符の回答方式（選択式／数字入力） */
  answerMode: AnswerMode;
  /** 連風牌の雀頭符 */
  renpuuFu: 2 | 4;
  /** 符の内訳を最初から開いて表示する */
  fuDetailDefaultOpen: boolean;
}

const KEY = 'mahjong-trainer:settings:v1';

const DEFAULT: Settings = {
  answerMode: 'choice',
  renpuuFu: 4,
  fuDetailDefaultOpen: false,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? { ...DEFAULT, ...(JSON.parse(raw) as Settings) } : { ...DEFAULT };
    setRuleConfig({ renpuuFu: s.renpuuFu });
    return s;
  } catch {
    return { ...DEFAULT };
  }
}

// モジュール読み込み時に一度ルール設定へ反映しておく（fu 計算が参照するため）。
if (typeof localStorage !== 'undefined') {
  try {
    load();
  } catch {
    /* noop */
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* noop */
    }
    setRuleConfig({ renpuuFu: settings.renpuuFu });
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  return { settings, update };
}
