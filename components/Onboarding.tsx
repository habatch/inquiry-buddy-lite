"use client";

import { useState } from "react";
import {
  AGE_OPTIONS,
  INTEREST_CATEGORIES,
  type UserProfile,
} from "@/lib/topics";

interface Props {
  onSubmit: (profile: UserProfile) => void;
  /** ホームから編集するとき: 今の内容 */
  initial?: UserProfile | null;
  /** ホームから編集するとき: 変更せずに戻る */
  onCancel?: () => void;
}

type Tab = "age" | "interest" | "custom";

export function Onboarding({ onSubmit, initial, onCancel }: Props) {
  const editing = !!initial;
  const [tab, setTab] = useState<Tab>(editing ? "interest" : "age");
  const [age, setAge] = useState<string>(initial?.age ?? "");
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  const [customTopic, setCustomTopic] = useState(initial?.customTopic ?? "");
  const [otherInterest, setOtherInterest] = useState(initial?.otherInterest ?? "");

  function submit() {
    onSubmit({
      age,
      interests,
      otherInterest: otherInterest.trim() || undefined,
      customTopic: customTopic.trim() || undefined,
    });
  }

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function next() {
    if (tab === "age") setTab("interest");
    else if (tab === "interest") setTab("custom");
    else submit();
  }

  function back() {
    if (tab === "interest") setTab("age");
    else if (tab === "custom") setTab("interest");
  }

  const canNext =
    (tab === "age" && age) ||
    (tab === "interest" && (interests.length > 0 || otherInterest.trim().length > 0)) ||
    tab === "custom";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 to-brand-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌱</span>
            <div>
              <h1 className="text-xl font-bold">{editing ? "興味分野・テーマの変更" : "探究伴走ノートへようこそ"}</h1>
              <p className="text-sm text-brand-50/90 mt-0.5">
                {editing
                  ? "変更すると、ステップ 1 の話題カードや情報ハブの候補に反映されます。書いた記録は消えません。"
                  : "はじめに、あなたのことを少し教えてください。"}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50">
          {(
            [
              { id: "age" as Tab, label: "1. 年齢", filled: !!age },
              {
                id: "interest" as Tab,
                label: "2. 興味分野",
                filled: interests.length > 0 || !!otherInterest.trim(),
              },
              { id: "custom" as Tab, label: "3. 自由記述 (任意)", filled: !!customTopic },
            ]
          ).map((t, i) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.id
                  ? "border-brand-600 text-brand-700 bg-white"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <span
                className={`inline-block w-5 h-5 rounded-full text-xs mr-1.5 ${
                  t.filled
                    ? "bg-brand-500 text-white"
                    : "bg-stone-200 text-stone-500"
                }`}
              >
                {t.filled ? "✓" : i + 1}
              </span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-6 min-h-[320px]">
          {tab === "age" && (
            <div>
              <h2 className="text-base font-semibold text-stone-800 mb-1">
                あなたの年齢層を選んでください
              </h2>
              <p className="text-sm text-stone-500 mb-4">
                探究の記録に残すために使います。
              </p>
              <div className="grid grid-cols-2 gap-2">
                {AGE_OPTIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAge(a.id)}
                    className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${
                      age === a.id
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "interest" && (
            <div>
              <h2 className="text-base font-semibold text-stone-800 mb-1">
                興味のある分野を選んでください
              </h2>
              <p className="text-sm text-stone-500 mb-4">
                複数選べます。ステップ 1 の話題カードに使います。
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INTEREST_CATEGORIES.map((c) => {
                  const active = interests.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleInterest(c.id)}
                      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition ${
                        active
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                      }`}
                    >
                      <span className="text-base">{c.icon}</span>
                      <span className="text-left">{c.label}</span>
                    </button>
                  );
                })}
              </div>
              <label
                htmlFor="other-interest"
                className="mt-4 block text-sm font-semibold text-stone-800"
              >
                ほかに興味のある分野 (自由記述・任意)
              </label>
              <p className="mt-0.5 text-xs text-stone-500">
                上の選択肢にない分野や、もっと細かい興味があれば書いてください。
              </p>
              <input
                id="other-interest"
                value={otherInterest}
                onChange={(e) => setOtherInterest(e.target.value)}
                placeholder="例: 鉄道 / 天文 / 福祉 / ゲーム / 方言 など"
                className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          )}

          {tab === "custom" && (
            <div>
              <h2 className="text-base font-semibold text-stone-800 mb-1">
                すでに「これが気になる」というテーマがあれば書いてください
              </h2>
              <p className="text-sm text-stone-500 mb-4">
                空欄でもかまいません。その場合は、興味分野の話題カードから考えましょう。
              </p>
              <textarea
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="例: 部活で疲れがたまる原因 / SNS と勉強の集中力 / 環境問題で気になること など"
                rows={5}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <p className="mt-3 text-xs text-stone-500">
                ※ 入力した内容はこの端末に保存されます。ログインしている場合は、担当の先生にも共有されます。
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {editing ? (
          <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-6 py-3">
            <button onClick={onCancel} className="rounded-md px-4 py-2 text-sm text-stone-600 hover:bg-stone-200">
              変更せずに戻る
            </button>
            <button
              onClick={submit}
              disabled={!age || (interests.length === 0 && !otherInterest.trim())}
              className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              保存する
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-6 py-3">
            <button
              onClick={back}
              disabled={tab === "age"}
              className="rounded-md px-4 py-2 text-sm text-stone-600 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              戻る
            </button>
            <button
              onClick={next}
              disabled={!canNext}
              className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              {tab === "custom" ? "✨ 始める" : "次へ →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
