import { useCallback, useEffect, useState } from 'react';
import type { PracticalInput } from '../../core/practical';
import type { HonorTileId, TileId } from '../../core/tiles';

export interface HistoryEntry {
  at: number; // epoch ms
  input: PracticalInput;
  summary: {
    total: number;
    han: number;
    fu: number;
    yakuman: number;
    limit: string | null;
    oya: boolean;
    tsumo: boolean;
    yaku: string[];
  };
}

/** 対局中に持ち越す条件（仕様 #50, #51） */
export interface StickyConditions {
  oya: boolean;
  roundWind: HonorTileId;
  seatWind: HonorTileId;
  doraIndicators: TileId[];
  honba: number;
  kyotaku: number;
}

const HIST_KEY = 'mahjong-trainer:calc-history:v1';
const STICKY_KEY = 'mahjong-trainer:calc-sticky:v1';
const MAX = 50;

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HIST_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function loadSticky(): StickyConditions | null {
  try {
    const raw = localStorage.getItem(STICKY_KEY);
    return raw ? (JSON.parse(raw) as StickyConditions) : null;
  } catch {
    return null;
  }
}

export function useCalcHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  useEffect(() => {
    try {
      localStorage.setItem(HIST_KEY, JSON.stringify(history));
    } catch {
      /* noop */
    }
  }, [history]);

  const add = useCallback((entry: HistoryEntry) => {
    setHistory((h) => [entry, ...h].slice(0, MAX));
    try {
      const s: StickyConditions = {
        oya: entry.input.oya,
        roundWind: entry.input.roundWind,
        seatWind: entry.input.seatWind,
        doraIndicators: entry.input.doraIndicators,
        honba: entry.input.honba,
        kyotaku: entry.input.kyotaku,
      };
      localStorage.setItem(STICKY_KEY, JSON.stringify(s));
    } catch {
      /* noop */
    }
  }, []);

  const clear = useCallback(() => setHistory([]), []);

  return { history, add, clear, sticky: loadSticky() };
}
