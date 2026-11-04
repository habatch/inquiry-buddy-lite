import { fail, hashCode, json, newLoginCode, type Env } from "../../_lib/util";
import { currentTeacher, ownsStudent } from "../../_lib/teacher";

function idOf(req: Request) {
  return new URL(req.url).searchParams.get("id") ?? "";
}

/** GET /api/teacher/student?id=ID — 生徒 1 人の記入内容 (担当クラスの生徒のみ) */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const t = await currentTeacher(env, request);
  if (!t) return fail(401, "ログインしてください");
  const id = idOf(request);
  if (!(await ownsStudent(env, t, id))) return fail(404, "生徒が見つかりません");
  const row = await env.DB.prepare(
    `SELECT s.id, s.number, s.name, s.class_id, c.name AS class_name, p.state, p.score, p.rank_id, p.updated_at
       FROM students s JOIN classes c ON c.id = s.class_id LEFT JOIN progress p ON p.student_id = s.id
      WHERE s.id = ?`,
  )
    .bind(id)
    .first<Record<string, unknown> & { state: string | null }>();
  if (!row) return fail(404, "生徒が見つかりません");
  const { state, ...rest } = row;
  return json({ student: rest, state: state ? JSON.parse(state) : null });
};

/** POST /api/teacher/student?id=ID { action: "reset-code" } — コードを再発行 (古いコードとログイン中の端末は無効になる) */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const t = await currentTeacher(env, request);
  if (!t) return fail(401, "ログインしてください");
  const id = idOf(request);
  if (!(await ownsStudent(env, t, id))) return fail(404, "生徒が見つかりません");
  const code = newLoginCode();
  await env.DB.batch([
    env.DB.prepare("UPDATE students SET code_hash = ? WHERE id = ?").bind(await hashCode(code), id),
    env.DB.prepare("DELETE FROM sessions WHERE kind = 'student' AND subject_id = ?").bind(id),
  ]);
  return json({ code });
};

/** DELETE /api/teacher/student?id=ID — 生徒と記録を削除 */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const t = await currentTeacher(env, request);
  if (!t) return fail(401, "ログインしてください");
  const id = idOf(request);
  if (!(await ownsStudent(env, t, id))) return fail(404, "生徒が見つかりません");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM progress WHERE student_id = ?").bind(id),
    env.DB.prepare("DELETE FROM sessions WHERE kind = 'student' AND subject_id = ?").bind(id),
    env.DB.prepare("DELETE FROM students WHERE id = ?").bind(id),
  ]);
  return json({ ok: true });
};
