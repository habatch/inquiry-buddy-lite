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
    // 区切りは「/」「改行」「・」だけ。「、」は 1 つの文の途中で使うことが多いので区切らない
    for (const part of raw.split(/[\/／\n]|・(?=\S{2,})/)) {
      const t = part
        .replace(/^(例[:：]?|など)|など$|について$|のこと$|が気になる$|が気になります$/g, "")
        .trim()
        .slice(0, 60);
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

/**
 * 文章から、辞書・百科事典で引ける「重要な言葉」を取り出す (AI なし)。
 *
 * Wikipedia やコトバンクは単語で引く仕組みなので、「雨の日に頭が痛くなる原因」のような文章を
 * そのまま入れると何も見つからない。ひらがな (助詞・語尾) を区切りとみなし、
 * 漢字・カタカナ・英数字が続く部分を内容語として拾う。
 * 「原因」「影響」のように、どのテーマにも付く一般的な言葉は除く。
 */
const GENERIC_WORDS = new Set([
  "原因", "理由", "影響", "関係", "方法", "問題", "対策", "研究", "調査", "自分", "最近", "今回", "場合",
  "結果", "可能", "必要", "違い", "変化", "効果", "意味", "状況", "現状", "仕組", "課題", "解決", "比較",
  "気持", "興味", "探究", "テーマ", "データ", "高校生", "中学生", "学生", "生徒", "日本", "世界", "社会",
  "生活", "身近", "毎日", "本当", "何故", "取組", "取り組み", "具体的", "一番",
]);

export function extractKeywords(text: string, max = 3): string[] {
  const t = text.normalize("NFKC");
  const runs = t.match(/[\p{Script=Han}\p{Script=Katakana}ー々A-Za-z0-9]+/gu) ?? [];
  const out: string[] = [];
  for (const r of runs) {
    const w = r.replace(/^ー+|ー+$/g, "");
    if (w.length < 2) continue; // 「雨」「日」のような 1 文字は語尾の一部であることが多いので除く
    if (/^\d+$/.test(w)) continue;
    if (GENERIC_WORDS.has(w)) continue;
    if (!out.includes(w)) out.push(w);
    if (out.length >= max) break;
  }
  // 何も取れないとき: 短い 1 語 (例:「すいみん」) ならそのまま使う。文章は辞書で引けないので空を返す
  const whole = t.trim();
  if (out.length === 0 && whole.length <= 8 && !/[\s、。,.!?！？]/.test(whole)) out.push(whole);
  return out;
}
