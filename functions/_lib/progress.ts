/** 生徒の記録 (AppState) から、教員一覧用の要約をサーバ側で計算する (改ざん防止のため端末の申告値は使わない) */
import { computeScore, parseState, stepStatus, type AppState } from "../../lib/state";
import { getCurrentRank } from "../../lib/ranks";
import { STEPS } from "../../lib/steps";

export const MAX_STATE_BYTES = 400 * 1024;

export interface Summary {
  score: number;
  rankId: string;
  step: number;
  stepsReady: number;
  actionsTotal: number;
  actionsDone: number;
}

export function summarize(st: AppState): Summary {
  const score = computeScore(st);
  return {
    score,
    rankId: getCurrentRank(score).id,
    step: st.step,
    stepsReady: STEPS.filter((s) => stepStatus(s, st).ready).length,
    actionsTotal: st.actions.length,
    actionsDone: st.actions.filter((a) => a.status === "done").length,
  };
}

/** 受け取った state を検証・正規化する。不正なら null */
export function sanitizeState(raw: unknown): AppState | null {
  return parseState(raw);
}
