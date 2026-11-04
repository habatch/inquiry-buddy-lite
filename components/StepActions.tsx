"use client";

/**
 * 「このステップで起こせる行動」
 *
 * 目的: 書くだけでは答えが出ないことを、実際に調べる・聞く・試すことで前に進めてもらう。
 * - ステップごとに「なぜ今この行動か」を明示する (STEP_ACTION_GUIDE)
 * - ワンクリックで行動ボードに追加 (問い・仮説が入った下書きつき)
 * - 追加済みの行動は状態を表示し、行動ボードへ誘導する
 */
import { useState } from "react";
import {
  ACTION_KITS,
  SCORE_ACTION_DONE,
  STATUS_META,
  STEP_ACTION_GUIDE,
  fillTemplate,
  kindMeta,
  type Action,
  type ActionKit,
} from "@/lib/actions";

const linkBtn =
  "inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800";

function PickCard({
  kit,
  why,
  vars,
  added,
  onAdd,
  onOpenBoard,
}: {
  kit: ActionKit;
  why: string;
  vars: Record<string, string>;
  added: Action | undefined;
  onAdd: () => void;
  onOpenBoard: () => void;
}) {
  const [open, setOpen] = useState(false);
  const k = kindMeta(kit.kind);
  const preview = kit.template ? fillTemplate(kit.template, vars) : "";
  return (
    <div className={`flex flex-col rounded-lg border bg-white p-3 ${added ? "border-brand-300" : "border-stone-200"}`}>
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none" aria-hidden>
          {k.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-800">{kit.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            <span className="font-semibold text-sky-800">なぜ今？ </span>
            {why}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {added ? (
          <>
            <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_META[added.status].color}`}>
              ✓ 追加済み ({STATUS_META[added.status].label})
            </span>
            <button onClick={onOpenBoard} className="text-xs font-medium text-brand-700 hover:underline">
              行動ボードで開く →
            </button>
          </>
        ) : (
          <button onClick={onAdd} className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
            ＋ 行動ボードに追加
          </button>
        )}
        <button onClick={() => setOpen((v) => !v)} className="ml-auto text-xs text-stone-500 hover:text-stone-800" aria-expanded={open}>
          {open ? "▾ 閉じる" : "▸ 手順と下書きを見る"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3 text-xs">
          <ol className="list-decimal space-y-1 pl-5 leading-relaxed text-stone-700">
            {kit.howTo.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
          {kit.caution && <p className="rounded-md bg-rose-50 px-3 py-2 leading-relaxed text-rose-800">⚠️ {kit.caution}</p>}
          {preview && (
            <div>
              <p className="font-semibold text-stone-600">下書き (あなたの問い・仮説が入っています。追加すると行動ボードで編集できます)</p>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-stone-50 p-2.5 font-sans leading-relaxed text-stone-700">
                {preview}
              </pre>
            </div>
          )}
          {kit.links && kit.links.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {kit.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                  🔗 {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StepActions({
  step,
  actions,
  vars,
  onAdd,
  onOpenBoard,
  onOpenInfo,
}: {
  step: number;
  actions: Action[];
  vars: Record<string, string>;
  onAdd: (kit: ActionKit) => void;
  onOpenBoard: () => void;
  onOpenInfo: () => void;
}) {
  const guide = STEP_ACTION_GUIDE[step];
  if (!guide) return null;
  const stepActions = actions.filter((a) => a.step === step);
  const picks = guide.picks
    .map((p) => ({ ...p, kit: ACTION_KITS.find((k) => k.id === p.kit) }))
    .filter((p): p is { kit: ActionKit; why: string } => !!p.kit);
  const otherActions = stepActions.filter((a) => !picks.some((p) => p.kit.id === a.kitId));

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/60 p-4" aria-labelledby="step-actions-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="step-actions-title" className="text-sm font-semibold text-sky-900">
          🚀 このステップで起こせる行動 <span className="font-normal text-sky-800/70">(任意)</span>
        </h3>
        <div className="flex gap-3 text-xs font-medium">
          <button onClick={onOpenInfo} className="text-sky-800 hover:underline">
            🔎 情報ハブで調べる
          </button>
          <button onClick={onOpenBoard} className="text-sky-800 hover:underline">
            行動ボードを開く →
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-sky-900/80">
        書くだけでは答えが出ないことを、実際に調べる・聞く・試すことで確かめるための提案です。
      </p>
      <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm leading-relaxed text-sky-950">
        <span className="font-semibold">このステップでは: </span>
        {guide.purpose}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {picks.map((p) => (
          <PickCard
            key={p.kit.id}
            kit={p.kit}
            why={p.why}
            vars={vars}
            added={stepActions.find((a) => a.kitId === p.kit.id)}
            onAdd={() => onAdd(p.kit)}
            onOpenBoard={onOpenBoard}
          />
        ))}
      </div>

      {otherActions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-sky-900">このステップで追加したほかの行動</p>
          <ul className="mt-1 space-y-1">
            {otherActions.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-xs text-stone-700">
                <span>{kindMeta(a.kind).icon}</span>
                <span className="flex-1 truncate">{a.title}</span>
                <span className={`rounded px-1.5 py-0.5 ${STATUS_META[a.status].color}`}>{STATUS_META[a.status].label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-sky-900/70">
        行動したら、行動ボードで「できた」にして、分かったことを書いてください (+{SCORE_ACTION_DONE} pt〜)。
      </p>
    </section>
  );
}
