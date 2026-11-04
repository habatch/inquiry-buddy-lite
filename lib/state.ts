import { STEPS, type Field, type StepDef } from "./steps";
import {
  scoreFromUserMessage,
  SCORE_NEXT_READY,
  SCORE_STEP_TRANSITION,
} from "./ranks";
import type { UserProfile } from "./topics";

export const STORAGE_KEY = "inquiry-buddy-lite-v1";

export interface AppState {
  profile: UserProfile | null;
  step: number;
  /** "step.fieldId" → 回答 */
  answers: Record<string, string>;
  /** "step.index" → チェック済みか */
  checks: Record<string, boolean>;
  /** 「次へ進む」ボーナスを受け取ったステップ */
  advanced: number[];
}

export const EMPTY_STATE: AppState = {
  profile: null,
  step: 1,
  answers: {},
  checks: {},
  advanced: [],
};

export const answerKey = (step: number, fieldId: string) => `${step}.${fieldId}`;
export const checkKey = (step: number, idx: number) => `${step}.${idx}`;

export function fieldFilled(field: Field, value: string | undefined): boolean {
  return (value ?? "").trim().length >= (field.minChars ?? 10);
}

export function stepStatus(s: StepDef, st: AppState) {
  const required = s.fields.filter((f) => f.required !== false);
  const filled = required.filter((f) =>
    fieldFilled(f, st.answers[answerKey(s.id, f.id)]),
  ).length;
  const checked = s.checklist.filter((_, i) => st.checks[checkKey(s.id, i)]).length;
  const fieldsDone = filled === required.length;
  const checksDone = checked === s.checklist.length;
  return {
    filled,
    required: required.length,
    checked,
    checkTotal: s.checklist.length,
    fieldsDone,
    checksDone,
    /** 次へ進める状態 (AI 版の nextReady 相当) */
    ready: fieldsDone && checksDone,
  };
}

/**
 * スコアは「今書かれている内容」から毎回計算する (積み上げ式ではない)。
 * 同じ欄を書き直してもスコアは増えないので、水増しができない。
 *  - 各回答: ranks.ts の scoreFromUserMessage (4 + 文字数×0.12、上限 28)
 *  - ステップの記入とチェックがすべてそろう: +30
 *  - 「次へ進む」を押した: +50 (各ステップ 1 回)
 */
export function computeScore(st: AppState): number {
  let score = 0;
  for (const s of STEPS) {
    for (const f of s.fields) {
      score += scoreFromUserMessage(st.answers[answerKey(s.id, f.id)] ?? "");
    }
    if (stepStatus(s, st).ready) score += SCORE_NEXT_READY;
  }
  score += st.advanced.length * SCORE_STEP_TRANSITION;
  return score;
}

/** localStorage / バックアップファイルから読んだ値を安全に AppState にする */
export function parseState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<AppState>;
  const strRecord = (x: unknown) =>
    x && typeof x === "object"
      ? Object.fromEntries(
          Object.entries(x as Record<string, unknown>).filter(
            ([, v]) => typeof v === "string",
          ),
        )
      : {};
  const boolRecord = (x: unknown) =>
    x && typeof x === "object"
      ? Object.fromEntries(
          Object.entries(x as Record<string, unknown>).filter(
            ([, v]) => typeof v === "boolean",
          ),
        )
      : {};
  return {
    profile:
      d.profile && typeof d.profile === "object" && Array.isArray(d.profile.interests)
        ? d.profile
        : null,
    step:
      typeof d.step === "number" && d.step >= 1 && d.step <= STEPS.length ? d.step : 1,
    answers: strRecord(d.answers) as Record<string, string>,
    checks: boolRecord(d.checks) as Record<string, boolean>,
    advanced: Array.isArray(d.advanced)
      ? d.advanced.filter((n): n is number => typeof n === "number")
      : [],
  };
}
