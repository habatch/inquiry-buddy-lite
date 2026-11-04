import { fail, hashCode, json, newLoginCode, randomId, readJson, type Env } from "../../_lib/util";
import { currentTeacher, ownsClass } from "../../_lib/teacher";

const MAX_PER_CLASS = 60;

/**
 * POST /api/teacher/students?class=ID { students: [{ number, name }] }
 * 名簿を登録し、生徒ごとのログインコードを発行する。
 * コードはこのレスポンスでしか見られない (サーバにはハッシュだけ保存)。
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const t = await currentTeacher(env, request);
  if (!t) return fail(401, "ログインしてください");
  const classId = new URL(request.url).searchParams.get("class") ?? "";
  if (!(await ownsClass(env, t, classId))) return fail(404, "クラスが見つかりません");

  const b = await readJson<{ students?: { number?: unknown; name?: unknown }[] }>(request, 64 * 1024);
  const list = (Array.isArray(b?.students) ? b!.students : [])
    .map((s) => ({ number: String(s?.number ?? "").trim().slice(0, 20), name: String(s?.name ?? "").trim().slice(0, 50) }))
    .filter((s) => s.number);
  if (list.length === 0) return fail(400, "出席番号を 1 人以上入力してください");

  const existing = await env.DB.prepare("SELECT number FROM students WHERE class_id = ?").bind(classId).all<{ number: string }>();
  const taken = new Set(existing.results.map((r) => r.number));
  if (taken.size + list.length > MAX_PER_CLASS) return fail(400, `1 クラス ${MAX_PER_CLASS} 人までです`);

  const created: { id: string; number: string; name: string; code: string }[] = [];
  const skipped: string[] = [];
  const stmts: D1PreparedStatement[] = [];
  const now = Date.now();
  for (const s of list) {
    if (taken.has(s.number)) {
      skipped.push(s.number);
      continue;
    }
    taken.add(s.number);
    const id = randomId();
    const code = newLoginCode();
    created.push({ id, number: s.number, name: s.name, code });
    stmts.push(
      env.DB.prepare("INSERT INTO students (id, class_id, number, name, code_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(
        id,
        classId,
        s.number,
        s.name,
        await hashCode(code),
        now,
      ),
    );
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ created, skipped }, 201);
};
