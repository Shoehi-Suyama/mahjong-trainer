// 実戦トレーニング（仕様 #17-23）。配牌からツモ・打牌を繰り返し、アガリで点数計算。
// 打牌選択は採点しない（#18）が、不要牌は孤立牌なので「牌効率どおり」に切れば手が進む。
// 必要牌を切ってしまった場合はツモ山の後ろに戻る（＝手数を余分に使う）。予備は2ツモまで。

import { useMemo, useState } from 'react';
import Tile from './Tile';
import AnalysisAnswer from './AnalysisAnswer';
import { generatePracticeProblem, type PracticeProblem } from '../generator/generatePractice';
import { isAgari } from '../core/hand';
import { analyzeHand, type AnalyzeResult } from '../core/analyze';
import { sortTileIds, type TileId } from '../core/tiles';
import { useStats } from './useStats';

const LEVELS = [1, 2, 3, 4, 5];
const SPARE_DRAWS = 2;

type Phase = 'draw' | 'discard' | 'agari' | 'dead';

function removeOne(arr: TileId[], t: TileId): TileId[] {
  const i = arr.indexOf(t);
  if (i < 0) return arr;
  const copy = [...arr];
  copy.splice(i, 1);
  return copy;
}
function tally(tiles: TileId[]): Map<TileId, number> {
  const m = new Map<TileId, number>();
  for (const t of tiles) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

interface RunState {
  hand: TileId[];
  queue: TileId[];
  drawn: TileId | null;
  drawsUsed: number;
  phase: Phase;
}

function initRun(pp: PracticeProblem): RunState {
  return { hand: pp.startHand, queue: pp.draws, drawn: null, drawsUsed: 0, phase: 'draw' };
}

export default function PracticeTraining() {
  const { stats, record } = useStats();
  const [level, setLevel] = useState(1);
  const [pp, setPp] = useState<PracticeProblem>(() => generatePracticeProblem(1));
  const [run, setRun] = useState<RunState>(() => initRun(pp));
  const [selected, setSelected] = useState<TileId | null>(null);
  const [turn, setTurn] = useState(0);
  const [agariTile, setAgariTile] = useState<TileId | null>(null);
  const [agariTsumo, setAgariTsumo] = useState(false);

  const t = pp.target;
  const { hand, queue, drawn, drawsUsed, phase } = run;

  const winTile = pp.isRon ? pp.ronTile! : t.winningTile;
  const maxDraws = pp.draws.length + SPARE_DRAWS;
  const drawBudget = Math.max(0, maxDraws - drawsUsed);
  const isDead = phase === 'dead' || (phase === 'draw' && (drawBudget === 0 || queue.length === 0));

  const goalCounts = useMemo(() => tally(pp.goal), [pp]);

  const canTsumo = drawn != null && isAgari([...hand, drawn]);
  const ronReady = pp.isRon && drawn == null && phase === 'discard' && isAgari([...hand, winTile]);

  const agariResult: AnalyzeResult | null = useMemo(() => {
    if (phase !== 'agari' || !agariTile) return null;
    return analyzeHand({
      concealed: sortTileIds([...hand, agariTile]),
      winningTile: agariTile,
      tsumo: agariTsumo,
      riichi: t.riichi,
      oya: t.oya,
      roundWind: t.roundWind,
      seatWind: t.seatWind,
      doraIndicators: t.doraIndicators,
    });
  }, [phase, agariTile, agariTsumo, hand, t]);

  function reset(l = level) {
    const next = generatePracticeProblem(l);
    setLevel(l);
    setPp(next);
    setRun(initRun(next));
    setSelected(null);
    setTurn(0);
    setAgariTile(null);
    setAgariTsumo(false);
  }

  function draw() {
    if (phase !== 'draw' || queue.length === 0 || drawsUsed >= maxDraws) return;
    setRun((r) => ({
      ...r,
      drawn: r.queue[0],
      queue: r.queue.slice(1),
      drawsUsed: r.drawsUsed + 1,
      phase: 'discard',
    }));
    setTurn((n) => n + 1);
    setSelected(null);
  }

  function discard(tile: TileId) {
    if (phase !== 'discard' || drawn == null) return;
    const nextHand = tile === drawn ? hand : sortTileIds([...removeOne(hand, tile), drawn]);

    // 目標テンパイに対して不足した牌はツモ山に戻す（ツモ和了牌は常に最後に残す）
    const have = tally(nextHand);
    const shortfall: TileId[] = [];
    for (const [id, need] of goalCounts) {
      for (let k = (have.get(id) ?? 0); k < need; k++) shortfall.push(id);
    }
    let nextQueue = [...queue];
    for (const g of shortfall) {
      if (!pp.isRon && nextQueue[nextQueue.length - 1] === winTile) {
        nextQueue.splice(nextQueue.length - 1, 0, g);
      } else {
        nextQueue.push(g);
      }
    }

    const tenpaiForRon = pp.isRon && isAgari([...nextHand, winTile]);
    let nextPhase: Phase;
    if (tenpaiForRon) nextPhase = 'discard'; // ロン待ち（drawn=null で切る操作は不可）
    else if (nextQueue.length > 0 && drawsUsed < maxDraws) nextPhase = 'draw';
    else nextPhase = 'dead';

    setRun((r) => ({ ...r, hand: nextHand, queue: nextQueue, drawn: null, phase: nextPhase }));
    setSelected(null);
  }

  function declareTsumo() {
    if (!canTsumo || drawn == null) return;
    setAgariTile(drawn);
    setAgariTsumo(true);
    setRun((r) => ({ ...r, drawn: null, phase: 'agari' }));
  }

  function declareRon() {
    if (!ronReady) return;
    setAgariTile(winTile);
    setAgariTsumo(false);
    setRun((r) => ({ ...r, phase: 'agari' }));
  }

  const displayHand = sortTileIds(hand);

  return (
    <div className="screen">
      <div className="level-tabs">
        {LEVELS.map((l) => (
          <button key={l} className={l === level ? 'active' : ''} onClick={() => reset(l)}>
            Lv.{l}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button onClick={() => reset()}>やり直す</button>
      </div>

      <div className="card">
        <div className="meta-row">
          <span>
            <b>{t.roundLabel}</b> {t.seatLabel}
          </span>
          <span>
            あなた：<b>{t.oya ? '親' : '子'}</b>
          </span>
          {t.riichi && <span><b>リーチ中</b></span>}
          <span className="dora-inline">
            ドラ表示：
            {t.doraIndicators.map((id, i) => (
              <Tile key={i} id={id} size="sm" />
            ))}
          </span>
          <span>ツモ {drawsUsed}/{maxDraws}</span>
        </div>

        {phase !== 'agari' && (
          <>
            <div className="practice-hand">
              {displayHand.map((id, i) => (
                <span key={`h${i}`} className="tile-slot">
                  <button
                    className="tile-btn"
                    onClick={() => setSelected(selected === id ? null : id)}
                    disabled={phase !== 'discard' || drawn == null}
                  >
                    <Tile id={id} size="md" raised={selected === id} />
                  </button>
                </span>
              ))}
              {drawn && (
                <span className="tile-slot practice-drawn">
                  <button
                    className="tile-btn"
                    onClick={() => setSelected(selected === drawn ? null : drawn)}
                  >
                    <Tile id={drawn} size="md" raised={selected === drawn} />
                  </button>
                </span>
              )}
            </div>

            <p className="practice-hint">
              {isDead && 'ツモが尽きました。牌効率を意識してもう一度。'}
              {!isDead && phase === 'draw' && 'ツモってください。'}
              {!isDead && phase === 'discard' && drawn != null && '牌効率を考えて、いらない牌を切りましょう。'}
              {!isDead && phase === 'discard' && drawn == null && 'テンパイ！ ロンできます。'}
            </p>

            <div className="practice-actions">
              {!isDead && phase === 'draw' && (
                <button className="primary-btn" onClick={draw}>
                  ツモる
                </button>
              )}
              {!isDead && phase === 'discard' && drawn != null && (
                <>
                  <button
                    className="primary-btn"
                    onClick={() => selected && discard(selected)}
                    disabled={!selected}
                  >
                    この牌を切る
                  </button>
                  <button className="ghost-btn" onClick={() => discard(drawn)}>
                    ツモ切り
                  </button>
                </>
              )}
              {isDead && (
                <button className="primary-btn" onClick={() => reset()}>
                  もう一度
                </button>
              )}
            </div>

            {(canTsumo || ronReady) && (
              <div className="agari-banner">
                <b>アガリ可能！</b>
                <div className="practice-actions">
                  {canTsumo && (
                    <button className="primary-btn" onClick={declareTsumo}>
                      ツモ
                    </button>
                  )}
                  {ronReady && (
                    <button className="primary-btn" onClick={declareRon}>
                      ロン（他家の捨て牌で和了）
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'agari' && agariResult && (
          <>
            <div className="agari-banner">
              <b>アガリ！</b> {agariTsumo ? 'ツモ' : 'ロン'}
            </div>
            <div className="practice-hand">
              {sortTileIds(hand).map((id, i) => (
                <Tile key={i} id={id} size="md" />
              ))}
              {agariTile && (
                <span className="practice-drawn">
                  <Tile id={agariTile} size="md" raised />
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {phase === 'agari' && agariResult && !agariResult.valid && (
        <div className="card">
          <p className="hint">この形では役がなくアガれません。もう一度、牌効率を意識して進めましょう。</p>
          <button className="primary-btn" onClick={() => reset()}>
            もう一度
          </button>
        </div>
      )}

      {phase === 'agari' && agariResult && agariResult.valid && (
        <>
          <p style={{ textAlign: 'center', fontWeight: 700 }}>役・翻・符・点数を計算しましょう</p>
          <AnalysisAnswer
            key={pp.target.id + turn}
            result={agariResult}
            oya={t.oya}
            tsumo={agariTsumo}
            optionSeed={turn * 131 + hand.length}
            nextLabel="次の局へ"
            onNext={() => reset()}
            onGraded={(ok) => record(ok, [...t.tags, 'practice'])}
          />
        </>
      )}

      <div className="stat-row">
        <span>正答 {stats.correct}/{stats.total}</span>
        <span>連続正解 {stats.streak}</span>
      </div>
    </div>
  );
}
