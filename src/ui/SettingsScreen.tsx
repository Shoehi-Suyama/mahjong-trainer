// 設定画面（仕様 #10）。

import { useSettings } from './useSettings';

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={String(o.value)}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsScreen() {
  const { settings, update } = useSettings();

  return (
    <div className="screen">
      <div className="card setting-row">
        <div>
          <b>回答方式</b>
          <p>点数・符の答え方。入力式は正確な数字を要求します（仕様 #12）。</p>
        </div>
        <Segmented
          value={settings.answerMode}
          options={[
            { value: 'choice', label: '選択式' },
            { value: 'input', label: '入力式' },
          ]}
          onChange={(v) => update({ answerMode: v })}
        />
      </div>

      <div className="card setting-row">
        <div>
          <b>連風牌の雀頭符</b>
          <p>場風かつ自風の牌（例：東場の東家の東）を雀頭にしたときの符。</p>
        </div>
        <Segmented
          value={settings.renpuuFu}
          options={[
            { value: 4, label: '+4符' },
            { value: 2, label: '+2符' },
          ]}
          onChange={(v) => update({ renpuuFu: v })}
        />
      </div>

      <div className="card setting-row">
        <div>
          <b>符の内訳を常に表示</b>
          <p>解説の【符】を最初から開いた状態にします。</p>
        </div>
        <Segmented
          value={settings.fuDetailDefaultOpen ? 'on' : 'off'}
          options={[
            { value: 'off', label: '折りたたむ' },
            { value: 'on', label: '常に表示' },
          ]}
          onChange={(v) => update({ fuDetailDefaultOpen: v === 'on' })}
        />
      </div>

      <p style={{ color: '#777', fontSize: '0.85rem' }}>
        設定は次の問題から反映されます。
      </p>
    </div>
  );
}
