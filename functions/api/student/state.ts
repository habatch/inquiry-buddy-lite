import { fail, getSession, json, type Env } from "../../_lib/util";
import { MAX_STATE_BYTES, sanitizeState, summarize } from "../../_lib/progress";

interface Row {
  id: string;
  number: string;
  name: string;
  class_name: string;
  state: string | null;
  version: number | null;
  updated_at: number | null;
}

async function load(env: Env, studentId: string) {
  return env.DB.prepare(
    `SELECT s.id, s.number, s.name, c.name AS class_name, p.state, p.version, p.updated_at
       FROM students s JOIN classes c ON c.id = s.class_id LEFT JOIN progress p ON p.student_id = s.id
      WHERE s.id = ?`,
  )
    .bind(studentId)
    .first<Row>();
}

/** GET /api/student/state — ログイン中の生徒の情報と、サーバに保存された記録 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const sid = await getSession(env, request, "student");
  if (!sid) return fail(401, "ログインしてください");
  const row = await load(env, sid);
  if (!row) return fail(401, "ログインしてください");
  return json({
    student: { id: row.id, number: row.number, name: row.name, className: row.class_name },
    progress: row.state ? { state: JSON.parse(row.state), version: row.version, updatedAt: row.updated_at } : null,
  });
};

/**
 * PUT /api/student/state { state, baseVersion }
 * baseVersion が保存済みの版と違えば 409 (別の端末で更新された) を返し、上書きしない。
 */
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const sid = await getSession(env, request, "student");
  if (!sid) return fail(401, "ログインしてください");

  const text = await request.text();
  if (text.length > MAX_STATE_BYTES) return fail(413, "記録が大きすぎます。不要な行動メモを減らしてください。");
  let body: { state?: unknown; baseVersion?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return fail(400, "形式が正しくありません");
  }
  const st = sanitizeState(body.state);
  if (!st) return fail(400, "形式が正しくありません");
  const base = typeof body.baseVersion === "number" ? body.baseVersion : 0;

  const s = summarize(st);
  const stateJson = JSON.stringify(st);
  const now = Date.now();
  const next = base + 1;

  // 版がそろっているときだけ書き込む (楽観的排他制御)
  const res =
    base === 0
      ? await env.DB.prepare(
          `INSERT INTO progress (student_id, state, version, score, rank_id, step, steps_ready, actions_total, actions_done, updated_at)
           VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(student_id) DO NOTHING`,
        )
          .bind(sid, stateJson, s.score, s.rankId, s.step, s.stepsReady, s.actionsTotal, s.actionsDone, now)
          .run()
      : await env.DB.prepare(
          `UPDATE progress SET state = ?, version = ?, score = ?, rank_id = ?, step = ?, steps_ready = ?,
                  actions_total = ?, actions_done = ?, updated_at = ?
            WHERE student_id = ? AND version = ?`,
        )
          .bind(stateJson, next, s.score, s.rankId, s.step, s.stepsReady, s.actionsTotal, s.actionsDone, now, sid, base)
          .run();

  if (res.meta.changes === 1) return json({ version: next, updatedAt: now });

  const cur = await load(env, sid);
  return json(
    {
      error: "別の端末で記録が更新されています",
      progress: cur?.state ? { state: JSON.parse(cur.state), version: cur.version, updatedAt: cur.updated_at } : null,
    },
    409,
  );
};
