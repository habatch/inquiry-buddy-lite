"use client";

import { useState } from "react";
import { INTEREST_SOURCES, SOURCE_CHECKS, SOURCE_GROUPS, newActionId, type Action } from "@/lib/actions";
import { INTEREST_CATEGORIES } from "@/lib/topics";

const card = "rounded-xl border border-stone-200 bg-white p-4 shadow-sm";
const linkBtn =
  "flex flex-col rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-left hover:border-brand-300 hover:bg-brand-50";

export function InfoHub({
  suggestions,
  interests,
  currentStep,
  onAddAction,
}: {
  /** キーワード候補 (ステップの回答・テーマから) */
  suggestions: string[];
  interests: string[];
  currentStep: number;
  onAddAction: (a: Action) => void;
}) {
  const [q, setQ] = useState(suggestions[0] ?? "");
  const [added, setAdded] = useState(false);
  const kw = q.trim();
  const interestGroups = interests
    .map((id) => ({ cat: INTEREST_CATEGORIES.find((c) => c.id === id), sources: INTEREST_SOURCES[id] }))
    .filter((x) => x.cat && x.sources);

  function record() {
    onAddAction({
      id: newActionId(),
      title: `「${kw}」について調べる`,
      kind: "research",
      status: "doing",
      memo: `キーワード: ${kw}\n\n読んだもの (タイトル / 書いた人 / 年 / URL):\n1. \n2. \n3. \n\n分かったこと:\n`,
      learned: "",
      step: currentStep,
      createdAt: Date.now(),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-3xl">🔎</span>
          <h2 className="text-xl font-bold text-stone-800">情報ハブ</h2>
        </div>
        <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900">
          キーワードを入れると、国・大学・図書館・新聞社などの信頼できる情報源をまとめて開けるよ。読んだものは行動ボードに記録しておこう。
        </p>
      </div>

      <div className={`${card} sticky top-0 z-10`}>
        <label htmlFor="hub-q" className="text-sm font-semibold text-stone-800">
          調べたいキーワード
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="hub-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="例の形: 〇〇 △△ (2〜3 語がおすすめ)"
            className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <button
            onClick={record}
            disabled={!kw}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {added ? "✓ 追加した" : "＋ 行動にする"}
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-stone-500">あなたの探究から:</span>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setQ(s)}
                className={`max-w-[16rem] truncate rounded-full px-2.5 py-0.5 text-xs ${q === s ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
                title={s}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {!kw ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-6 text-center text-sm text-stone-500">
          キーワードを入れると、各情報源へのリンクが出てくるよ。
        </p>
      ) : (
        <>
          {interestGroups.length > 0 && (
            <div className={card}>
              <h3 className="text-sm font-semibold text-stone-800">⭐ あなたの興味分野の公的な情報源</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {interestGroups.flatMap(({ cat, sources }) =>
                  sources!.map((s) => (
                    <a key={s.name} href={s.url(kw)} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                      <span className="text-sm font-medium text-stone-800">
                        {cat!.icon} {s.name}
                      </span>
                      <span className="text-xs text-stone-500">{s.desc}</span>
                    </a>
                  )),
                )}
              </div>
            </div>
          )}
          {SOURCE_GROUPS.map((g) => (
            <div key={g.id} className={card}>
              <h3 className="text-sm font-semibold text-stone-800">
                {g.icon} {g.title}
              </h3>
              <p className="mt-1 text-xs text-stone-500">{g.hint}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {g.sources.map((s) => (
                  <a key={s.name} href={s.url(kw)} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                    <span className="text-sm font-medium text-stone-800">🔗 {s.name}</span>
                    <span className="text-xs text-stone-500">{s.desc}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
        <h3 className="text-sm font-semibold text-amber-900">🧐 その情報、信じて大丈夫？</h3>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-amber-900">
          {SOURCE_CHECKS.map((c) => (
            <li key={c} className="ml-4 list-disc">
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
