"use client";

import { RankIcon } from "./RankIcon";
import type { Rank, RankProgress } from "@/lib/ranks";

interface Props {
  progress: RankProgress;
  score: number;
  /** ランクアップした直後 (アニメーション表示用) */
  justRankedUp?: boolean;
}

export function RankBadge({ progress, score, justRankedUp = false }: Props) {
  const { current, next, progressPct, pointsToNext } = progress;
  return (
    <div
      className={`rounded-xl border-2 bg-white p-3 shadow-sm transition ${
        justRankedUp ? "ring-4 ring-offset-2" : ""
      }`}
      style={{
        borderColor: current.borderColor,
        boxShadow: justRankedUp
          ? `0 0 24px ${current.glowColor}`
          : undefined,
      }}
    >
      {/* Top: アイコン + ランク名 + スコア */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: current.bgColor,
            color: current.color,
            boxShadow: `inset 0 0 0 1.5px ${current.borderColor}`,
          }}
          title={current.desc}
        >
          <RankIcon iconKey={current.iconKey} size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-bold leading-tight truncate"
            style={{ color: current.color }}
          >
            {current.nameJa}
          </div>
          <div className="text-xs text-stone-500 mt-0.5 leading-tight">
            {score} pt
            {next && (
              <span className="ml-1 text-stone-400">
                / {next.threshold}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2.5">
        <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: `linear-gradient(90deg, ${current.color}, ${current.glowColor})`,
            }}
          />
        </div>
        {next ? (
          <div className="mt-1 text-[11px] text-stone-500 leading-tight">
            次: <span style={{ color: next.color, fontWeight: 600 }}>{next.nameJa}</span>{" "}
            まであと {pointsToNext} pt
          </div>
        ) : (
          <div className="mt-1 text-[11px] font-semibold leading-tight" style={{ color: current.color }}>
            🎉 最終ランクに到達！
          </div>
        )}
      </div>
    </div>
  );
}

/** ランクアップ通知用のトースト */
export function RankUpToast({ rank, onDismiss }: { rank: Rank; onDismiss: () => void }) {
  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-white shadow-2xl border-2 px-5 py-4 flex items-center gap-3 min-w-[280px] animate-rank-up"
      style={{
        borderColor: rank.borderColor,
        boxShadow: `0 0 40px ${rank.glowColor}`,
      }}
      role="status"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
        style={{ background: rank.bgColor, color: rank.color }}
      >
        <RankIcon iconKey={rank.iconKey} size={32} />
      </div>
      <div className="flex-1">
        <div className="text-xs text-stone-500 font-semibold uppercase tracking-wider">
          🎊 RANK UP
        </div>
        <div
          className="text-base font-bold mt-0.5"
          style={{ color: rank.color }}
        >
          {rank.nameJa} に到達！
        </div>
        <div className="text-xs text-stone-600 mt-0.5">{rank.desc}</div>
      </div>
      <button
        onClick={onDismiss}
        className="text-stone-400 hover:text-stone-600 text-xl leading-none px-1"
        aria-label="閉じる"
      >
        ×
      </button>
    </div>
  );
}
