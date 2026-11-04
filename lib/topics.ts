/** 興味分野カテゴリ — オンボーディング + ニュース curation 用 */

export interface InterestCategory {
  id: string;
  label: string;
  icon: string;
  /** LLM に投げる時の英語 keyword (検索クエリ生成用) */
  keywordsJa: string[];
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: "nature",
    label: "自然・環境",
    icon: "🌿",
    keywordsJa: ["生物", "気候変動", "生態系", "海洋", "森林"],
  },
  {
    id: "science_tech",
    label: "科学・技術",
    icon: "🔬",
    keywordsJa: ["AI", "宇宙", "物理", "化学", "ロボット", "量子"],
  },
  {
    id: "society",
    label: "社会・歴史",
    icon: "🏛️",
    keywordsJa: ["政治", "経済", "戦争", "格差", "人口", "国際"],
  },
  {
    id: "language_lit",
    label: "言語・文学",
    icon: "📚",
    keywordsJa: ["国語", "英語", "翻訳", "古典", "詩", "文学"],
  },
  {
    id: "art_design",
    label: "芸術・デザイン",
    icon: "🎨",
    keywordsJa: ["美術", "音楽", "建築", "映画", "演劇"],
  },
  {
    id: "sports_health",
    label: "スポーツ・健康",
    icon: "⚽",
    keywordsJa: ["運動", "医療", "栄養", "睡眠", "メンタルヘルス"],
  },
  {
    id: "career",
    label: "働き方・キャリア",
    icon: "💼",
    keywordsJa: ["起業", "職業", "教育", "副業", "学生"],
  },
  {
    id: "media_ai",
    label: "情報・メディア",
    icon: "🌐",
    keywordsJa: ["SNS", "AI倫理", "フェイクニュース", "プライバシー", "ジャーナリズム"],
  },
  {
    id: "food_living",
    label: "食・暮らし",
    icon: "🍳",
    keywordsJa: ["料理", "農業", "持続可能", "食品ロス", "地域"],
  },
];

export const AGE_OPTIONS = [
  { id: "13_15", label: "中学生 (13–15歳)" },
  { id: "16_18", label: "高校生 (16–18歳)" },
  { id: "19_22", label: "大学・専門生 (19–22歳)" },
  { id: "other", label: "その他/教える側" },
];

export interface UserProfile {
  age: string;
  interests: string[]; // category id の配列
  otherInterest?: string; // 選択肢にない興味分野 (自由記述)
  customTopic?: string; // 「ここに書いてみる」の任意入力
}

export function getInterestLabels(ids: string[]): string[] {
  return ids
    .map((id) => INTEREST_CATEGORIES.find((c) => c.id === id)?.label)
    .filter((x): x is string => Boolean(x));
}

/** Step 1 の system prompt に渡す、ユーザー情報の文字列要約 */
export function profileSummary(p: UserProfile | null): string {
  if (!p) return "(プロフィール未設定)";
  const ageLabel =
    AGE_OPTIONS.find((a) => a.id === p.age)?.label ?? "未指定";
  const interests = getInterestLabels(p.interests).join("・") || "未指定";
  const custom = p.customTopic?.trim() ? `\n自由記述: ${p.customTopic}` : "";
  return `年齢層: ${ageLabel}\n興味分野: ${interests}${custom}`;
}
