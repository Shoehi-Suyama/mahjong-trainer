// 実戦用 点数計算モード（追加仕様書）。牌をタップして手牌・条件を入力し、
// 役・翻・符・点数を自動計算する。計算エンジンは core/practical + core/analyze を再利用。

import { useMemo, useState } from 'react';
import Tile from '../Tile';
import TileKeypad from './TileKeypad';
import Stepper from './Stepper';
import MeldPicker, { MeldChips } from './MeldPicker';
import IndicatorPicker from './IndicatorPicker';
import PracticalResult from './PracticalResult';
import HistoryModal from './HistoryModal';
import { useCalcHistory, type HistoryEntry } from './useCalcHistory';
import {
  type PracticalInput,
  emptyPracticalInput,
  validatePractical,
  calcPractical,
} from '../../core/practical';
import { sortTileIds, type HonorTileId, type TileId } from '../../core/tiles';
import type { Meld } from '../../core/hand';

function removeOne(arr: TileId[], t: TileId): TileId[] {
  const i = arr.indexOf(t);
  if (i < 0) return arr;
  return [...arr.slice(0, i), ...arr.slice(i + 1)];
}

function Seg<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o.v)} className={o.v === value ? 'active' : ''} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const OTHER_YAKU: { key: keyof PracticalInput; label: string }[] = [
  { key: 'haitei', label: '海底摸月' },
  { key: 'houtei', label: '河底撈魚' },
  { key: 'rinshan', label: '嶺上開花' },
  { key: 'chankan', label: '槍槓' },
  { key: 'tenho', label: '天和' },
  { key: 'chiho', label: '地和' },
];

