import { fail, json, randomId, readJson, type Env } from "../../_lib/util";
import { currentTeacher } from "../../_lib/teacher";

/** GET /api/teacher/classes — 担当クラスの一覧 (人数・最終活動つき) */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const t = await currentTeacher(env, request);
  if (!t) return fail(401, "ログインしてください");
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, c.created_at,
            COUNT(s.id) AS students, MAX(p.updated_at) AS last_activity
       FROM classes c LEFT JOIN students s ON s.class_id = c.id LEFT JOIN progress p ON p.student_id = s.id
      WHERE c.teacher_id = ? AND c.archived = 0
      GROUP BY c.id ORDER BY c.created_at DESC`,
  )
    .bind(t.id)
    .all();
  return json({ classes: results });
};

/** POST /api/teacher/classes { name } — クラスを作る */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const t = await currentTeacher(env, request);
  if (!t) return fail(401, "ログインしてください");
  const b = await readJson<{ name?: string }>(request, 1024);
  const name = (b?.name ?? "").trim().slice(0, 50);
  if (!name) return fail(400, "クラス名を入力してください");
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM classes WHERE teacher_id = ? AND archived = 0").bind(t.id).first<{ n: number }>();
  if ((count?.n ?? 0) >= 50) return fail(400, "クラスは 50 個までです");
  const id = randomId();
  await env.DB.prepare("INSERT INTO classes (id, school_id, teacher_id, name, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, t.school_id, t.id, name, Date.now())
    .run();
  return json({ class: { id, name } }, 201);
};
