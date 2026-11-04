import { getSession, type Env } from "./util";

export interface Teacher {
  id: string;
  school_id: string;
  name: string;
  email: string;
  school_name: string;
}

/** ログイン中の教員 (学校が停止中なら null) */
export async function currentTeacher(env: Env, req: Request): Promise<Teacher | null> {
  const tid = await getSession(env, req, "teacher");
  if (!tid) return null;
  return env.DB.prepare(
    `SELECT t.id, t.school_id, t.name, t.email, sc.name AS school_name
       FROM teachers t JOIN schools sc ON sc.id = t.school_id
      WHERE t.id = ? AND sc.active = 1`,
  )
    .bind(tid)
    .first<Teacher>();
}

/** その教員が担当するクラスか (他の先生・他の学校のクラスは見られない) */
export async function ownsClass(env: Env, t: Teacher, classId: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT 1 AS ok FROM classes WHERE id = ? AND teacher_id = ? AND school_id = ?")
    .bind(classId, t.id, t.school_id)
    .first();
  return !!row;
}

/** その教員が担当するクラスの生徒か */
export async function ownsStudent(env: Env, t: Teacher, studentId: string): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT 1 AS ok FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ? AND c.teacher_id = ? AND c.school_id = ?",
  )
    .bind(studentId, t.id, t.school_id)
    .first();
  return !!row;
}

export const validEmail = (s: string) => /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(s) && s.length <= 254;
