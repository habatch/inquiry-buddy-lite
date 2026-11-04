"use client";

import { useState } from "react";
import {
  ACTION_KINDS,
  ACTION_KITS,
  ACTION_SCORE_LIMIT,
  LEARNED_MIN_CHARS,
  SCORE_ACTION_DONE,
  STATUS_META,
  actionScore,
  fillTemplate,
  kindMeta,
  newActionId,
  type Action,
  type ActionKind,
  type ActionKit,
  type ActionStatus,
} from "@/lib/actions";

const card = "rounded-xl border border-stone-200 bg-white p-4 shadow-sm";
const input =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200";
const linkBtn =
  "inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800";

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function makeActionFromKit(kit: ActionKit, vars: Record<string, string>, step?: number): Action {
  return {
    id: newActionId(),
    title: kit.title,
    kind: kit.kind,
    status: "todo",
    memo: kit.template ? fillTemplate(kit.template, vars) : "",
    learned: "",
    step,
    createdAt: Date.now(),
  };
}

// ------------------------------------------------------------------
// 1 つの行動カード
// ------------------------------------------------------------------
function ActionCard({
  a,
  onUpdate,
  onDelete,
}: {
  a: Action;
  onUpdate: (patch: Partial<Action>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(a.status !== "done" && !!a.memo && a.memo.length < 400);
  const [copied, setCopied] = useState(false);
  const k = kindMeta(a.kind);
  const pts = actionScore(a);
  const learnedLen = a.learned.trim().length;

  return (
    <div className={`${card} ${a.status === "done" ? "border-brand-300" : ""}`}>
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none" title={k.label}>
          {k.icon}
        </span>
        <input
          value={a.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm font-semibold text-stone-800 hover:border-stone-200 focus:border-brand-300 focus:outline-none"
          aria-label="行動のタイトル"
        />
        {pts > 0 && (
          <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            +{pts} pt
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-stone-200" role="group" aria-label="状態">
          {(Object.keys(STATUS_META) as ActionStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => onUpdate({ status: s })}
              className={`px-3 py-1 text-xs font-medium ${
                a.status === s ? STATUS_META[s].color : "bg-white text-stone-400 hover:bg-stone-50"
              }`}
              aria-pressed={a.status === s}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
        <select
          value={a.kind}
          onChange={(e) => onUpdate({ kind: e.target.value as ActionKind })}
          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600"
          aria-label="行動の種類"
        >
          {ACTION_KINDS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.icon} {x.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-stone-500">
          予定日
          <input
            type="date"
            value={a.due ?? ""}
            onChange={(e) => onUpdate({ due: e.target.value || undefined })}
            className="rounded-lg border border-stone-200 px-2 py-0.5 text-xs text-stone-700"
          />
        </label>
        {a.step && <span className="text-xs text-stone-400">ステップ {a.step} から</span>}
      </div>

      <div className="mt-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-brand-700 hover:underline"
          aria-expanded={open}
        >
          {open ? "▾" : "▸"} 準備メモ・下書き{a.memo.trim() ? ` (${a.memo.trim().length} 字)` : ""}
        </button>
        {open && (
          <div className="mt-1.5">
            <textarea
              value={a.memo}
              onChange={(e) => onUpdate({ memo: e.target.value })}
              rows={Math.min(14, Math.max(4, a.memo.split("\n").length + 1))}
              placeholder="何を・誰に・どこで・どうやって？ 下書きやメモをここに。"
              className={`${input} font-mono text-[13px] leading-relaxed`}
            />
            {a.memo.trim() && (
              <button
                onClick={async () => {
                  setCopied(await copy(a.memo));
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="mt-1 rounded-md bg-stone-100 px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-200"
              >
                {copied ? "✓ コピーした" : "📋 下書きをコピー"}
              </button>
            )}
          </div>
        )}
      </div>

      {a.status === "done" && (
        <div className="mt-3">
          <label className="text-xs font-semibold text-stone-700" htmlFor={`learned-${a.id}`}>
            ✨ やってみて分かったこと・次にやりたいこと
          </label>
          <textarea
            id={`learned-${a.id}`}
            value={a.learned}
            onChange={(e) => onUpdate({ learned: e.target.value })}
            rows={3}
            placeholder="予想と同じだった？違った？ 新しく生まれた疑問は？"
            className={`${input} mt-1`}
          />
          <p className="mt-1 text-xs text-stone-400">
            {learnedLen < LEARNED_MIN_CHARS
              ? `あと ${LEARNED_MIN_CHARS - learnedLen} 字書くとポイントが入るよ`
              : "振り返りが書けた！"}
          </p>
        </div>
      )}

      <div className="mt-2 text-right">
        <button
          onClick={() => confirm(`「${a.title}」を削除しますか？`) && onDelete()}
          className="text-xs text-stone-400 hover:text-rose-600"
        >
          削除
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 行動キット (1 枚)
// ------------------------------------------------------------------
export function KitCard({
  kit,
  vars,
  onAdd,
  defaultOpen = false,
}: {
  kit: ActionKit;
  vars: Record<string, string>;
  onAdd: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [added, setAdded] = useState(false);
  const k = kindMeta(kit.kind);
  const preview = kit.template ? fillTemplate(kit.template, vars) : "";
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-2 text-left" aria-expanded={open}>
        <span className="text-lg leading-none">{k.icon}</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-stone-800">{kit.title}</span>
          <span className="block text-xs text-stone-500">{kit.summary}</span>
        </span>
        <span className="text-xs text-stone-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-xs">
          <ol className="list-decimal space-y-1 pl-5 leading-relaxed text-stone-700">
            {kit.howTo.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
          {kit.caution && (
            <p className="rounded-md bg-rose-50 px-3 py-2 leading-relaxed text-rose-800">⚠️ {kit.caution}</p>
          )}
          {preview && (
            <div>
              <p className="font-semibold text-stone-600">下書きテンプレート (あなたの問い・仮説が入るよ)</p>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-stone-50 p-2.5 font-sans leading-relaxed text-stone-700">
                {preview}
              </pre>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                onAdd();
                setAdded(true);
                setTimeout(() => setAdded(false), 2000);
              }}
              className="rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700"
            >
              {added ? "✓ 行動ボードに追加した" : "＋ 行動ボードに追加"}
            </button>
            {kit.links?.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                🔗 {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// 行動ボード (画面全体)
// ------------------------------------------------------------------
export function ActionBoard({
  actions,
  setActions,
  vars,
  currentStep,
  onOpenInfo,
}: {
  actions: Action[];
  setActions: (fn: (prev: Action[]) => Action[]) => void;
  vars: Record<string, string>;
  currentStep: number;
  onOpenInfo: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ActionKind>("research");
  const [due, setDue] = useState("");
  const [filter, setFilter] = useState<ActionStatus | "all">("all");
  const [kitKind, setKitKind] = useState<ActionKind | "all">("all");

  const counts = {
    todo: actions.filter((a) => a.status === "todo").length,
    doing: actions.filter((a) => a.status === "doing").length,
    done: actions.filter((a) => a.status === "done").length,
  };
  const order: Record<ActionStatus, number> = { doing: 0, todo: 1, done: 2 };
  const shown = actions
    .filter((a) => filter === "all" || a.status === filter)
    .sort((a, b) => order[a.status] - order[b.status] || (a.due ?? "9").localeCompare(b.due ?? "9") || b.createdAt - a.createdAt);

  const update = (id: string, patch: Partial<Action>) =>
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (id: string) => setActions((prev) => prev.filter((a) => a.id !== id));

  function add() {
    const t = title.trim();
    if (!t) return;
    setActions((prev) => [
      { id: newActionId(), title: t, kind, status: "todo", due: due || undefined, memo: "", learned: "", step: currentStep, createdAt: Date.now() },
      ...prev,
    ]);
    setTitle("");
    setDue("");
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-3xl">🚀</span>
          <h2 className="text-xl font-bold text-stone-800">行動ボード</h2>
        </div>
        <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900">
          探究は「考える」だけじゃなく「動く」ことで進むよ。調べる・聞く・行く・試す・作る・発信する——やってみたいことを自由に書いて、やったら振り返りを残そう。
          「できた」にして振り返りを書くと +{SCORE_ACTION_DONE} pt + 書いた量に応じてボーナス (最大 {ACTION_SCORE_LIMIT} 件まで)。
        </p>
      </div>

      {/* 新しい行動 */}
      <div className={card}>
        <h3 className="text-sm font-semibold text-stone-800">＋ 新しい行動を書く</h3>
        <div className="mt-2 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && add()}
            placeholder="例の形: 「〇〇さんに〜について聞く」「図書館で〜の本を探す」"
            className={input}
            aria-label="新しい行動"
          />
          <div className="flex flex-wrap items-center gap-2">
            {ACTION_KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  kind === k.id ? "border-brand-500 bg-brand-50 text-brand-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
                aria-pressed={kind === k.id}
              >
                {k.icon} {k.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-stone-500">
              予定日
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1 text-xs" />
            </label>
            <button
              onClick={add}
              disabled={!title.trim()}
              className="ml-auto rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              追加
            </button>
          </div>
        </div>
      </div>

      {/* 一覧 */}
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            ["all", `すべて ${actions.length}`],
            ["doing", `やってる ${counts.doing}`],
            ["todo", `やる ${counts.todo}`],
            ["done", `できた ${counts.done}`],
          ] as [ActionStatus | "all", string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${filter === id ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-3">
          {shown.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-6 text-center text-sm text-stone-500">
              {actions.length === 0 ? "まだ行動がないよ。上に書くか、下の「行動キット」から選んでみよう。" : "この状態の行動はないよ。"}
            </p>
          ) : (
            shown.map((a) => <ActionCard key={a.id} a={a} onUpdate={(p) => update(a.id, p)} onDelete={() => remove(a.id)} />)
          )}
        </div>
      </div>

      {/* 行動キット */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-800">🧰 行動キット — 何をしたらいいか迷ったら</h3>
          <button onClick={onOpenInfo} className="text-xs font-medium text-brand-700 hover:underline">
            🔎 情報ハブで調べる →
          </button>
        </div>
        <p className="mt-1 text-xs text-stone-500">
          よくある行動の手順と下書きテンプレート。ステップで書いた問いや仮説が自動で入るので、直して使おう。
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {([{ id: "all", label: "すべて", icon: "✳️" }, ...ACTION_KINDS] as { id: ActionKind | "all"; label: string; icon: string }[]).map((k) => (
            <button
              key={k.id}
              onClick={() => setKitKind(k.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${kitKind === k.id ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
            >
              {k.icon} {k.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          {ACTION_KITS.filter((k) => kitKind === "all" || k.kind === kitKind).map((kit) => (
            <KitCard
              key={kit.id}
              kit={kit}
              vars={vars}
              onAdd={() => setActions((prev) => [makeActionFromKit(kit, vars, currentStep), ...prev])}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
