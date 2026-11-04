-- 探究伴走ノート: 初期スキーマ
-- 時刻はすべて UNIX ミリ秒

CREATE TABLE schools (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  invite_hash TEXT NOT NULL UNIQUE,   -- 教員招待コードの SHA-256
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL
);

CREATE TABLE teachers (
  id            TEXT PRIMARY KEY,
  school_id     TEXT NOT NULL REFERENCES schools(id),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  pw            TEXT NOT NULL,          -- pbkdf2$反復回数$salt$hash
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE classes (
  id         TEXT PRIMARY KEY,
  school_id  TEXT NOT NULL REFERENCES schools(id),
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  name       TEXT NOT NULL,
  archived   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX classes_teacher ON classes(teacher_id);

CREATE TABLE students (
  id         TEXT PRIMARY KEY,
  class_id   TEXT NOT NULL REFERENCES classes(id),
  number     TEXT NOT NULL,             -- 出席番号など
  name       TEXT NOT NULL DEFAULT '',
  code_hash  TEXT NOT NULL UNIQUE,      -- ログインコードの SHA-256
  created_at INTEGER NOT NULL,
  UNIQUE (class_id, number)
);
CREATE INDEX students_class ON students(class_id);

-- 生徒 1 人 1 行。state は端末と同じ AppState の JSON、それ以外は教員一覧用の要約
CREATE TABLE progress (
  student_id    TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  state         TEXT NOT NULL,
  version       INTEGER NOT NULL,
  score         INTEGER NOT NULL,
  rank_id       TEXT NOT NULL,
  step          INTEGER NOT NULL,
  steps_ready   INTEGER NOT NULL,
  actions_total INTEGER NOT NULL,
  actions_done  INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,          -- セッショントークンの SHA-256 (生のトークンは保存しない)
  kind       TEXT NOT NULL CHECK (kind IN ('student', 'teacher')),
  subject_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_subject ON sessions(subject_id);

-- ログイン失敗回数 (総当たり対策)
CREATE TABLE login_failures (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
