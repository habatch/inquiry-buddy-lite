"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Onboarding } from "@/components/Onboarding";
import { RankBadge, RankUpToast } from "@/components/RankBadge";
import { StepSidebar } from "@/components/StepSidebar";
import { FieldCard } from "@/components/FieldCard";
import {
  ComposeWidget,
  OutreachWidget,
  RehearsalWidget,
  SearchWidget,
  TopicsWidget,
} from "@/components/Widgets";
import { STEPS, getStep } from "@/lib/steps";
import {
  RANKS,
  getCurrentRank,
  getRankProgress,
  SCORE_NEXT_READY,
  SCORE_STEP_TRANSITION,
  type Rank,
} from "@/lib/ranks";
import {
  EMPTY_STATE,
  STORAGE_KEY,
  answerKey,
  checkKey,
  computeScore,
  parseState,
  stepStatus,
  type AppState,
} from "@/lib/state";
import { downloadDocx, saveBlob } from "@/lib/exportDocx";
import { ActionBoard, KitCard, makeActionFromKit } from "@/components/ActionBoard";
import { InfoHub } from "@/components/InfoHub";
import { ACTION_KITS, kindMeta, STATUS_META, type Action } from "@/lib/actions";
import { themeTerms } from "@/lib/relevance";

type View = "steps" | "actions" | "info";

const rankIndex = (r: Rank) => RANKS.findIndex((x) => x.id === r.id);