export default function PracticalCalc() {
  const { history, add, clear, sticky } = useCalcHistory();

  const [input, setInput] = useState<PracticalInput>(() => {
    const base = emptyPracticalInput();
    if (sticky) {
      base.oya = sticky.oya;
      base.roundWind = sticky.roundWind;
      base.seatWind = sticky.seatWind;
      base.doraIndicators = sticky.doraIndicators;
      base.honba = sticky.honba;
      base.kyotaku = sticky.kyotaku;
    }
    return base;
  });
  const [pickWin, setPickWin] = useState(false);
  const [meldOpen, setMeldOpen] = useState(false);
  const [indOpen, setIndOpen] = useState<null | 'dora' | 'ura'>(null);
  const [showOther, setShowOther] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ReturnType<typeof calcPractical> | null>(null);
  const [histOpen, setHistOpen] = useState(false);

  const patch = (p: Partial<PracticalInput> | ((i: PracticalInput) => Partial<PracticalInput>)) => {
    setInput((i) => ({ ...i, ...(typeof p === 'function' ? p(i) : p) }));
    setErrors([]);
  };

  const need = 14 - 3 * input.melds.length;
  const sorted = useMemo(() => sortTileIds(input.concealed), [input.concealed]);
  const counts = useMemo(() => {
    const m = new Map<TileId, number>();
    for (const t of [...input.concealed, ...input.melds.flatMap((x) => x.tiles)]) {
      m.set(t, (m.get(t) ?? 0) + 1);
    }
    return m;
  }, [input.concealed, input.melds]);
  const winIdx = input.winningTile ? sorted.indexOf(input.winningTile) : -1;
  const handFull = input.concealed.length >= need;

  function addTile(id: TileId) {
    patch((i) => {
      if (i.concealed.length >= 14 - 3 * i.melds.length) return {};
      return { concealed: [...i.concealed, id], winningTile: id };
    });
  }
  function handTileClick(id: TileId) {
    if (pickWin) {
      patch({ winningTile: id });
      setPickWin(false);
      return;
    }
    patch((i) => {
      const next = removeOne(i.concealed, id);
      return {
        concealed: next,
        winningTile: i.winningTile && next.includes(i.winningTile) ? i.winningTile : null,
      };
    });
  }

  function setOya(oya: boolean) {
    patch((i) => ({ oya, seatWind: oya ? 'east' : i.seatWind === 'east' ? 'south' : i.seatWind }));
  }

  function toggleRiichi(kind: 'riichi' | 'double') {
    patch((i) => {
      if (kind === 'riichi') {
        const on = !i.riichi;
        return { riichi: on, doubleRiichi: false, ippatsu: on ? i.ippatsu : false };
      }
      const on = !i.doubleRiichi;
      return { doubleRiichi: on, riichi: false, ippatsu: on ? i.ippatsu : false };
    });
  }

  function calc() {
    const errs = validatePractical(input);
    setErrors(errs);
    if (errs.length) return;
    const r = calcPractical(input);
    setResult(r);
    const entry: HistoryEntry = {
      at: Date.now(),
      input,
      summary: {
        total: r.score.total,
        han: r.han.total,
        fu: r.fu.rounded,
        yakuman: r.han.yakuman,
        limit: r.score.limit,
        oya: input.oya,
        tsumo: input.tsumo,
        yaku: r.han.yaku.map((y) => y.name),
      },
    };
    if (r.valid) add(entry);
  }

  function nextAgari() {
    setResult(null);
    setErrors([]);
    setPickWin(false);
    setInput((i) => ({
      ...i,
      concealed: [],
      melds: [],
      winningTile: null,
      riichi: false,
      doubleRiichi: false,
      ippatsu: false,
      haitei: false,
      houtei: false,
      rinshan: false,
      chankan: false,
      tenho: false,
      chiho: false,
      uraIndicators: [],
      akaDora: 0,
    }));
  }

  const riichiOn = input.riichi || input.doubleRiichi;

  return (
    <div className="screen practical">
      <div className="practical-topbar">
        <span>牌をタップして入力 → 計算</span>
        <button className="ghost-btn small" onClick={() => setHistOpen(true)}>
          履歴
        </button>
      </div>

      {/* 手牌 */}
      <div className="card">
        <div className="sec-head">
          <b>手牌</b>
          <span className={handFull ? 'ok' : ''}>
            {input.concealed.length} / {need}枚
          </span>
        </div>
        <div className="practice-hand" style={{ minHeight: 56 }}>
          {sorted.map((id, i) => (
            <button
              key={i}
              className={`tile-btn${i === winIdx ? ' win-tile' : ''}`}
              onClick={() => handTileClick(id)}
            >
              <Tile id={id} size="md" raised={i === winIdx} />
              {i === winIdx && <span className="win-badge">和</span>}
            </button>
          ))}
          {sorted.length === 0 && <span style={{ color: '#999' }}>下の牌をタップ</span>}
        </div>
        <div className="practice-actions" style={{ justifyContent: 'flex-start' }}>
          <button
            className={`ghost-btn small${pickWin ? ' active' : ''}`}
            onClick={() => setPickWin((v) => !v)}
            disabled={input.concealed.length === 0}
          >
            {pickWin ? 'アガリ牌にする牌をタップ' : 'アガリ牌を変更'}
          </button>
          <span style={{ fontSize: '0.8rem', color: '#777', alignSelf: 'center' }}>
            アガリ牌：<b>{input.winningTile ? '設定済み' : '最後に追加した牌'}</b>（手牌タップで削除）
          </span>
        </div>
        <TileKeypad onPick={addTile} counts={counts} disabled={() => handFull} />
      </div>

      {/* 副露 */}
      <div className="card">
        <div className="sec-head">
          <b>副露（鳴き）</b>
          <button className="ghost-btn small" onClick={() => setMeldOpen(true)}>
            副露を追加
          </button>
        </div>
        <MeldChips
          melds={input.melds}
          onRemove={(idx) => patch({ melds: input.melds.filter((_, j) => j !== idx) })}
        />
        {input.melds.length === 0 && <span style={{ color: '#999', fontSize: '0.85rem' }}>なし</span>}
      </div>

      {/* アガリ方法・親子 */}
      <div className="card sec-grid">
        <div>
          <div className="sec-head"><b>アガリ方法</b></div>
          <Seg
            value={input.tsumo ? 'tsumo' : 'ron'}
            options={[
              { v: 'ron', label: 'ロン' },
              { v: 'tsumo', label: 'ツモ' },
            ]}
            onChange={(v) => patch({ tsumo: v === 'tsumo' })}
          />
        </div>
        <div>
          <div className="sec-head"><b>親・子</b></div>
          <Seg
            value={input.oya ? 'oya' : 'ko'}
            options={[
              { v: 'ko', label: '子' },
              { v: 'oya', label: '親' },
            ]}
            onChange={(v) => setOya(v === 'oya')}
          />
        </div>
        <div>
          <div className="sec-head"><b>場風</b></div>
          <Seg
            value={input.roundWind}
            options={[
              { v: 'east' as HonorTileId, label: '東場' },
              { v: 'south' as HonorTileId, label: '南場' },
            ]}
            onChange={(v) => patch({ roundWind: v })}
          />
        </div>
        {!input.oya && (
          <div>
            <div className="sec-head"><b>自風</b></div>
            <Seg
              value={input.seatWind}
              options={[
                { v: 'south' as HonorTileId, label: '南家' },
                { v: 'west' as HonorTileId, label: '西家' },
                { v: 'north' as HonorTileId, label: '北家' },
              ]}
              onChange={(v) => patch({ seatWind: v })}
            />
          </div>
        )}
      </div>

      {/* 条件 */}
      <div className="card">
        <div className="sec-head"><b>条件</b></div>
        <div className="chip-group">
          <button
            className={`chip${input.riichi ? ' on' : ''}`}
            onClick={() => toggleRiichi('riichi')}
            disabled={input.melds.some((m) => m.open)}
          >
            リーチ
          </button>
          <button
            className={`chip${input.doubleRiichi ? ' on' : ''}`}
            onClick={() => toggleRiichi('double')}
            disabled={input.melds.some((m) => m.open)}
          >
            ダブルリーチ
          </button>
          <button
            className={`chip${input.ippatsu ? ' on' : ''}`}
            onClick={() => patch({ ippatsu: !input.ippatsu })}
            disabled={!riichiOn}
          >
            一発
          </button>
        </div>
        <button className="linkbtn" onClick={() => setShowOther((v) => !v)}>
          {showOther ? 'その他の条件を閉じる' : 'その他の条件（海底・河底・嶺上・槍槓・天和・地和）'}
        </button>
        {showOther && (
          <div className="chip-group" style={{ marginTop: 6 }}>
            {OTHER_YAKU.map((o) => (
              <button
                key={o.key}
                className={`chip${input[o.key] ? ' on' : ''}`}
                onClick={() => patch((i) => ({ [o.key]: !i[o.key] }) as Partial<PracticalInput>)}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ドラ */}
      <div className="card">
        <div className="sec-head"><b>ドラ</b></div>
        <div className="dora-row">
          <button className="ghost-btn small" onClick={() => setIndOpen('dora')}>
            ドラ表示牌（{input.doraIndicators.length}）
          </button>
          {input.doraIndicators.map((id, i) => (
            <Tile key={i} id={id} size="sm" />
          ))}
        </div>
        {riichiOn && (
          <div className="dora-row">
            <button className="ghost-btn small" onClick={() => setIndOpen('ura')}>
              裏ドラ表示牌（{input.uraIndicators.length}）
            </button>
            {input.uraIndicators.map((id, i) => (
              <Tile key={i} id={id} size="sm" />
            ))}
          </div>
        )}
        <div className="dora-row">
          <span>赤ドラ</span>
          <Stepper value={input.akaDora} min={0} max={4} onChange={(v) => patch({ akaDora: v })} suffix="枚" />
        </div>
      </div>

      {/* 本場・供託 */}
      <div className="card sec-grid">
        <div>
          <div className="sec-head"><b>本場</b></div>
          <Stepper value={input.honba} min={0} max={20} onChange={(v) => patch({ honba: v })} suffix="本場" />
        </div>
        <div>
          <div className="sec-head"><b>供託（リーチ棒）</b></div>
          <Stepper value={input.kyotaku} min={0} max={10} onChange={(v) => patch({ kyotaku: v })} suffix="本" />
        </div>
      </div>

      {errors.length > 0 && (
        <div className="card err-box">
          <b>入力内容を確認してください</b>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>・{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="practical-bottom">
        <button className="primary-btn" onClick={calc}>
          点数を計算
        </button>
      </div>

      {meldOpen && (
        <MeldPicker
          onClose={() => setMeldOpen(false)}
          onDone={(m: Meld) => {
            setMeldOpen(false);
            patch((i) => ({
              melds: [...i.melds, m],
              // 明副露が入ったらリーチ系は自動でオフ
              ...(m.open ? { riichi: false, doubleRiichi: false, ippatsu: false } : {}),
            }));
          }}
        />
      )}
      {indOpen && (
        <IndicatorPicker
          title={indOpen === 'dora' ? 'ドラ表示牌' : '裏ドラ表示牌'}
          indicators={indOpen === 'dora' ? input.doraIndicators : input.uraIndicators}
          onChange={(next) =>
            patch(indOpen === 'dora' ? { doraIndicators: next } : { uraIndicators: next })
          }
          onClose={() => setIndOpen(null)}
        />
      )}
      {result && (
        <PracticalResult
          result={result}
          oya={input.oya}
          tsumo={input.tsumo}
          onNext={nextAgari}
          onClose={() => setResult(null)}
        />
      )}
      {histOpen && (
        <HistoryModal
          history={history}
          onClear={clear}
          onClose={() => setHistOpen(false)}
          onRestore={(e) => {
            setInput(e.input);
            setResult(null);
            setErrors([]);
            setHistOpen(false);
          }}
        />
      )}
    </div>
  );
}
