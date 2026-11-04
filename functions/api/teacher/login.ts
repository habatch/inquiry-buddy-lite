import {
  clientIp,
  createSession,
  fail,
  hashPassword,
  json,
  pbkdf2Iterations,
  readJson,
  recordFailure,
  tooManyFailures,
  verifyPassword,
  type Env,
} from "../../_lib/util";

const WINDOW = 15 * 60_000;

/** POST /api/teacher/login { email, password } */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const b = await readJson<{ email?: string; password?: string }>(request, 2048);
  const email = (b?.email ?? "").trim().toLowerCase();
  const password = b?.password ?? "";
  if (!email || !password) return fail(400, "メールアドレスとパスワードを入力してください");

  const acctKey = "t-acct:" + email;
  const ipKey = "t-ip:" + clientIp(request);
  if ((await tooManyFailures(env, acctKey, 8, WINDOW)) || (await tooManyFailures(env, ipKey, 50, WINDOW))) {
    return fail(429, "ログインの失敗が多すぎます。15 分ほど待ってから試してください。");
  }

  const t = await env.DB.prepare(
    "SELECT t.id, t.name, t.pw, sc.name AS school_name, sc.active FROM teachers t JOIN schools sc ON sc.id = t.school_id WHERE t.email = ?",
  )
    .bind(email)
    .first<{ id: string; name: string; pw: string; school_name: string; active: number }>();

  const v = t ? await verifyPassword(password, t.pw) : { ok: false, iterations: 0 };
  if (!t || !v.ok) {
    await recordFailure(env, acctKey, WINDOW);
    await recordFailure(env, ipKey, WINDOW);
    return fail(401, "メールアドレスかパスワードが違います");
  }
  if (!t.active) return fail(403, "この学校のアカウントは現在停止しています");

  // 有料版に切り替えて反復回数を上げたら、ログイン時に強いハッシュへ置き換える
  const target = pbkdf2Iterations(env);
  const upgrade = v.iterations < target ? await hashPassword(password, target) : null;
  await env.DB.prepare(`UPDATE teachers SET last_login_at = ?${upgrade ? ", pw = ?" : ""} WHERE id = ?`)
    .bind(...(upgrade ? [Date.now(), upgrade, t.id] : [Date.now(), t.id]))
    .run();

  const cookie = await createSession(env, "teacher", t.id);
  return json({ teacher: { name: t.name, email, schoolName: t.school_name } }, 200, { "Set-Cookie": cookie });
};
