/** ランクシステム — 探究の深さに応じてスコアが貯まり、ランクが上がる */

export interface Rank {
  id: string;
  nameJa: string;
  nameEn: string;
  threshold: number; // このランクに入る最低スコア
  color: string; // メインカラー (hex)
  bgColor: string; // バッジ背景
  borderColor: string; // ボーダー
  glowColor: string; // 発光 (rank-up 演出用)
  iconKey: IconKey;
  /** 説明文 (バッジホバー時 etc.) */
  desc: string;
}

export type IconKey =
  | "yajiri" // 鏃 — Iron
  | "dotaku" // 銅鐸 — Bronze
  | "kagami" // 八咫鏡 — Silver
  | "magatama" // 八尺瓊勾玉 — Gold
  | "kusanagi" // 草薙剣 — Ruby
  | "suishou" // 水晶玉 — Diamond
  | "ryu" // 黄龍 — Master
  | "suzaku" // 朱雀 — Crown I
  | "kirin" // 麒麟 — Crown II
  | "genbu" // 玄武 — Crown III
  | "houou"; // 鳳凰 — Crown Max

/**
 * ランク定義
 * 0-99 アイアン 黒
 * 100-199 ブロンズ 茶
 * 200-299 シルバー 白
 * 300-399 ゴールド 黄
 * 400-499 ルビー 紅
 * 500-599 ダイヤ 水色
 * 600-699 マスター 緑
 * 700-799 クラウン I 橙 (未使用色 1)
 * 800-899 クラウン II 桃 (未使用色 2)
 * 900-999 クラウン III 藍 (未使用色 3、深い青)
 * 1000+   マックスクラウン 紫
 */
export const RANKS: Rank[] = [
  {
    id: "iron",
    nameJa: "アイアン",
    nameEn: "Iron",
    threshold: 0,
    color: "#1f2937", // black
    bgColor: "#f3f4f6",
    borderColor: "#1f2937",
    glowColor: "#374151",
    iconKey: "yajiri",
    desc: "探究の出発点。ここから一歩ずつ。",
  },
  {
    id: "bronze",
    nameJa: "ブロンズ",
    nameEn: "Bronze",
    threshold: 100,
    color: "#92400e", // brown
    bgColor: "#fef3c7",
    borderColor: "#92400e",
    glowColor: "#b45309",
    iconKey: "dotaku",
    desc: "土台が見えてきた。問いの形が固まり始める。",
  },
  {
    id: "silver",
    nameJa: "シルバー",
    nameEn: "Silver",
    threshold: 200,
    color: "#6b7280", // silver-gray (白いと背景と被るので gray に)
    bgColor: "#ffffff",
    borderColor: "#9ca3af",
    glowColor: "#d1d5db",
    iconKey: "kagami",
    desc: "八咫鏡 — 真実を映す鏡。問いに向き合う準備が整った。",
  },
  {
    id: "gold",
    nameJa: "ゴールド",
    nameEn: "Gold",
    threshold: 300,
    color: "#b45309", // gold (rich)
    bgColor: "#fef3c7",
    borderColor: "#d97706",
    glowColor: "#f59e0b",
    iconKey: "magatama",
    desc: "八尺瓊勾玉 — 知の連なり。仮説に至る道が見えた。",
  },
  {
    id: "ruby",
    nameJa: "ルビー",
    nameEn: "Ruby",
    threshold: 400,
    color: "#be123c", // crimson
    bgColor: "#ffe4e6",
    borderColor: "#be123c",
    glowColor: "#e11d48",
    iconKey: "kusanagi",
    desc: "草薙剣 — 雲を断つ剣。データの霧を切り裂く。",
  },
  {
    id: "diamond",
    nameJa: "ダイヤ",
    nameEn: "Diamond",
    threshold: 500,
    color: "#0284c7", // light blue / cyan
    bgColor: "#e0f2fe",
    borderColor: "#0284c7",
    glowColor: "#38bdf8",
    iconKey: "suishou",
    desc: "水晶玉 — 透き通る八角。結論の輪郭が硬く澄みわたる。",
  },
  {
    id: "master",
    nameJa: "マスター",
    nameEn: "Master",
    threshold: 600,
    color: "#15803d", // green
    bgColor: "#dcfce7",
    borderColor: "#15803d",
    glowColor: "#22c55e",
    iconKey: "ryu",
    desc: "黄龍 — 五爪の龍が立ち上がる。探究の達人。",
  },
  {
    id: "crown_1",
    nameJa: "クラウン I 朱雀",
    nameEn: "Crown I — Suzaku",
    threshold: 700,
    color: "#ea580c", // orange
    bgColor: "#ffedd5",
    borderColor: "#ea580c",
    glowColor: "#fb923c",
    iconKey: "suzaku",
    desc: "朱雀 — 南方を司る霊鳥。頂点への第一段。",
  },
  {
    id: "crown_2",
    nameJa: "クラウン II 麒麟",
    nameEn: "Crown II — Kirin",
    threshold: 800,
    color: "#db2777", // pink
    bgColor: "#fce7f3",
    borderColor: "#db2777",
    glowColor: "#f472b6",
    iconKey: "kirin",
    desc: "麒麟 — 瑞獣現る。深い慈愛と思索の表れ。",
  },
  {
    id: "crown_3",
    nameJa: "クラウン III 玄武",
    nameEn: "Crown III — Genbu",
    threshold: 900,
    color: "#3730a3", // indigo
    bgColor: "#e0e7ff",
    borderColor: "#3730a3",
    glowColor: "#6366f1",
    iconKey: "genbu",
    desc: "玄武 — 北方を司る霊獣。揺るがぬ知識の蓄積。",
  },
  {
    id: "crown_max",
    nameJa: "マックスクラウン 鳳凰",
    nameEn: "Crown Max — Houou",
    threshold: 1000,
    color: "#7e22ce", // purple
    bgColor: "#f3e8ff",
    borderColor: "#7e22ce",
    glowColor: "#a855f7",
    iconKey: "houou",
    desc: "鳳凰 — 紫雲を従える瑞鳥。冠位十二階・大徳の極位。",
  },
];

