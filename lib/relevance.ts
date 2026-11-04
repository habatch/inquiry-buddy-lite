/**
 * 生徒が書いたテーマと、話題カードの関連度を測る (AI なし)。
 * 日本語は単語区切りが無いので、文字 2-gram の重なりで近さを判定する。
 */
import type { Topic } from "./topicBank";
import { TOPIC_BANK } from "./topicBank";
import { INTEREST_CATEGORIES } from "./topics";

/** 意味の薄いひらがな連続 (助詞・語尾) を除いた 2-gram 集合 */
function bigrams(text: string): Set<string> {
  const t = text
    .toLowerCase()
    .replace(/[\s、。・,.!?！？「」『』()（）\/／:：〜~\-ー]+/g, " ");
  const out = new Set<string>();
  for (const chunk of t.split(" ")) {
    for (let i = 0; i < chunk.length - 1; i++) {
      const g = chunk.slice(i, i + 2);
      if (/^[ぁ-ゖ]{2}$/.test(g)) continue; // ひらがなだけの 2-gram は除外
      if (/[のがはをにでともへやか]/.test(g)) continue; // 助詞をまたぐ 2-gram (「日の」等) は除外
      out.add(g);
    }
    // 1 文字の漢字・カタカナ語 (例: 「雨」「AI」) も拾う
    if (chunk.length === 1 && /[一-鿿゠-ヿ]/.test(chunk)) out.add(chunk);
  }
  return out;
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const g of a) if (b.has(g)) n++;
  return n;
}

/** テーマ文を検索しやすい語に分ける (区切り記号で分割、長すぎるものは切る) */
export function themeTerms(...texts: (string | undefined)[]): string[] {
  const terms: string[] = [];
  for (const raw of texts) {
    if (!raw?.trim()) continue;
    for (const part of raw.split(/[\/／、,，\n]|・(?=\S{2,})/)) {
      const t = part
        .replace(/^(例[:：]?|など)|など$|について$|のこと$|が気になる$|が気になります$/g, "")
        .trim()
        .slice(0, 40);
      if (t.length >= 2 && !terms.includes(t)) terms.push(t);
    }
  }
  return terms.slice(0, 4);
}

/** テーマに関連する話題カードだけを、関連度順に返す */
export function relatedTopics(terms: string[], limit = 4): Topic[] {
  if (terms.length === 0) return [];
  const q = bigrams(terms.join(" "));
  const scored: { t: Topic; s: number }[] = [];
  for (const [catId, topics] of Object.entries(TOPIC_BANK)) {
    const cat = INTEREST_CATEGORIES.find((c) => c.id === catId);
    const catGrams = bigrams([cat?.label ?? "", ...(cat?.keywordsJa ?? [])].join(" "));
    const catBonus = overlap(q, catGrams) > 0 ? 1 : 0;
    for (const t of topics) {
      const s = overlap(q, bigrams(`${t.title} ${t.body} ${t.query}`)) * 2 + catBonus;
      // 分野だけ一致 (catBonus のみ) では「関連」とみなさない
      if (s >= 2) scored.push({ t, s });
    }
  }
  return scored
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.t);
}

/** テーマを深掘りするための検索の切り口 */
export const SEARCH_ANGLES: { label: string; suffix: string }[] = [
  { label: "なぜ起きる？", suffix: "原因" },
  { label: "どんな影響？", suffix: "影響" },
  { label: "数字で見ると？", suffix: "調査 データ" },
  { label: "どう解決する？", suffix: "対策 取り組み" },
  { label: "高校生の研究例", suffix: "高校生 研究" },
];
