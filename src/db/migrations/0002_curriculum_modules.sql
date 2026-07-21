-- DámMaturu content model v2 — modules + topic dependency graph
-- Apply after 0001: psql "$DATABASE_URL" -f src/db/migrations/0002_curriculum_modules.sql

CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id uuid NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  slug varchar(120) NOT NULL,
  code varchar(8) NOT NULL,
  title varchar(200) NOT NULL,
  summary text,
  order_index integer NOT NULL DEFAULT 0,
  status publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS modules_curriculum_slug_uidx ON modules (curriculum_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS modules_curriculum_code_uidx ON modules (curriculum_id, code);
CREATE INDEX IF NOT EXISTS modules_curriculum_order_idx ON modules (curriculum_id, order_index);

ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES modules(id) ON DELETE RESTRICT;

ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS source_filenames text[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE INDEX IF NOT EXISTS topics_module_idx ON topics (module_id);

CREATE TABLE IF NOT EXISTS topic_prerequisites (
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  prerequisite_topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, prerequisite_topic_id),
  CONSTRAINT topic_prerequisites_no_self CHECK (topic_id <> prerequisite_topic_id)
);
CREATE INDEX IF NOT EXISTS topic_prereq_prerequisite_idx
  ON topic_prerequisites (prerequisite_topic_id);
