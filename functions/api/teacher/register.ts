import {
  clientIp,
  createSession,
  fail,
  hashPassword,
  json,
  pbkdf2Iterations,
  randomId,
  readJson,
  recordFailure,
  sha256,
  tooManyFailures,
  type Env,
} from "../../_lib/util";
import { validEmail } from "../../_lib/teacher";

const WINDOW = 15 * 60_000;

/** POST /api/teacher/register { inviteCode, email, name, password } */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const b = await readJson<{ inviteCode?: string; email?: string; name?: string; password?: string }>(request, 4096);
  const invite = (b?.inviteCode ?? "").trim();
  const email = (b?.email ?? "").trim().toLowerCase();
  const name = (b?.name ?? "").trim().slice(0, 50);
  const password = b?.password ?? "";

  if (!invite) return fail(400, "学校の招待コードを入力してください");
  if (!validEmail(email)) return fail(400, "メールアドレスの形式が正しくありません");
  if (!name) return fail(400, "お名前を入力してください");
  if (password.length < 10 || password.length > 200) return fail(400, "パスワードは 10 文字以上にしてください");

  const ipKey = "t-reg:" + clientIp(request);
  if (await tooManyFailures(env, ipKey, 20, WINDOW)) return fail(429, "試行が多すぎます。15 分ほど待ってください。");

  const school = await env.DB.prepare("SELECT id, name FROM schools WHERE invite_hash = ? AND active = 1")
    .bind(await sha256("invite:" + invite.toUpperCase().replace(/[^A-Z0-9]/g, "")))
    .first<{ id: string; name: string }>();
  if (!school) {
    await recordFailure(env, ipKey, WINDOW);
    return fail(401, "招待コードが違います");
  }

  const exists = await env.DB.prepare("SELECT 1 AS x FROM teachers WHERE email = ?").bind(email).first();
  if (exists) return fail(409, "このメールアドレスは登録済みです。ログインしてください。");

  const id = randomId();
  await env.DB.prepare("INSERT INTO teachers (id, school_id, email, name, pw, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, school.id, email, name, await hashPassword(password, pbkdf2Iterations(env)), Date.now(), Date.now())
    .run();

  const cookie = await createSession(env, "teacher", id);
  return json({ teacher: { name, email, schoolName: school.name } }, 200, { "Set-Cookie": cookie });
};