export function getCurrentRank(score: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (score >= r.threshold) current = r;
    else break;
  }
  return current;
}

export function getNextRank(score: number): Rank | null {
  for (const r of RANKS) {
    if (score < r.threshold) return r;
  }
  return null;
}

export interface RankProgress {
  current: Rank;
  next: Rank | null;
  /** 0-100 (%), 現在ランク → 次ランクへの進捗 */
  progressPct: number;
  pointsIntoCurrent: number; // 現ランク内で取得した pt
  pointsToNext: number; // 次ランクまであと何 pt
  spanInCurrent: number; // 現ランクの span (基本 100、Max は 0)
}

export function getRankProgress(score: number): RankProgress {
  const current = getCurrentRank(score);
  const next = getNextRank(score);
  if (!next) {
    return {
      current,
      next: null,
      progressPct: 100,
      pointsIntoCurrent: score - current.threshold,
      pointsToNext: 0,
      spanInCurrent: 0,
    };
  }
  const span = next.threshold - current.threshold;
  const offset = score - current.threshold;
  const progressPct = Math.max(0, Math.min(100, (offset / span) * 100));
  return {
    current,
    next,
    progressPct,
    pointsIntoCurrent: offset,
    pointsToNext: next.threshold - score,
    spanInCurrent: span,
  };
}

// =================================================================
// スコアリング
// =================================================================
export const SCORE_USER_MSG_BASE = 4;
export const SCORE_USER_MSG_CHAR_RATIO = 0.12; // 100 char ≈ +12
export const SCORE_USER_MSG_CAP = 28; // 1 メッセージあたり最大
export const SCORE_NEXT_READY = 30; // ステップの記入とチェックがそろった時 (AI 版では AI の判断)
export const SCORE_STEP_TRANSITION = 50; // 「次のステップへ」を押した時

/** ユーザーメッセージから付与スコアを計算 */
export function scoreFromUserMessage(content: string): number {
  const trimmed = content.trim();
  if (trimmed.length < 2) return 0; // 短すぎる(1 文字以下)は無効
  const raw =
    SCORE_USER_MSG_BASE + Math.floor(trimmed.length * SCORE_USER_MSG_CHAR_RATIO);
  return Math.min(raw, SCORE_USER_MSG_CAP);
}
