"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  answerKey,
  checkKey,
  computeScore,
  parseState,
  stepStatus,
  type AppState,
} from "@/lib/state";
import { saveBlob } from "@/lib/file";
import {
  formatAgo,
  getAuthHint,
  getBackupAt,
  getSyncMeta,
  readRaw,
  removeRaw,
  requestPersist,
  setAuthHint,
  setBackupAt,
  setSyncMeta,
  stateKey,
  storageWritable,
  writeRaw,
  type AuthHint,
  type StudentInfo,
} from "@/lib/storage";
import { LoginScreen } from "@/components/LoginScreen";
import { conflictKey, useCloudSync, type CloudStatus } from "@/lib/useCloudSync";
import { api } from "@/lib/api";
import { ActionBoard, makeActionFromKit } from "@/components/ActionBoard";
import { StepActions } from "@/components/StepActions";
import { InfoHub } from "@/components/InfoHub";
import { type Action } from "@/lib/actions";
import { themeTerms } from "@/lib/relevance";
import { INTEREST_CATEGORIES } from "@/lib/topics";

type View = "steps" | "actions" | "info";

const rankIndex = (r: Rank) => RANKS.findIndex((x) => x.id === r.id);

// ------------------------------------------------------------------
// 入口: ログイン状態で「誰のノートを開くか」を決める
// ------------------------------------------------------------------
export default function Page() {
  const [auth, setAuth] = useState<AuthHint | null | undefined>(undefined);
  useEffect(() => setAuth(getAuthHint()), []);

  if (auth === undefined) {
    return (
      <main className="flex h-screen items-center justify-center bg-stone-50">
        <div className="text-stone-400">読み込み中…</div>
      </main>
    );
  }

  if (auth === null) {
    return (
      <LoginScreen
        onGuest={() => {
          const h: AuthHint = { mode: "guest" };
          setAuthHint(h);
          setAuth(h);
        }}
        onStudent={(student) => {
          carryOverGuestData(student);
          const h: AuthHint = { mode: "student", student };
          setAuthHint(h);
          setAuth(h);
        }}
      />
    );
  }

  const student = auth.mode === "student" ? auth.student : null;
  return (
    <Notebook
      key={student?.id ?? "guest"}
      student={student}
      onSignedOut={() => {
        setAuthHint(null);
        setAuth(null);
      }}
    />
  );
}

/** ログインせずに書いていた記録を、初めてログインした生徒の記録として引き継ぐか確認する */
function carryOverGuestData(student: StudentInfo) {
  const key = stateKey(student.id);
  const guestRaw = readRaw();
  if (!guestRaw || readRaw(key)) return;
  try {
    const g = parseState(JSON.parse(guestRaw));
    const has = g && (g.profile || Object.values(g.answers).some((v) => v.trim()) || g.actions.length > 0);
    if (!has) return;
  } catch {
    return;
  }
  if (!confirm("ログインせずにこの端末で書いた記録があります。この記録をあなたのアカウントに引き継ぎますか？\n(すでにサーバに記録がある場合は、サーバの記録が優先されます)")) return;
  writeRaw(guestRaw, key);
  setSyncMeta(key, { ...getSyncMeta(key), dirty: true });
}

