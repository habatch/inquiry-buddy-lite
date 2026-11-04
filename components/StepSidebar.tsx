import { STEPS } from "@/lib/steps";

interface Props {
  currentStep: number;
  onSelect: (step: number) => void;
  score: number;
  /** ステップ id → 記入とチェックがすべてそろっているか */
  readyMap: Record<number, boolean>;
}

export function StepSidebar({ currentStep, onSelect, score, readyMap }: Props) {
  return (
    <nav className="flex flex-col gap-1.5">
      {STEPS.map((s) => {
        const active = s.id === currentStep;
        const locked = typeof s.unlockScore === "number" && score < s.unlockScore;
        const ptsToUnlock = typeof s.unlockScore === "number" ? s.unlockScore - score : 0;
        const done = readyMap[s.id];

        return (
          <button
            key={s.id}
            onClick={() => !locked && onSelect(s.id)}
            disabled={locked}
            aria-current={active ? "step" : undefined}
            className={
              locked
                ? "flex items-start gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-left text-sm opacity-60 cursor-not-allowed"
                : active
                  ? "flex items-start gap-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-left text-sm shadow-sm"
                  : "flex items-start gap-2 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-sm hover:bg-stone-100"
            }
          >
            <span className="text-base leading-tight">{locked ? "🔒" : s.icon}</span>
            <span className="flex-1">
              <span
                className={
                  active
                    ? "font-semibold text-brand-700"
                    : locked
                      ? "font-medium text-stone-500"
                      : "font-medium text-stone-700"
                }
              >
                {s.id}. {s.name}
                {done && <span className="ml-1.5 text-xs text-brand-600">✓</span>}
              </span>
              <span className="block text-xs text-stone-500 mt-0.5">
                {locked ? `あと ${ptsToUnlock} pt で解放` : s.goal}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
