import { fail, json, type Env } from "../../_lib/util";
import { currentTeacher, ownsClass } from "../../_lib/teacher";

/** GET /api/teacher/progress?class=ID — クラス全員の進捗の要約 (記入内容は含まない、一覧は軽く) */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const t = await currentTeacher(env, request);
  if (!t) return fail(401, "ログインしてください");
  const classId = new URL(request.url).searchParams.get("class") ?? "";
  if (!(await ownsClass(env, t, classId))) return fail(404, "クラスが見つかりません");

  const cls = await env.DB.prepare("SELECT id, name FROM classes WHERE id = ?").bind(classId).first();
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.number, s.name,
            p.score, p.rank_id, p.step, p.steps_ready, p.actions_total, p.actions_done, p.updated_at
       FROM students s LEFT JOIN progress p ON p.student_id = s.id
      WHERE s.class_id = ?
      ORDER BY CAST(s.number AS INTEGER), s.number`,
  )
    .bind(classId)
    .all();
  return json({ class: cls, students: results });
};