// ------------------------------------------------------------------
// ノート本体 (生徒 1 人ぶん、またはゲスト)
// ------------------------------------------------------------------
function Notebook({ student, onSignedOut }: { student: StudentInfo | null; onSignedOut: () => void }) {
  const storeKey = stateKey(student?.id);
  const [st, setSt] = useState<AppState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [rankUpToast, setRankUpToast] = useState<Rank | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<View>("steps");
  /** saved: 保存済み / pending: 保存待ち / error: 保存できない */
  const [saveState, setSaveState] = useState<"saved" | "pending" | "error">("saved");
  const [backupAt, setBackupAtState] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  /** 食い違いで保管した、この端末の内容 (無ければ null) */
  const [conflictRaw, setConflictRaw] = useState<string | null>(null);
  const lastWrittenRef = useRef<string | null>(null);
  const stRef = useRef(st);
  stRef.current = st;
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
    const raw = readRaw(storeKey);
    try {
      const parsed = raw ? parseState(JSON.parse(raw)) : null;
      if (parsed) {
        setSt(parsed);
        lastWrittenRef.current = JSON.stringify(parsed);
        prevRankRef.current = getCurrentRank(computeScore(parsed));
      }
    } catch {
      /* 壊れたデータでも起動はする */
    }
    if (!storageWritable()) setSaveState("error");
    setBackupAtState(getBackupAt());
    setConflictRaw(readRaw(conflictKey(storeKey)));
    void requestPersist();
    setHydrated(true);
  }, []);

  // 保存: 入力のたびではなく 0.4 秒まとめて書く (低スペック端末で入力が重くならないように)
  const flush = () => {
    const json = JSON.stringify(stRef.current);
    if (json === lastWrittenRef.current) {
      setSaveState((s) => (s === "pending" ? "saved" : s));
      return;
    }
    if (writeRaw(json, storeKey)) {
      lastWrittenRef.current = json;
      setSaveState("saved");
    } else {
      setSaveState("error");
    }
  };
  useEffect(() => {
    if (!hydrated) return;
    if (JSON.stringify(st) === lastWrittenRef.current) return;
    setSaveState((s) => (s === "error" ? s : "pending"));
    const t = setTimeout(flush, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, st]);

  // タブを閉じる・切り替える・PC がスリープする直前に必ず保存
  useEffect(() => {
    if (!hydrated) return;
    const onHide = () => flush();
    const onVis = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // 同じ端末で 2 つのタブを開いたとき、古いタブが新しい記録を上書きしないよう同期する
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== storeKey || !e.newValue || e.newValue === lastWrittenRef.current) return;
      try {
        const parsed = parseState(JSON.parse(e.newValue));
        if (!parsed) return;
        lastWrittenRef.current = e.newValue;
        prevRankRef.current = getCurrentRank(computeScore(parsed));
        setSt(parsed);
        setNotice("別のタブで書いた内容を反映しました。同じ記録を 2 つのタブで開くのは避けてください。");
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ランクアップ演出 (上がったときだけ)
  useEffect(() => {
    if (!hydrated) return;
    const rank = getCurrentRank(score);
    if (rankIndex(rank) > rankIndex(prevRankRef.current)) setRankUpToast(rank);
    prevRankRef.current = rank;
  }, [hydrated, score]);

  // サーバ同期 (ログインした生徒のみ)
  const adopt = useCallback((s: AppState) => {
    prevRankRef.current = getCurrentRank(computeScore(s));
    setSt(s);
  }, []);
  const cloud = useCloudSync({
    enabled: !!student,
    storeKey,
    hydrated,
    st,
    adopt,
    notify: setNotice,
    onBackup: () => setConflictRaw(readRaw(conflictKey(storeKey))),
  });
  const [relogin, setRelogin] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  async function signOut() {
    if (student) {
      flush();
      await cloud.syncNow();
      if (
        cloud.isDirty() &&
        !confirm("まだサーバに送れていない記録があります。今ログアウトすると、その分はこの端末に残ります。\nログアウトしますか？")
      )
        return;
      if (
        conflictRaw &&
        !cloud.isDirty() &&
        !confirm(
          "別の端末との食い違いで保管した記録が、この端末に残っています。ログアウトすると消えます (共用の端末で次の人に見えないようにするため)。\n残したい場合は「キャンセル」を押し、画面の「保管した内容を書き出す」でファイルに保存してください。\nログアウトしますか？",
        )
      )
        return;
      try {
        await api("/student/logout", { method: "POST", json: {} });
      } catch {
        /* オフラインでも端末側はログアウトする */
      }
      // 共用 PC で次の人に見えないよう、送信済みの記録は端末から消す
      if (!cloud.isDirty()) {
        removeRaw(storeKey);
        removeRaw(storeKey + ":sync");
        removeRaw(conflictKey(storeKey));
      }
    }
    onSignedOut();
  }

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
    lastWrittenRef.current = null;
    removeRaw(storeKey);
    prevRankRef.current = RANKS[0];
  }

  function saveBackup() {
    const blob = new Blob([JSON.stringify({ app: "inquiry-buddy-lite", version: 1, ...st }, null, 2)], {
      type: "application/json",
    });
    saveBlob(blob, `探究ノート_バックアップ_${new Date().toISOString().slice(0, 10)}.json`);
    const now = Date.now();
    setBackupAt(now);
    setBackupAtState(now);
  }

  /** 食い違いで保管した内容を、バックアップと同じ形のファイルに書き出す (「バックアップから復元」で読み込める) */
  function exportConflict() {
    if (!conflictRaw) return;
    try {
      const parsed = parseState(JSON.parse(conflictRaw));
      if (!parsed) throw new Error();
      const blob = new Blob([JSON.stringify({ app: "inquiry-buddy-lite", version: 1, ...parsed }, null, 2)], { type: "application/json" });
      saveBlob(blob, `探究ノート_保管した内容_${new Date().toISOString().slice(0, 10)}.json`);
    } catch {
      setNotice("保管した内容を読み取れませんでした");
    }
  }

  /** 保管した内容と、今表示している内容を入れ替える (今の内容は代わりに保管するので、もう一度押せば元に戻る) */
  function swapConflict() {
    if (!conflictRaw) return;
    const parsed = (() => {
      try {
        return parseState(JSON.parse(conflictRaw));
      } catch {
        return null;
      }
    })();
    if (!parsed) {
      setNotice("保管した内容を読み取れませんでした");
      return;
    }
    if (!confirm("保管した内容を表示し、先生にもこちらを届けます。\n今表示している内容は代わりに保管するので、もう一度このボタンを押せば元に戻せます。よろしいですか？")) return;
    const current = JSON.stringify(stRef.current);
    writeRaw(current, conflictKey(storeKey));
    setConflictRaw(current);
    prevRankRef.current = getCurrentRank(computeScore(parsed));
    setSt(parsed);
    setNotice("保管していた内容に入れ替えました");
  }

  function dropConflict() {
    if (!confirm("保管した内容を消します。元に戻せません。よろしいですか？")) return;
    removeRaw(conflictKey(storeKey));
    setConflictRaw(null);
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
    setExporting(true);
    try {
      // Word 出力ライブラリは大きいので、ボタンを押したときだけ読み込む
      const { downloadDocx } = await import("@/lib/exportDocx");
      await downloadDocx(st, score, getCurrentRank(score).nameJa);
    } catch (e) {
      setNotice(
        "Word 保存でエラー: " +
          (e instanceof Error ? e.message : String(e)) +
          "\n回線が混んでいるときは、少し待ってからもう一度押してください。",
      );
    } finally {
      setExporting(false);
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

  if (editingProfile) {
    return (
      <Onboarding
        initial={st.profile}
        onCancel={() => setEditingProfile(false)}
        onSubmit={(p) => {
          setSt((s) => ({ ...s, profile: p }));
          setEditingProfile(false);
          setNotice("興味分野・テーマを変更しました。");
        }}
      />
    );
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
  const openActions = st.actions.filter((a) => a.status !== "done").length;
  const tabs: { id: View; label: string }[] = [
    { id: "steps", label: `📘 ステップ ${step.id}` },
    { id: "actions", label: `🚀 行動ボード${openActions ? ` (${openActions})` : ""}` },
    { id: "info", label: "🔎 情報ハブ" },
  ];

  const interestLabels = [
    ...st.profile.interests.map((id) => INTEREST_CATEGORIES.find((c) => c.id === id)?.label).filter(Boolean),
    ...(st.profile.otherInterest ? [st.profile.otherInterest] : []),
  ].join("・");
  const sidebarExtras = (
    <>
      <div className="rounded-lg border border-stone-200 p-3 text-xs leading-relaxed text-stone-600">
        <p className="font-semibold text-stone-700">🧭 興味分野・テーマ</p>
        <p className="mt-1">{interestLabels || "未設定"}</p>
        {st.profile.customTopic && <p className="mt-1 text-stone-500">テーマ: {st.profile.customTopic}</p>}
        <button
          onClick={() => setEditingProfile(true)}
          className="mt-2 w-full rounded-md bg-stone-100 px-2 py-1.5 text-stone-700 hover:bg-stone-200"
        >
          ✏️ 変更する
        </button>
      </div>
      <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600 leading-relaxed">
        <p className="mb-2 font-semibold text-stone-700">スコアのしくみ</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>くわしく書くほどスコアが入ります (1 つの欄で最大 28 pt)</li>
          <li>記入とチェックがそろうと +{SCORE_NEXT_READY} pt です</li>
          <li>次のステップへ進むと +{SCORE_STEP_TRANSITION} pt です</li>
          <li>行動ボードで「できた」にして振り返りを書くと +10 pt〜 です</li>
          <li>700 pt で朱雀ステップ、800 pt で麒麟ステップが解放されます</li>
        </ul>
      </div>
      <button
        onClick={exportWord}
        disabled={!hasAnswers || exporting}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm disabled:bg-stone-200 disabled:text-stone-500 disabled:cursor-not-allowed transition"
      >
        {exporting ? "準備中…" : "📝 探究記録を Word で保存"}
      </button>
      <div className="rounded-lg border border-stone-200 p-3 text-xs text-stone-600 leading-relaxed">
        <p className="font-semibold text-stone-700">💾 記録の保存場所</p>
        <p className="mt-1">
          {student
            ? "記録はこの端末に保存され、担当の先生にも共有されます。別の端末でも、同じログインコードで続きから使えます。"
            : "記録はこの端末のブラウザの中だけに保存され、どこにも送信されません。別の端末で続けるときや、ブラウザのデータを消す前は、バックアップを保存してください。"}
        </p>
        <p className="mt-1.5 text-stone-500">最後のバックアップ: {formatAgo(backupAt)}</p>
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
      {relogin && student && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40">
          <LoginScreen
            relogin={student}
            onGuest={() => setRelogin(false)}
            onCancel={() => setRelogin(false)}
            onStudent={() => {
              setRelogin(false);
              void cloud.reconcile();
            }}
          />
        </div>
      )}
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
            <p className="truncate text-xs text-stone-500">答えは書かれていません。自分で考えるための探究ワークブックです</p>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-xs ${
              saveState === "error"
                ? "bg-rose-100 font-semibold text-rose-700"
                : saveState === "pending"
                  ? "text-stone-400"
                  : "text-brand-700"
            }`}
            role="status"
          >
            {saveState === "error" ? "⚠ 保存できていません" : saveState === "pending" ? "保存中…" : "✓ 端末に保存済み"}
          </span>
          {student && <CloudBadge status={cloud.status} syncedAt={cloud.syncedAt} onSync={() => void cloud.syncNow()} />}
        </div>
        {student ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-right text-xs leading-tight text-stone-600 md:block">
              {student.className}
              <br />
              <span className="font-semibold">
                {student.number}番 {student.name}
              </span>
            </span>
            <button
              onClick={() => void signOut()}
              className="rounded-md bg-stone-100 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-200"
            >
              ログアウト
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => void signOut()}
              className="rounded-md bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100"
              title="先生からもらったコードでログイン"
            >
              ログイン
            </button>
            <button
              onClick={fullReset}
              className="rounded-md bg-stone-50 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-200"
            >
              最初から
            </button>
          </div>
        )}
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
            {student && cloud.status === "auth" && (
              <div className="rounded-md border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-bold">🔑 ログインの期限が切れました</p>
                <p className="mt-1 text-xs leading-relaxed">
                  書いた内容はこの端末に保存されています。先生に記録を届けるには、もう一度ログインコードを入力してください。
                </p>
                <button onClick={() => setRelogin(true)} className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                  もう一度ログイン
                </button>
              </div>
            )}
            {student && cloud.status === "closed" && (
              <div className="rounded-md border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-bold">⏸ このクラスは今、先生に記録を届けられません</p>
                <p className="mt-1 text-xs leading-relaxed">
                  学校での利用が止まっているか、クラスが終了しています。書いた内容はこの端末に保存されています。先生に確認してください。
                  心配なときは「バックアップ保存」でファイルにも残せます。
                </p>
                <button onClick={saveBackup} className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                  バックアップ保存
                </button>
              </div>
            )}
            {student && conflictRaw && (
              <div className="rounded-md border-2 border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <p className="font-bold">🧩 別の端末の記録と食い違ったので、この端末で書いた内容を保管しています</p>
                <p className="mt-1 text-xs leading-relaxed">
                  今表示しているのは、新しかった方 (別の端末で書いた方) の記録です。保管した内容は、ファイルに書き出して見比べたり、こちらに入れ替えたりできます。
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={exportConflict} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
                    保管した内容を書き出す
                  </button>
                  <button onClick={swapConflict} className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-300 hover:bg-sky-100">
                    保管した内容に入れ替える
                  </button>
                  <button onClick={dropConflict} className="rounded-md px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-100">
                    保管した内容を消す
                  </button>
                </div>
              </div>
            )}
            {saveState === "error" && (
              <div className="rounded-md border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                <p className="font-bold">⚠ このブラウザでは記録が自動保存されていません</p>
                <p className="mt-1 text-xs leading-relaxed">
                  プライベート (シークレット) モードや、ブラウザの設定・容量不足が原因かもしれません。このまま閉じると書いた内容が消えます。
                  通常のウィンドウで開き直すか、こまめに「バックアップ保存」してください。
                </p>
                <button onClick={saveBackup} className="mt-2 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
                  今すぐバックアップ保存
                </button>
              </div>
            )}
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
                onEditProfile={() => setEditingProfile(true)}
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
            <StepActions
              step={step.id}
              actions={st.actions}
              vars={vars}
              onAdd={(kit) => setActions((prev) => [makeActionFromKit(kit, vars, step.id), ...prev])}
              onOpenBoard={() => goView("actions")}
              onOpenInfo={() => goView("info")}
            />

            {/* Checklist */}
            <div className={`rounded-xl border-2 bg-white p-4 shadow-sm ${status.ready ? "border-brand-400" : "border-dashed border-stone-300"}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-800">☑️ 自分でチェック</h3>
                <span className="text-xs text-stone-500">
                  記入 {status.filled}/{status.required} ・ チェック {status.checked}/{status.checkTotal}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                書いた内容を読み返して、当てはまるものにチェックを入れてください。全部そろうと +{SCORE_NEXT_READY} pt です。
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
                    <p className="text-xs font-semibold tracking-widest opacity-90">✨ 記入もチェックもそろいました</p>
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
                  探究の基本ステップはここまでです。Word で保存して発表に使ってください。あと {nextStep.unlockScore! - score} pt
                  で「{nextStep.name}」が解放されます。前のステップの答えをくわしく書き足すと、スコアが増えます。
                </p>
              </div>
            )}
            {status.ready && !nextStep && (
              <div className="rounded-xl bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-500 px-5 py-4 text-center text-white shadow-lg">
                <p className="text-2xl font-bold">🎉 探究の最終ステップ、完走！</p>
                <p className="mt-1 text-sm opacity-90">記録を Word で保存して、「最初の一歩」を踏み出してください。お疲れさまでした。</p>
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

function CloudBadge({ status, syncedAt, onSync }: { status: CloudStatus; syncedAt: number | null; onSync: () => void }) {
  const time = syncedAt ? new Date(syncedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : null;
  const map: Record<CloudStatus, { text: string; cls: string }> = {
    off: { text: "", cls: "" },
    connecting: { text: "☁ 接続中…", cls: "text-stone-400" },
    syncing: { text: "☁ 送信中…", cls: "text-stone-400" },
    synced: { text: `☁ 先生に共有済み${time ? ` ${time}` : ""}`, cls: "text-sky-700" },
    pending: { text: "☁ まもなく共有", cls: "text-stone-500" },
    offline: { text: "☁ 未共有 (通信待ち)", cls: "text-amber-700" },
    auth: { text: "☁ 要ログイン", cls: "bg-amber-100 font-semibold text-amber-800" },
    closed: { text: "☁ 共有できません (クラス停止中)", cls: "bg-amber-100 font-semibold text-amber-800" },
  };
  const m = map[status];
  return (
    <button onClick={onSync} className={`rounded-md px-2 py-0.5 text-xs ${m.cls}`} title="押すと今すぐ送信します">
      {m.text}
    </button>
  );
}