export default function Home() {
  const [st, setSt] = useState<AppState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [rankUpToast, setRankUpToast] = useState<Rank | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<View>("steps");
  const prevRankRef = useRef<Rank>(RANKS[0]);
  const fileRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const score = useMemo(() => computeScore(st), [st]);
  const readyMap = useMemo(
    () => Object.fromEntries(STEPS.map((s) => [s.id, stepStatus(s, st).ready])),
    [st],
  );

  // 復元
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? parseState(JSON.parse(raw)) : null;
      if (parsed) {
        setSt(parsed);
        prevRankRef.current = getCurrentRank(computeScore(parsed));
      }
    } catch {
      /* 保存領域が使えない環境でも動くようにする */
    }
    setHydrated(true);
  }, []);

  // 保存
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch {
      /* ignore */
    }
  }, [hydrated, st]);

  // ランクアップ演出 (上がったときだけ)
  useEffect(() => {
    if (!hydrated) return;
    const rank = getCurrentRank(score);
    if (rankIndex(rank) > rankIndex(prevRankRef.current)) setRankUpToast(rank);
    prevRankRef.current = rank;
  }, [hydrated, score]);

  const setAnswer = (step: number, id: string, v: string) =>
    setSt((s) => ({ ...s, answers: { ...s.answers, [answerKey(step, id)]: v } }));
  const toggleCheck = (step: number, i: number) =>
    setSt((s) => {
      const k = checkKey(step, i);
      return { ...s, checks: { ...s.checks, [k]: !s.checks[k] } };
    });
  const setActions = (fn: (prev: Action[]) => Action[]) =>
    setSt((s) => ({ ...s, actions: fn(s.actions) }));
  const goView = (v: View) => {
    setView(v);
    topRef.current?.scrollTo({ top: 0 });
  };
  const goStep = (n: number) => {
    setView("steps");
    setSt((s) => ({ ...s, step: n }));
    topRef.current?.scrollTo({ top: 0 });
  };

  function advance() {
    const cur = st.step;
    const next = cur + 1;
    setSt((s) => ({
      ...s,
      step: next,
      advanced: s.advanced.includes(cur) ? s.advanced : [...s.advanced, cur],
    }));
    topRef.current?.scrollTo({ top: 0 });
  }

  function fullReset() {
    if (!confirm("プロフィール・回答・スコアをすべて消して最初からやり直しますか？\n(消す前に「バックアップ保存」しておくと安心です)"))
      return;
    setSt(EMPTY_STATE);
    prevRankRef.current = RANKS[0];
  }

  function saveBackup() {
    const blob = new Blob([JSON.stringify({ app: "inquiry-buddy-lite", version: 1, ...st }, null, 2)], {
      type: "application/json",
    });
    saveBlob(blob, `探究ノート_バックアップ_${new Date().toISOString().slice(0, 10)}.json`);
  }

  async function loadBackup(file: File) {
    try {
      const parsed = parseState(JSON.parse(await file.text()));
      if (!parsed) throw new Error("形式が違います");
      if (!confirm("バックアップを読み込みます。今この端末にある記録は上書きされます。よろしいですか？")) return;
      prevRankRef.current = getCurrentRank(computeScore(parsed));
      setSt(parsed);
      setNotice("バックアップを読み込みました");
    } catch (e) {
      setNotice("読み込めませんでした: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function exportWord() {
    try {
      await downloadDocx(st, score, getCurrentRank(score).nameJa);
    } catch (e) {
      setNotice("Word 保存でエラー: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  if (!hydrated) {
    return (
      <main className="flex h-screen items-center justify-center bg-stone-50">
        <div className="text-stone-400">読み込み中…</div>
      </main>
    );
  }

  if (!st.profile) {
    return <Onboarding onSubmit={(p) => setSt((s) => ({ ...s, profile: p }))} />;
  }

  const step = getStep(st.step);
  const status = stepStatus(step, st);
  const progress = getRankProgress(score);
  const nextStep = STEPS.find((s) => s.id === step.id + 1);
  const nextLocked = !!nextStep?.unlockScore && score < nextStep.unlockScore;
  const bonusClaimed = st.advanced.includes(step.id);
  const ans = (k: string) => st.answers[k] ?? "";
  const hasAnswers = Object.values(st.answers).some((v) => v.trim()) || st.actions.length > 0;
  // テンプレートに差し込む、生徒自身の言葉
  const vars: Record<string, string> = {
    問い: ans("2.question") || ans("2.draft") || st.profile.customTopic || "",
    仮説: ans("3.hypothesis"),
    キーワード: ans("4.keywords"),
    分かったこと: ans("7.found"),
  };
  // 情報ハブのキーワード候補
  const suggestions = Array.from(
    new Set(
      [ans("4.keywords"), ...themeTerms(st.profile.customTopic, st.profile.otherInterest), ans("2.question")]
        .map((x) => x.trim())
        .filter((x) => x.length >= 2),
    ),
  ).slice(0, 5);
  const stepKits = ACTION_KITS.filter((k) => k.steps.includes(step.id)).slice(0, 3);
  const stepActions = st.actions.filter((a) => a.step === step.id);
  const openActions = st.actions.filter((a) => a.status !== "done").length;
  const tabs: { id: View; label: string }[] = [
    { id: "steps", label: `📘 ステップ ${step.id}` },
    { id: "actions", label: `🚀 行動ボード${openActions ? ` (${openActions})` : ""}` },
    { id: "info", label: "🔎 情報ハブ" },
  ];

  const sidebarExtras = (
    <>
      <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600 leading-relaxed">
        <p className="mb-2 font-semibold text-stone-700">スコアのしくみ</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>くわしく書くほどスコアが入る (1 つの欄で最大 28 pt)</li>
          <li>記入とチェックがそろうと +{SCORE_NEXT_READY} pt</li>
          <li>次のステップへ進むと +{SCORE_STEP_TRANSITION} pt</li>
          <li>行動ボードで「できた」+ 振り返りで +10 pt〜</li>
          <li>700 pt で朱雀ステップ、800 pt で麒麟ステップが解放</li>
        </ul>
      </div>
      <button
        onClick={exportWord}
        disabled={!hasAnswers}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm disabled:bg-stone-200 disabled:text-stone-500 disabled:cursor-not-allowed transition"
      >
        📝 探究記録を Word で保存
      </button>
      <div className="rounded-lg border border-stone-200 p-3 text-xs text-stone-600 leading-relaxed">
        <p className="font-semibold text-stone-700">💾 記録の保存場所</p>
        <p className="mt-1">
          記録はこの端末のブラウザの中だけに保存され、どこにも送信されません。別の端末で続けるときや、ブラウザのデータを消す前は、バックアップを保存しておこう。
        </p>
        <div className="mt-2 flex gap-2">
          <button onClick={saveBackup} className="flex-1 rounded-md bg-stone-100 px-2 py-1.5 hover:bg-stone-200">
            バックアップ保存
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-md bg-stone-100 px-2 py-1.5 hover:bg-stone-200">
            読み込み
          </button>
        </div>
      </div>
    </>
  );

  return (
    <main className="flex h-[100dvh] flex-col bg-stone-50">
      {rankUpToast && <RankUpToast rank={rankUpToast} onDismiss={() => setRankUpToast(null)} />}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadBackup(f);
          e.target.value = "";
        }}
      />

      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-stone-200 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-2xl">🌱</span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-stone-800">探究伴走ノート</h1>
            <p className="truncate text-xs text-stone-500">答えは書いていない。自分で考えるための探究ワークブック</p>
          </div>
        </div>
        <button
          onClick={fullReset}
          className="shrink-0 rounded-md bg-stone-50 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-200"
        >
          最初から
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 bg-white px-3 sm:px-5" aria-label="画面切り替え">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => goView(t.id)}
            aria-current={view === t.id ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
              view === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (PC) */}
        <aside className="hidden w-72 shrink-0 space-y-4 overflow-y-auto border-r border-stone-200 bg-white p-4 md:block">
          <RankBadge progress={progress} score={score} />
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">探究のステップ</h2>
            <StepSidebar currentStep={st.step} onSelect={goStep} score={score} readyMap={readyMap} />
          </div>
          {sidebarExtras}
        </aside>

        {/* Main */}
        <section ref={topRef} className="chat-scroll flex-1 overflow-y-auto">
          {/* Mobile: rank + step select */}
          <div className="space-y-3 border-b border-stone-200 bg-white p-4 md:hidden">
            <RankBadge progress={progress} score={score} />
            <select
              value={st.step}
              onChange={(e) => goStep(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              aria-label="ステップを選ぶ"
            >
              {STEPS.map((s) => {
                const locked = !!s.unlockScore && score < s.unlockScore;
                return (
                  <option key={s.id} value={s.id} disabled={locked}>
                    {locked ? "🔒" : s.icon} {s.id}. {s.name}
                    {readyMap[s.id] ? " ✓" : ""}
                    {locked ? ` (あと ${s.unlockScore! - score} pt)` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6">
            {notice && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span className="flex-1">{notice}</span>
                <button onClick={() => setNotice(null)} aria-label="閉じる" className="text-amber-500">
                  ×
                </button>
              </div>
            )}

            {view === "actions" && (
              <ActionBoard
                actions={st.actions}
                setActions={setActions}
                vars={vars}
                currentStep={step.id}
                onOpenInfo={() => goView("info")}
              />
            )}
            {view === "info" && (
              <InfoHub
                suggestions={suggestions}
                interests={st.profile.interests}
                currentStep={step.id}
                onAddAction={(a) => setActions((prev) => [a, ...prev])}
              />
            )}
            {view === "steps" && (<>
            {/* Step header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl">{step.icon}</span>
                <h2 className="text-xl font-bold text-stone-800">
                  ステップ {step.id}: {step.name}
                </h2>
              </div>
              <p className="mt-1 text-sm text-stone-500">ゴール: {step.goal.replace(/^\(.*?\)\s*/, "")}</p>
              <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900">{step.intro}</p>
            </div>

            {/* Recall */}
            {step.recall && step.recall.some((r) => ans(r.key).trim()) && (
              <div className="rounded-xl border border-stone-200 bg-stone-100/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">ここまでの探究</p>
                <dl className="mt-2 space-y-2">
                  {step.recall
                    .filter((r) => ans(r.key).trim())
                    .map((r) => (
                      <div key={r.key}>
                        <dt className="text-xs text-stone-500">{r.label}</dt>
                        <dd className="whitespace-pre-wrap text-sm text-stone-800">{ans(r.key)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            )}

            {/* Widgets */}
            {step.widget === "topics" && (
              <TopicsWidget
                interests={st.profile.interests}
                otherInterest={st.profile.otherInterest}
                customTopic={st.profile.customTopic}
              />
            )}
            {step.widget === "search" && <SearchWidget keywords={ans(answerKey(4, "keywords"))} />}
            {step.widget === "outreach" && <OutreachWidget />}
            {step.widget === "rehearsal" && <RehearsalWidget text={ans(answerKey(8, "final"))} />}

            {/* Fields */}
            {step.fields.map((f) => (
              <div key={f.id} className="space-y-4">
                {step.widget === "compose" && f.id === "final" && (
                  <ComposeWidget
                    parts={["a", "b", "c", "d"].map((id) => ans(answerKey(8, id)))}
                    finalText={ans(answerKey(8, "final"))}
                    onCompose={(t) => setAnswer(8, "final", t)}
                  />
                )}
                <FieldCard
                  field={f}
                  value={ans(answerKey(step.id, f.id))}
                  onChange={(v) => setAnswer(step.id, f.id, v)}
                />
              </div>
            ))}

            {/* このステップで起こせる行動 */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-sky-900">🚀 このステップで起こせる行動</h3>
                <div className="flex gap-3 text-xs font-medium">
                  <button onClick={() => goView("info")} className="text-sky-800 hover:underline">🔎 情報ハブで調べる</button>
                  <button onClick={() => goView("actions")} className="text-sky-800 hover:underline">行動ボードへ →</button>
                </div>
              </div>
              <p className="mt-1 text-xs text-sky-900/80">書くだけで止まらず、実際に動いてみよう。下書き付きのキットを行動ボードに追加できるよ。</p>
              {stepActions.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {stepActions.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-xs text-stone-700">
                      <span>{kindMeta(a.kind).icon}</span>
                      <span className="flex-1 truncate">{a.title}</span>
                      <span className={`rounded px-1.5 py-0.5 ${STATUS_META[a.status].color}`}>{STATUS_META[a.status].label}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 grid gap-2">
                {stepKits.map((kit) => (
                  <KitCard
                    key={kit.id}
                    kit={kit}
                    vars={vars}
                    onAdd={() => setActions((prev) => [makeActionFromKit(kit, vars, step.id), ...prev])}
                  />
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className={`rounded-xl border-2 bg-white p-4 shadow-sm ${status.ready ? "border-brand-400" : "border-dashed border-stone-300"}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-800">☑️ 自分でチェック</h3>
                <span className="text-xs text-stone-500">
                  記入 {status.filled}/{status.required} ・ チェック {status.checked}/{status.checkTotal}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                書いた内容を読み返して、当てはまったらチェックしよう。全部そろうと +{SCORE_NEXT_READY} pt。
              </p>
              <ul className="mt-3 space-y-2">
                {step.checklist.map((c, i) => (
                  <li key={c}>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={!!st.checks[checkKey(step.id, i)]}
                        onChange={() => toggleCheck(step.id, i)}
                        className="mt-0.5 h-4 w-4 accent-emerald-600"
                      />
                      <span>{c}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {/* Next */}
            {status.ready && nextStep && !nextLocked && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-300 via-emerald-400 to-emerald-600 px-5 py-4 shadow-lg animate-banner-glow">
                <div className="relative flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="text-white">
                    <p className="text-xs font-semibold tracking-widest opacity-90">✨ 記入もチェックもそろったよ</p>
                    <p className="mt-0.5 text-lg font-bold leading-tight">「{step.name}」達成！次は「{nextStep.name}」</p>
                  </div>
                  <button
                    onClick={advance}
                    className="shrink-0 whitespace-nowrap rounded-xl bg-white px-6 py-3 text-base font-bold text-emerald-700 shadow-2xl ring-4 ring-white/50 transition hover:scale-105 hover:bg-yellow-50"
                  >
                    次へ進む{" "}
                    {!bonusClaimed && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-sm font-extrabold text-amber-600">
                        +{SCORE_STEP_TRANSITION} pt
                      </span>
                    )}{" "}
                    →
                  </button>
                </div>
              </div>
            )}
            {status.ready && nextStep && nextLocked && (
              <div className="rounded-xl bg-gradient-to-r from-orange-400 to-pink-500 px-5 py-4 text-white shadow-lg">
                <p className="text-lg font-bold">🎉 「{step.name}」達成！</p>
                <p className="mt-1 text-sm opacity-95">
                  探究の基本ステップはここまで。Word で保存して発表に使おう。あと {nextStep.unlockScore! - score} pt
                  で「{nextStep.name}」が解放されるよ。前のステップの答えをくわしく書き足すとスコアが増えるよ。
                </p>
              </div>
            )}
            {status.ready && !nextStep && (
              <div className="rounded-xl bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-500 px-5 py-4 text-center text-white shadow-lg">
                <p className="text-2xl font-bold">🎉 探究の最終ステップ、完走！</p>
                <p className="mt-1 text-sm opacity-90">記録を Word で保存して、「最初の一歩」を踏み出そう。お疲れさま！</p>
              </div>
            )}

            </>)}

            {/* Mobile extras */}
            <div className="space-y-3 pt-2 md:hidden">{sidebarExtras}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
