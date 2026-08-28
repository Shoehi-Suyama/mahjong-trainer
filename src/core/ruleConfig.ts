// ローカルルールの差異を吸収する設定。UI 非依存。
// 設定画面から更新し、fu 計算などが参照する。

export interface RuleConfig {
  /** 連風牌（場風かつ自風）の雀頭符。一般に +4 だが +2 とする流派もある。 */
  renpuuFu: 2 | 4;
}

export const ruleConfig: RuleConfig = {
  renpuuFu: 4,
};

export function setRuleConfig(patch: Partial<RuleConfig>): void {
  Object.assign(ruleConfig, patch);
}
