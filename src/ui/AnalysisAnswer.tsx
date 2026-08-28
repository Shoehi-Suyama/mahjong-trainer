// 役・翻・符・点数を個別に答えて個別採点するフォーム（仕様 #13, #14, #22）。
// 手牌分析問題モードと実戦トレーニングのアガリ後で共用する。

import { useMemo, useState } from 'react';
import Explanation from './Explanation';
import { mulberry32, shuffle, type Rng } from '../generator/random';
import { calculateScore } from '../core/score';
import type { AnalyzeResult } from '../core/analyze';

const DISTRACTORS = [
  'リーチ', '門前清自摸和', 'タンヤオ', 'ピンフ', '一盃口', '二盃口',
  '役牌（白）', '役牌（發）', '役牌（中）',
  '三色同順', '三色同刻', '一気通貫', '対々和', '三暗刻',
  '混全帯幺九', '純全帯幺九', '混老頭', '小三元',
  '混一色', '清一色', '七対子',
];

function buildYakuOptions(actual: string[], seed: number): string[] {
  const rng: Rng = mulberry32(seed);
  const pool = shuffle(rng, DISTRACTORS.filter((d) => !actual.includes(d)));
  const nDistract = Math.max(3, 8 - actual.length);
  return shuffle(rng, [...actual, ...pool.slice(0, nDistract)]);
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

function Mark({ ok }: { ok: boolean }) {
  return (
    <span style={{ color: ok ? 'var(--primary)' : 'var(--accent)', fontWeight: 800 }}>
      {ok ? '○' : '×'}
    </span>
  );
}

interface AnalysisAnswerProps {
  result: AnalyzeResult;
  oya: boolean;
  tsumo: boolean;
  optionSeed: number;
  nextLabel: string;
  onNext: () => void;
  onGraded?: (allOK: boolean) => void;
}

export default function AnalysisAnswer({
  result: r,
  oya,
  tsumo,
  optionSeed,
  nextLabel,
  onNext,
  onGraded,
}: AnalysisAnswerProps) {
  const [submitted, setSubmitted] = useState(false);
  const [yakuSel, setYakuSel] = useState<Set<string>>(new Set());
  const [han, setHan] = useState('');
  const [fu, setFu] = useState('');
  const [point, setPoint] = useState('');

  const usesFu = !r.score.limit;
  const usesHan = r.han.yakuman === 0;
  const actualYaku = useMemo(() => r.han.yaku.map((y) => y.name), [r]);
  const options = useMemo(() => buildYakuOptions(actualYaku, optionSeed), [actualYaku, optionSeed]);

  const yakuOK = sameSet(yakuSel, new Set(actualYaku));
  const hanOK = !usesHan || Number(han) === r.han.total;
  const fuOK = !usesFu || Number(fu) === r.fu.rounded;
  const pointOK = Number(point) === r.score.total;
  const allOK = yakuOK && hanOK && fuOK && pointOK;

  const fuCausedPoint =
    usesFu &&
    !fuOK &&
    !pointOK &&
    Number(fu) > 0 &&
    Number(point) === calculateScore({ han: r.han.total, fu: Number(fu), oya, tsumo }).total;

  function toggleYaku(name: string) {
    if (submitted) return;
    setYakuSel((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function submit() {
    if (submitted) return;
    setSubmitted(true);
    onGraded?.(allOK);
  }

  return (
    <>
      <div className="card analysis-form">
        <fieldset>
          <legend>成立している役</legend>
          <div className="chip-group">
            {options.map((name) => {
              const on = yakuSel.has(name);
              const cls = submitted
                ? actualYaku.includes(name)
                  ? 'chip correct'
                  : on
                    ? 'chip wrong'
                    : 'chip'
                : on
                  ? 'chip on'
                  : 'chip';
              return (
                <button key={name} className={cls} onClick={() => toggleYaku(name)} disabled={submitted}>
                  {name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="num-fields">
          <label className={usesHan ? '' : 'disabled'}>
            翻
            <input
              type="number"
              inputMode="numeric"
              value={usesHan ? han : ''}
              onChange={(e) => setHan(e.target.value)}
              disabled={submitted || !usesHan}
              placeholder={usesHan ? '' : '不問'}
            />
            翻
          </label>
          <label className={usesFu ? '' : 'disabled'}>
            符
            <input
              type="number"
              inputMode="numeric"
              value={usesFu ? fu : ''}
              onChange={(e) => setFu(e.target.value)}
              disabled={submitted || !usesFu}
              placeholder={usesFu ? '' : '不問'}
            />
            符
          </label>
          <label>
            点
            <input
              type="number"
              inputMode="numeric"
              value={point}
              onChange={(e) => setPoint(e.target.value)}
              disabled={submitted}
            />
            点
          </label>
        </div>

        {!submitted ? (
          <button
            className="primary-btn"
            onClick={submit}
            disabled={!point || (usesHan && !han) || (usesFu && !fu)}
          >
            回答する
          </button>
        ) : (
          <div className="grade">
            <table className="grade-table">
              <tbody>
                <tr>
                  <th>役</th>
                  <td><Mark ok={yakuOK} /></td>
                </tr>
                {usesHan && (
                  <tr>
                    <th>翻数</th>
                    <td><Mark ok={hanOK} /> <small>正解 {r.han.total}翻</small></td>
                  </tr>
                )}
                {usesFu && (
                  <tr>
                    <th>符</th>
                    <td><Mark ok={fuOK} /> <small>正解 {r.fu.rounded}符</small></td>
                  </tr>
                )}
                <tr>
                  <th>点数</th>
                  <td><Mark ok={pointOK} /> <small>正解 {r.score.total.toLocaleString()}点</small></td>
                </tr>
              </tbody>
            </table>
            {fuCausedPoint && <p className="hint">符計算が原因で点数を間違えています。</p>}
          </div>
        )}
      </div>

      {submitted && (
        <>
          <div className="card">
            <div className={`verdict ${allOK ? 'ok' : 'ng'}`}>{allOK ? '全問正解！' : 'おしい'}</div>
            <Explanation result={r} oya={oya} tsumo={tsumo} />
          </div>
          <button className="primary-btn" onClick={onNext}>
            {nextLabel}
          </button>
        </>
      )}
    </>
  );
}
