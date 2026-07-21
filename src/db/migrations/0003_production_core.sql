-- DámMaturu production core model v3
-- Identity, materials, learner runtime + extensions to content spine.
-- Apply after 0001 + 0002:
--   psql "$DATABASE_URL" -f src/db/migrations/0003_production_core.sql
--
-- Entity map (product → table):
--   User → users
--   StudentProfile → student_profiles
--   SchoolProfile → school_profiles
--   Exam → exams (+ exam_subjects)
--   Subject → subjects (extended)
--   StudyMaterial → study_materials
--   Document → source_documents (extended)
--   DocumentChunk → source_chunks
--   KnowledgeUnit / Topic / Question → existing content tables
--   QuestionAttempt → question_attempts
--   StudySession → study_sessions
--   Mistake → mistakes
--   MasteryState → mastery_states (extended; score+band canonical)
--   ReviewSchedule → review_schedules
--   StudyPlan → study_plans
--   DailyMission → daily_missions
--   MockExam / MockExamAttempt → mock_exams / mock_exam_attempts
--   ReadinessSnapshot → readiness_snapshots

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE mastery_band AS ENUM (
    'not_seen', 'introduced', 'learning', 'familiar', 'strong', 'mastered', 'at_risk'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE school_type AS ENUM ('gymnazium', 'ss_odborna', 'ss_prakticka', 'jine');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE preferred_study_time AS ENUM ('morning', 'afternoon', 'evening', 'flexible');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE study_mode AS ENUM ('standard', 'intensive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exam_authority AS ENUM ('cermat', 'school', 'ministry', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE material_owner_type AS ENUM ('platform', 'user', 'school');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE material_kind AS ENUM (
    'cermat', 'textbook', 'worksheet', 'notes', 'handout', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('active', 'paused', 'completed', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE study_session_kind AS ENUM (
    'question_engine', 'flashcards', 'active_recall', 'spaced_review',
    'mistake_practice', 'mock_exam', 'lesson', 'diagnostic', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attempt_correctness AS ENUM ('incorrect', 'partial', 'correct', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mistake_status AS ENUM ('open', 'practicing', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mistake_type AS ENUM (
    'author_work_swap', 'unknown_fact', 'chronology', 'concept_misunderstanding',
    'plot_detail', 'literary_term', 'uncertainty', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_item_kind AS ENUM ('knowledge_unit', 'flashcard', 'question');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE daily_step_kind AS ENUM ('learn', 'review', 'test');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mock_exam_band AS ENUM ('weak', 'partial', 'strong');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Content extensions ──────────────────────────────────────────────────────

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS language_code varchar(8) NOT NULL DEFAULT 'cs';

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS country_code varchar(2) NOT NULL DEFAULT 'CZ';

CREATE INDEX IF NOT EXISTS subjects_country_lang_idx
  ON subjects (country_code, language_code);

ALTER TABLE curricula
  ADD COLUMN IF NOT EXISTS exam_id uuid;

CREATE INDEX IF NOT EXISTS curricula_exam_idx ON curricula (exam_id);

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS language_code varchar(8) NOT NULL DEFAULT 'cs';

ALTER TABLE source_documents
  ADD COLUMN IF NOT EXISTS language_code varchar(8) NOT NULL DEFAULT 'cs';

ALTER TABLE source_documents
  ADD COLUMN IF NOT EXISTS study_material_id uuid;

CREATE INDEX IF NOT EXISTS source_documents_material_idx
  ON source_documents (study_material_id);

-- ─── Identity ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email varchar(320),
  display_name varchar(120),
  locale varchar(16) NOT NULL DEFAULT 'cs-CZ',
  country_code varchar(2) NOT NULL DEFAULT 'CZ',
  learner_key varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_learner_key_hex CHECK (learner_key ~ '^[a-f0-9]{32}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS users_learner_key_uidx ON users (learner_key);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON users (email);
CREATE INDEX IF NOT EXISTS users_country_idx ON users (country_code);

CREATE TABLE IF NOT EXISTS school_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(240) NOT NULL,
  school_type school_type NOT NULL DEFAULT 'jine',
  region varchar(120),
  country_code varchar(2) NOT NULL DEFAULT 'CZ',
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS school_profiles_country_idx ON school_profiles (country_code);
CREATE INDEX IF NOT EXISTS school_profiles_type_idx ON school_profiles (school_type);

CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(120) NOT NULL,
  title varchar(240) NOT NULL,
  description text,
  country_code varchar(2) NOT NULL DEFAULT 'CZ',
  authority exam_authority NOT NULL DEFAULT 'cermat',
  exam_year integer,
  format exam_format NOT NULL DEFAULT 'either',
  official_code varchar(80),
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  status publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exams_year_range CHECK (exam_year IS NULL OR (exam_year >= 2000 AND exam_year <= 2100))
);
CREATE UNIQUE INDEX IF NOT EXISTS exams_slug_uidx ON exams (slug);
CREATE INDEX IF NOT EXISTS exams_country_authority_idx ON exams (country_code, authority);

CREATE TABLE IF NOT EXISTS exam_subjects (
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT false,
  weight integer NOT NULL DEFAULT 1,
  PRIMARY KEY (exam_id, subject_id),
  CONSTRAINT exam_subjects_weight_positive CHECK (weight >= 1 AND weight <= 100)
);
CREATE INDEX IF NOT EXISTS exam_subjects_subject_idx ON exam_subjects (subject_id);

-- FK curricula.exam_id → exams (deferred until exams exists)
DO $$ BEGIN
  ALTER TABLE curricula
    ADD CONSTRAINT curricula_exam_id_fkey
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  school_profile_id uuid REFERENCES school_profiles(id) ON DELETE SET NULL,
  school_type school_type NOT NULL DEFAULT 'jine',
  target_exam_date date,
  daily_minutes integer NOT NULL DEFAULT 25,
  preferred_study_time preferred_study_time NOT NULL DEFAULT 'flexible',
  study_mode study_mode NOT NULL DEFAULT 'standard',
  readiness_feeling integer,
  wants_diagnostic boolean NOT NULL DEFAULT true,
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_profiles_daily_minutes CHECK (daily_minutes BETWEEN 5 AND 240),
  CONSTRAINT student_profiles_readiness_feeling CHECK (
    readiness_feeling IS NULL OR readiness_feeling BETWEEN 1 AND 5
  )
);
CREATE INDEX IF NOT EXISTS student_profiles_school_idx ON student_profiles (school_profile_id);

CREATE TABLE IF NOT EXISTS subject_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  exam_id uuid REFERENCES exams(id) ON DELETE SET NULL,
  curriculum_id uuid REFERENCES curricula(id) ON DELETE SET NULL,
  target_date date,
  status enrollment_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subject_enrollments_user_subject_uidx
  ON subject_enrollments (user_id, subject_id);
CREATE INDEX IF NOT EXISTS subject_enrollments_user_idx ON subject_enrollments (user_id);
CREATE INDEX IF NOT EXISTS subject_enrollments_subject_idx ON subject_enrollments (subject_id);

-- ─── Study materials ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS study_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(300) NOT NULL,
  description text,
  owner_type material_owner_type NOT NULL DEFAULT 'platform',
  owner_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  school_profile_id uuid REFERENCES school_profiles(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  exam_id uuid REFERENCES exams(id) ON DELETE SET NULL,
  material_kind material_kind NOT NULL DEFAULT 'other',
  language_code varchar(8) NOT NULL DEFAULT 'cs',
  source_document_id uuid REFERENCES source_documents(id) ON DELETE SET NULL,
  status publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_materials_owner_user_consistency CHECK (
    (owner_type <> 'user') OR (owner_user_id IS NOT NULL)
  ),
  CONSTRAINT study_materials_owner_school_consistency CHECK (
    (owner_type <> 'school') OR (school_profile_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS study_materials_document_uidx
  ON study_materials (source_document_id)
  WHERE source_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS study_materials_owner_user_idx ON study_materials (owner_user_id);
CREATE INDEX IF NOT EXISTS study_materials_subject_idx ON study_materials (subject_id);
CREATE INDEX IF NOT EXISTS study_materials_exam_idx ON study_materials (exam_id);
CREATE INDEX IF NOT EXISTS study_materials_owner_type_idx ON study_materials (owner_type);

DO $$ BEGIN
  ALTER TABLE source_documents
    ADD CONSTRAINT source_documents_study_material_id_fkey
    FOREIGN KEY (study_material_id) REFERENCES study_materials(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── MasteryState extensions (migrate existing table) ────────────────────────

ALTER TABLE mastery_states
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE mastery_states
  ADD COLUMN IF NOT EXISTS score numeric(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE mastery_states
  ADD COLUMN IF NOT EXISTS band mastery_band NOT NULL DEFAULT 'not_seen';

ALTER TABLE mastery_states
  ADD COLUMN IF NOT EXISTS peak_band mastery_band NOT NULL DEFAULT 'not_seen';

ALTER TABLE mastery_states
  ADD COLUMN IF NOT EXISTS last_successful_recall_at timestamptz;

ALTER TABLE mastery_states
  ADD COLUMN IF NOT EXISTS introduced_at timestamptz;

ALTER TABLE mastery_states
  ADD COLUMN IF NOT EXISTS successful_recalls integer NOT NULL DEFAULT 0;

ALTER TABLE mastery_states
  ADD COLUMN IF NOT EXISTS transfer_successes integer NOT NULL DEFAULT 0;

ALTER TABLE mastery_states
  ADD COLUMN IF NOT EXISTS diagnostic_attempts integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE mastery_states
    ADD CONSTRAINT mastery_states_score_range CHECK (score >= 0 AND score <= 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS mastery_states_user_ku_uidx
  ON mastery_states (user_id, knowledge_unit_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mastery_states_user_due_idx ON mastery_states (user_id, due_at);
CREATE INDEX IF NOT EXISTS mastery_states_band_idx ON mastery_states (band);

-- ─── Learner runtime ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES subject_enrollments(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  kind study_session_kind NOT NULL DEFAULT 'other',
  pack_slug varchar(120),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_sessions_time_order CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS study_sessions_user_started_idx
  ON study_sessions (user_id, started_at);
CREATE INDEX IF NOT EXISTS study_sessions_kind_idx ON study_sessions (kind);

CREATE TABLE IF NOT EXISTS question_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  knowledge_unit_id uuid REFERENCES knowledge_units(id) ON DELETE SET NULL,
  session_id uuid REFERENCES study_sessions(id) ON DELETE SET NULL,
  external_question_key varchar(160),
  correctness attempt_correctness NOT NULL,
  response_ms integer,
  hints_used integer NOT NULL DEFAULT 0,
  answer_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  graded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_attempts_response_ms CHECK (
    response_ms IS NULL OR response_ms >= 0
  ),
  CONSTRAINT question_attempts_hints CHECK (hints_used >= 0 AND hints_used <= 20),
  CONSTRAINT question_attempts_has_question_ref CHECK (
    question_id IS NOT NULL OR external_question_key IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS question_attempts_user_graded_idx
  ON question_attempts (user_id, graded_at);
CREATE INDEX IF NOT EXISTS question_attempts_question_idx ON question_attempts (question_id);
CREATE INDEX IF NOT EXISTS question_attempts_ku_idx ON question_attempts (knowledge_unit_id);
CREATE INDEX IF NOT EXISTS question_attempts_session_idx ON question_attempts (session_id);

CREATE TABLE IF NOT EXISTS mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  knowledge_unit_id uuid REFERENCES knowledge_units(id) ON DELETE SET NULL,
  question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  attempt_id uuid REFERENCES question_attempts(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  student_answer text NOT NULL,
  correct_concept text NOT NULL,
  why_wrong text NOT NULL,
  mistake_type mistake_type NOT NULL DEFAULT 'other',
  status mistake_status NOT NULL DEFAULT 'open',
  success_streak integer NOT NULL DEFAULT 0,
  practice_count integer NOT NULL DEFAULT 0,
  resolved_at timestamptz,
  knowledge_slug varchar(120),
  knowledge_title varchar(160),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mistakes_streak_nonneg CHECK (success_streak >= 0),
  CONSTRAINT mistakes_practice_nonneg CHECK (practice_count >= 0)
);
CREATE INDEX IF NOT EXISTS mistakes_user_status_idx ON mistakes (user_id, status);
CREATE INDEX IF NOT EXISTS mistakes_user_occurred_idx ON mistakes (user_id, occurred_at);
CREATE INDEX IF NOT EXISTS mistakes_ku_idx ON mistakes (knowledge_unit_id);

CREATE TABLE IF NOT EXISTS review_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_kind review_item_kind NOT NULL,
  knowledge_unit_id uuid REFERENCES knowledge_units(id) ON DELETE CASCADE,
  flashcard_id uuid REFERENCES flashcards(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  external_item_key varchar(160),
  ease_factor numeric(6, 3) NOT NULL DEFAULT 2.500,
  interval_days numeric(10, 2) NOT NULL DEFAULT 0,
  repetitions integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_schedules_ease CHECK (ease_factor >= 1.0 AND ease_factor <= 5.0),
  CONSTRAINT review_schedules_interval CHECK (interval_days >= 0),
  CONSTRAINT review_schedules_item_present CHECK (
    knowledge_unit_id IS NOT NULL
    OR flashcard_id IS NOT NULL
    OR question_id IS NOT NULL
    OR external_item_key IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS review_schedules_user_due_idx ON review_schedules (user_id, due_at);
CREATE INDEX IF NOT EXISTS review_schedules_ku_idx ON review_schedules (knowledge_unit_id);
CREATE UNIQUE INDEX IF NOT EXISTS review_schedules_user_ku_uidx
  ON review_schedules (user_id, knowledge_unit_id)
  WHERE knowledge_unit_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS review_schedules_user_flashcard_uidx
  ON review_schedules (user_id, flashcard_id)
  WHERE flashcard_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES subject_enrollments(id) ON DELETE SET NULL,
  target_date date,
  daily_minutes integer NOT NULL DEFAULT 25,
  mode varchar(32) NOT NULL DEFAULT 'standard',
  days_remaining integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_plans_daily_minutes CHECK (daily_minutes BETWEEN 5 AND 240)
);
CREATE INDEX IF NOT EXISTS study_plans_user_active_idx ON study_plans (user_id, is_active);
CREATE INDEX IF NOT EXISTS study_plans_enrollment_idx ON study_plans (enrollment_id);

CREATE TABLE IF NOT EXISTS daily_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES subject_enrollments(id) ON DELETE SET NULL,
  date_key date NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  knowledge_strengthened integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_missions_knowledge_nonneg CHECK (knowledge_strengthened >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS daily_missions_user_date_uidx
  ON daily_missions (user_id, date_key);
CREATE INDEX IF NOT EXISTS daily_missions_date_idx ON daily_missions (date_key);

CREATE TABLE IF NOT EXISTS mock_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(120) NOT NULL,
  title varchar(240) NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mock_exams_slug_uidx ON mock_exams (slug);

CREATE TABLE IF NOT EXISTS mock_exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE RESTRICT,
  session_id uuid REFERENCES study_sessions(id) ON DELETE SET NULL,
  overall_score numeric(5, 2),
  band mock_exam_band,
  dimension_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mock_exam_attempts_score_range CHECK (
    overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)
  ),
  CONSTRAINT mock_exam_attempts_time_order CHECK (
    completed_at IS NULL OR completed_at >= started_at
  )
);
CREATE INDEX IF NOT EXISTS mock_exam_attempts_user_idx
  ON mock_exam_attempts (user_id, completed_at);
CREATE INDEX IF NOT EXISTS mock_exam_attempts_exam_idx ON mock_exam_attempts (mock_exam_id);

CREATE TABLE IF NOT EXISTS readiness_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES subject_enrollments(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  overall_pct numeric(5, 2) NOT NULL,
  area_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  weak_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  units_covered integer NOT NULL DEFAULT 0,
  units_total integer NOT NULL DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT readiness_snapshots_pct CHECK (overall_pct >= 0 AND overall_pct <= 100),
  CONSTRAINT readiness_snapshots_units CHECK (
    units_covered >= 0 AND units_total >= 0 AND units_covered <= units_total
  )
);
CREATE INDEX IF NOT EXISTS readiness_snapshots_user_captured_idx
  ON readiness_snapshots (user_id, captured_at);
CREATE INDEX IF NOT EXISTS readiness_snapshots_enrollment_idx
  ON readiness_snapshots (enrollment_id);

-- Seed reference: Czech CERMAT-style ČJL exam (idempotent)
INSERT INTO exams (id, slug, title, description, country_code, authority, exam_year, format, status)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'cz-maturita-cjl',
  'Maturita — Český jazyk a literatura',
  'Oficiální rámec maturity z ČJL (CERMAT). Detailní požadavky ve sloupci requirements.',
  'CZ',
  'cermat',
  2026,
  'either',
  'published'
)
ON CONFLICT (slug) DO NOTHING;
-- Note: ON CONFLICT requires unique on slug — we have exams_slug_uidx.
-- For INSERT ... ON CONFLICT (slug) we need UNIQUE CONSTRAINT not just unique index.
-- Unique index is enough for ON CONFLICT in PostgreSQL when targeting the index columns.

DO $$
BEGIN
  -- Link exam to ČJL subject if present
  INSERT INTO exam_subjects (exam_id, subject_id, is_primary, weight)
  SELECT e.id, s.id, true, 1
  FROM exams e
  CROSS JOIN subjects s
  WHERE e.slug = 'cz-maturita-cjl' AND s.slug = 'cjl'
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  NULL; -- subjects may be empty before seed
END $$;
