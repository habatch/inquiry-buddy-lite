/** 探究記録を Word (.docx) にしてブラウザで直接ダウンロードする (サーバ不要) */
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { STEPS } from "./steps";
import { AGE_OPTIONS, INTEREST_CATEGORIES } from "./topics";
import { answerKey, type AppState } from "./state";
import { kindMeta, STATUS_META } from "./actions";
import { saveBlob } from "./file";

const blank = () => new Paragraph({ children: [new TextRun("")] });

function textLines(text: string): Paragraph[] {
  return text.split("\n").map(
    (line) => new Paragraph({ children: [new TextRun({ text: line, size: 22 })] }),
  );
}

export async function downloadDocx(st: AppState, score: number, rankName: string) {
  const today = new Date().toLocaleDateString("ja-JP");
  const out: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "私の探究記録", bold: true, size: 44 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `作成日: ${today}    /    ランク: ${rankName}    /    スコア: ${score} pt`,
          color: "666666",
          size: 20,
        }),
      ],
    }),
    blank(),
  ];

  const p = st.profile;
  if (p) {
    const age = AGE_OPTIONS.find((a) => a.id === p.age)?.label ?? "未指定";
    const interests =
      p.interests
        .map((id) => INTEREST_CATEGORIES.find((c) => c.id === id))
        .filter(Boolean)
        .map((c) => `${c!.icon} ${c!.label}`)
        .join(" / ") || "未指定";
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "プロフィール", bold: true })],
      }),
      new Paragraph({
        children: [new TextRun({ text: "年齢層: ", bold: true }), new TextRun(age)],
      }),
      new Paragraph({
        children: [new TextRun({ text: "興味分野: ", bold: true }), new TextRun(interests)],
      }),
    );
    if (p.otherInterest) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({ text: "ほかの興味: ", bold: true }),
            new TextRun(p.otherInterest),
          ],
        }),
      );
    }
    if (p.customTopic) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({ text: "自由記述: ", bold: true }),
            new TextRun(p.customTopic),
          ],
        }),
      );
    }
    out.push(blank());
  }

  for (const s of STEPS) {
    const answered = s.fields.filter((f) =>
      (st.answers[answerKey(s.id, f.id)] ?? "").trim(),
    );
    if (answered.length === 0) continue;
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({ text: `${s.icon} ステップ ${s.id}: ${s.name}`, bold: true }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `(目標: ${s.goal})`, italics: true, color: "666666", size: 18 }),
        ],
      }),
    );
    for (const f of answered) {
      out.push(
        new Paragraph({
          spacing: { before: 160 },
          children: [new TextRun({ text: `■ ${f.label}`, bold: true, color: "0F766E", size: 20 })],
        }),
        ...textLines(st.answers[answerKey(s.id, f.id)].trim()),
      );
    }
    out.push(blank());
  }

  if (st.actions.length > 0) {
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "🚀 行動の記録", bold: true })],
      }),
    );
    for (const a of [...st.actions].sort((x, y) => x.createdAt - y.createdAt)) {
      const k = kindMeta(a.kind);
      out.push(
        new Paragraph({
          spacing: { before: 160 },
          children: [
            new TextRun({ text: `■ ${k.icon} ${a.title}`, bold: true, color: "0F766E", size: 20 }),
            new TextRun({
              text: `  [${STATUS_META[a.status].label}${a.due ? ` / 予定日 ${a.due}` : ""}]`,
              color: "666666",
              size: 18,
            }),
          ],
        }),
      );
      if (a.memo.trim()) out.push(...textLines(a.memo.trim()));
      if (a.learned.trim()) {
        out.push(
          new Paragraph({ children: [new TextRun({ text: "分かったこと:", bold: true, size: 20 })] }),
          ...textLines(a.learned.trim()),
        );
      }
    }
    out.push(blank());
  }

  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "— 探究伴走ノートで作成した探究記録 —", color: "999999", size: 18 }),
      ],
    }),
  );

  const doc = new Document({ sections: [{ properties: {}, children: out }] });
  const blob = await Packer.toBlob(doc);
  saveBlob(blob, `探究記録_${new Date().toISOString().slice(0, 10)}.docx`);
}
