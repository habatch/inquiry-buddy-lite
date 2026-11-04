import { clientIp, createSession, fail, hashCode, json, normalizeCode, readJson, recordFailure, tooManyFailures, type Env } from "../../_lib/util";

const WINDOW = 10 * 60_000;
// 学校では全員が同じ IP。コードは約 59 ビットあるので総当たりは現実的でなく、
// IP 単位の上限はクラス全員の打ち間違いに耐えられるよう高めにする
const IP_LIMIT = 300;

/** POST /api/student/login { code } */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson<{ code?: string }>(request, 1024);
  const code = normalizeCode(body?.code ?? "");
  if (code.length !== 12) return fail(400, "ログインコードは 12 文字です (例: ABCD-EFGH-JKMN)");

  const ipKey = "s-ip:" + clientIp(request);
  if (await tooManyFailures(env, ipKey, IP_LIMIT, WINDOW)) {
    return fail(429, "ログインの失敗が多すぎます。10 分ほど待ってから試してください。");
  }

  const st = await env.DB.prepare(
    `SELECT s.id, s.number, s.name, c.name AS class_name, c.archived, sc.active
       FROM students s JOIN classes c ON c.id = s.class_id JOIN schools sc ON sc.id = c.school_id
      WHERE s.code_hash = ?`,
  )
    .bind(await hashCode(code))
    .first<{ id: string; number: string; name: string; class_name: string; archived: number; active: number }>();

  if (!st) {
    await recordFailure(env, ipKey, WINDOW);
    return fail(401, "ログインコードが違います。カードをもう一度確認してください。");
  }
  if (st.archived || !st.active) return fail(403, "このクラスは現在使えません。先生に確認してください。");

  const cookie = await createSession(env, "student", st.id);
  return json(
    { student: { id: st.id, number: st.number, name: st.name, className: st.class_name } },
    200,
    { "Set-Cookie": cookie },
  );
};
