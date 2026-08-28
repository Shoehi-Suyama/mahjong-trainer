// 実戦トレーニング（仕様 #17-23）。配牌からツモ・打牌を繰り返し、アガリで点数計算。
// 打牌選択は採点しない（#18）。× 印の不要牌を切ればアガリに到達する。

import { useMemo, useState } from 'react';
import Tile from './Tile';
import AnalysisAnswer from './AnalysisAnswer';
import { generatePracticeProblem, type PracticeProblem } from '../generator/generatePractice';
import { isAgari } from '../core/hand';
import { analyzeHand, type AnalyzeResult } from '../core/analyze';
import { sortTileIds, type TileId } from '../core/tiles';
import { useStats } from './useStats';

const LEVELS = [1, 2, 3, 4, 5];

type Phase = 'draw' | 'discard' | 'agari' | 'dead';

function removeOne(arr: TileId[], t: TileId): TileId[] {
  const i = arr.indexOf(t);
  if (i < 0) return arr;
  const copy = [...arr];
  copy.splice(i, 1);
  return copy;
}

export default function PracticeTraining() {
  const { stats, record } = useStats();
  const [level, setLevel] = useState(1);
  const [pp, setPp] = useState<PracticeProblem>(() => generatePracticeProblem(1));

  const [hand, setHand] = useState<TileId[]>(() => pp.startHand);
  const [drawn, setDrawn] = useState<TileId | null>(null);
  const [drawIdx, setDrawIdx] = useState(0);
  const [selected, setSelected] = useState<TileId | null>(null);
  const [phase, setPhase] = useState<Phase>('draw');
  const [turn, setTurn] = useState(0);

  const [agariTile, setAgariTile] = useState<TileId | null>(null);
  const [agariTsumo, setAgariTsumo] = useState(false);

  const t = pp.target;

  const full = drawn ? [...hand, drawn] : hand;
  const canTsumo = drawn != null && isAgari(full);
  const drawsLeft = pp.draws.length - drawIdx;
  const ronReady =
    pp.isRon && drawsLeft === 0 && phase === 'discard' && drawn == null && isAgari([...hand, pp.ronTile!]);

  const remainingJunk = useMemo(() => {
    const set = new Set(pp.junk);
    return new Set(hand.filter((x) => set.has(x)));
  }, [hand, pp.junk]);

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
    setHand(next.startHand);
    setDrawn(null);
    setDrawIdx(0);
    setSelected(null);
    setPhase('draw');
    setTurn(0);
    setAgariTile(null);
    setAgariTsumo(false);
  }

  function draw() {
    if (phase !== 'draw' || drawIdx >= pp.draws.length) return;
    setDrawn(pp.draws[drawIdx]);
    setDrawIdx((n) => n + 1);
    setTurn((n) => n + 1);
    setPhase('discard');
    setSelected(null);
  }

  function discard(tile: TileId) {
    if (phase !== 'discard' || drawn == null) return;
    let nextHand: TileId[];
    if (tile === drawn) {
      nextHand = hand; // ツモ切り
    } else {
      nextHand = sortTileIds([...removeOne(hand, tile), drawn]);
    }
    setHand(nextHand);
    setDrawn(null);
    setSelected(null);

    if (pp.isRon && drawIdx >= pp.draws.length) {
      // ツモ列を撃ち終えた → ロンできるか
      setPhase(isAgari([...nextHand, pp.ronTile!]) ? 'discard' : 'dead');
    } else if (drawIdx >= pp.draws.length) {
      setPhase('dead');
    } else {
      setPhase('draw');
    }
  }

  function declareTsumo() {
    if (!canTsumo || drawn == null) return;
    setAgariTile(drawn);
    setAgariTsumo(true);
    setHand(hand); // drawn は agariTile として渡す
    setDrawn(null);
    setPhase('agari');
  }

  function declareRon() {
    if (!ronReady) return;
    setAgariTile(pp.ronTile!);
    setAgariTsumo(false);
    setPhase('agari');
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
          <span>ツモ {drawIdx}/{pp.draws.length}</span>
        </div>

        {phase !== 'agari' && (
          <>
            <div className="practice-hand">
              {displayHand.map((id, i) => {
                const isJunk = remainingJunk.has(id);
                return (
                  <span key={`h${i}`} className="tile-slot">
                    <button
                      className="tile-btn"
                      onClick={() => setSelected(selected === id ? null : id)}
                      disabled={phase !== 'discard'}
                    >
                      <Tile id={id} size="md" raised={selected === id} />
                    </button>
                    {isJunk && <span className="junk-badge">×</span>}
                  </span>
                );
              })}
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
              {phase === 'draw' && 'ツモってください。'}
              {phase === 'discard' && '切る牌をタップ → 「この牌を切る」。× 印は不要牌です。'}
              {phase === 'dead' && 'この手ではアガリに届きませんでした。'}
            </p>

            <div className="practice-actions">
              {phase === 'draw' && drawsLeft > 0 && (
                <button className="primary-btn" onClick={draw}>
                  ツモる（残り{drawsLeft}）
                </button>
              )}
              {phase === 'discard' && (
                <>
                  <button
                    className="primary-btn"
                    onClick={() => selected && discard(selected)}
                    disabled={!selected}
                  >
                    この牌を切る
                  </button>
                  {drawn && (
                    <button className="ghost-btn" onClick={() => discard(drawn)}>
                      ツモ切り
                    </button>
                  )}
                </>
              )}
              {phase === 'dead' && (
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
                      ロン（{'他家の捨て牌で和了'}）
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
          <p className="hint">
            この手には役がありません（アガれません）。× 印の不要牌を切って手を進めましょう。
          </p>
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
