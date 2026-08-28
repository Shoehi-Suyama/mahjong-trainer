export const TAG_LABEL: Record<string, string> = {
  ron: 'ロン', tsumo: 'ツモ', oya: '親', child: '子',
  pinfu: 'ピンフ', riichi: 'リーチ', yakuhai: '役牌',
  chiitoitsu: '七対子', dora: 'ドラあり', fu: '符計算あり', basic: '基本(1〜2翻)',
  sanshoku: '三色同順', ittsuu: '一気通貫', toitoi: '対々和', sanankou: '三暗刻',
  honitsu: '混一色', chinitsu: '清一色', chanta: 'チャンタ', iipeikou: '一盃口',
  meld: '鳴きあり', kuitan: '喰いタン',
  practice: '実戦', timeattack: 'タイムアタック',
};

export function tagLabel(tag: string): string {
  return TAG_LABEL[tag] ?? tag;
}
