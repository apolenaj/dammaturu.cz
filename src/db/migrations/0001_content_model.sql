-- DámMaturu content model v1
-- Atomic knowledge units for adaptive learning (no giant markdown blobs).
-- Apply: psql "$DATABASE_URL" -f src/db/migrations/0001_content_model.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE publish_status AS ENUM ('draft', 'needs_review', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ku_kind AS ENUM ('fact', 'concept', 'person', 'work', 'event', 'term', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exam_relevance AS ENUM ('none', 'low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE relationship_type AS ENUM (
    'prerequisite', 'related', 'part_of', 'contrasts_with', 'example_of',
    'authored', 'occurs_in', 'defined_as', 'caused_by', 'influenced'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM (
    'mcq', 'multi_select', 'short_answer', 'cloze', 'true_false', 'oral_prompt', 'ordering'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mastery_level AS ENUM (
    'unknown', 'exposed', 'recall_fragile', 'recall_stable', 'proficient', 'mastered'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exam_format AS ENUM ('oral', 'written', 'either');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(120) NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  status publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subjects_slug_uidx ON subjects (slug);

CREATE TABLE IF NOT EXISTS curricula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  slug varchar(120) NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  target_exam varchar(120),
  status publish_status NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS curricula_subject_slug_uidx ON curricula (subject_id, slug);
CREATE INDEX IF NOT EXISTS curricula_subject_idx ON curricula (subject_id);

CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id uuid NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  slug varchar(120) NOT NULL,
  title varchar(200) NOT NULL,
  summary text,
  order_index integer NOT NULL DEFAULT 0,
  exam_relevance exam_relevance NOT NULL DEFAULT 'medium',
  status publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS topics_curriculum_slug_uidx ON topics (curriculum_id, slug);
CREATE INDEX IF NOT EXISTS topics_curriculum_order_idx ON topics (curriculum_id, order_index);

CREATE TABLE IF NOT EXISTS subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  slug varchar(120) NOT NULL,
  title varchar(200) NOT NULL,
  summary text,
  order_index integer NOT NULL DEFAULT 0,
  status publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subtopics_topic_slug_uidx ON subtopics (topic_id, slug);
CREATE INDEX IF NOT EXISTS subtopics_topic_order_idx ON subtopics (topic_id, order_index);

CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id uuid NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  slug varchar(120) NOT NULL,
  title varchar(200) NOT NULL,
  objective_summary text,
  estimated_minutes integer,
  order_index integer NOT NULL DEFAULT 0,
  status publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lessons_estimated_minutes_chk CHECK (
    estimated_minutes IS NULL OR (estimated_minutes BETWEEN 1 AND 180)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS lessons_subtopic_slug_uidx ON lessons (subtopic_id, slug);
CREATE INDEX IF NOT EXISTS lessons_subtopic_order_idx ON lessons (subtopic_id, order_index);

CREATE TABLE IF NOT EXISTS knowledge_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE RESTRICT,
  subtopic_id uuid REFERENCES subtopics(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  kind ku_kind NOT NULL,
  slug varchar(120) NOT NULL,
  title varchar(240) NOT NULL,
  statement text NOT NULL,
  explanation text,
  importance integer NOT NULL DEFAULT 3,
  difficulty integer NOT NULL DEFAULT 3,
  exam_relevance exam_relevance NOT NULL DEFAULT 'medium',
  confidence numeric(3, 2) NOT NULL DEFAULT 0.80,
  review_status publish_status NOT NULL DEFAULT 'draft',
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_units_importance_chk CHECK (importance BETWEEN 1 AND 5),
  CONSTRAINT knowledge_units_difficulty_chk CHECK (difficulty BETWEEN 1 AND 5),
  CONSTRAINT knowledge_units_confidence_chk CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT knowledge_units_statement_len_chk CHECK (char_length(statement) BETWEEN 1 AND 2000)
);
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_units_topic_slug_uidx ON knowledge_units (topic_id, slug);
CREATE INDEX IF NOT EXISTS knowledge_units_topic_idx ON knowledge_units (topic_id);
CREATE INDEX IF NOT EXISTS knowledge_units_kind_idx ON knowledge_units (kind);
CREATE INDEX IF NOT EXISTS knowledge_units_review_idx ON knowledge_units (review_status);
CREATE INDEX IF NOT EXISTS knowledge_units_importance_idx ON knowledge_units (importance);
CREATE INDEX IF NOT EXISTS knowledge_units_tags_gin ON knowledge_units USING gin (tags);

CREATE TABLE IF NOT EXISTS knowledge_unit_prerequisites (
  knowledge_unit_id uuid NOT NULL REFERENCES knowledge_units(id) ON DELETE CASCADE,
  prerequisite_id uuid NOT NULL REFERENCES knowledge_units(id) ON DELETE CASCADE,
  PRIMARY KEY (knowledge_unit_id, prerequisite_id),
  CONSTRAINT ku_prereq_no_self CHECK (knowledge_unit_id <> prerequisite_id)
);
CREATE INDEX IF NOT EXISTS ku_prereq_prerequisite_idx ON knowledge_unit_prerequisites (prerequisite_id);

CREATE TABLE IF NOT EXISTS ku_facts (
  knowledge_unit_id uuid PRIMARY KEY REFERENCES knowledge_units(id) ON DELETE CASCADE,
  assertion text NOT NULL,
  context text
);

CREATE TABLE IF NOT EXISTS ku_concepts (
  knowledge_unit_id uuid PRIMARY KEY REFERENCES knowledge_units(id) ON DELETE CASCADE,
  definition text NOT NULL,
  scope_note text
);

CREATE TABLE IF NOT EXISTS ku_persons (
  knowledge_unit_id uuid PRIMARY KEY REFERENCES knowledge_units(id) ON DELETE CASCADE,
  full_name varchar(200) NOT NULL,
  birth_year integer,
  death_year integer,
  roles text[] NOT NULL DEFAULT ARRAY[]::text[]
);

CREATE TABLE IF NOT EXISTS ku_works (
  knowledge_unit_id uuid PRIMARY KEY REFERENCES knowledge_units(id) ON DELETE CASCADE,
  work_title varchar(300) NOT NULL,
  work_type varchar(80),
  year_published integer,
  author_ku_id uuid REFERENCES knowledge_units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ku_events (
  knowledge_unit_id uuid PRIMARY KEY REFERENCES knowledge_units(id) ON DELETE CASCADE,
  event_name varchar(300) NOT NULL,
  year_start integer,
  year_end integer,
  location varchar(200)
);

CREATE TABLE IF NOT EXISTS ku_terms (
  knowledge_unit_id uuid PRIMARY KEY REFERENCES knowledge_units(id) ON DELETE CASCADE,
  lemma varchar(120) NOT NULL,
  definition text NOT NULL,
  language_code varchar(8) NOT NULL DEFAULT 'cs'
);

CREATE TABLE IF NOT EXISTS relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_ku_id uuid NOT NULL REFERENCES knowledge_units(id) ON DELETE CASCADE,
  to_ku_id uuid NOT NULL REFERENCES knowledge_units(id) ON DELETE CASCADE,
  type relationship_type NOT NULL,
  note text,
  status publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT relationships_no_self CHECK (from_ku_id <> to_ku_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS relationships_edge_uidx ON relationships (from_ku_id, to_ku_id, type);
CREATE INDEX IF NOT EXISTS relationships_to_idx ON relationships (to_ku_id);

CREATE TABLE IF NOT EXISTS source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename varchar(500) NOT NULL,
  storage_path varchar(1000) NOT NULL,
  title varchar(300) NOT NULL,
  content_sha256 varchar(64) NOT NULL,
  mime_type varchar(120),
  word_count_est integer,
  ownership_note varchar(500),
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS source_documents_sha_uidx ON source_documents (content_sha256);
CREATE UNIQUE INDEX IF NOT EXISTS source_documents_path_uidx ON source_documents (storage_path);

CREATE TABLE IF NOT EXISTS source_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  text text NOT NULL,
  text_sha256 varchar(64) NOT NULL,
  char_start integer,
  char_end integer,
  heading_path varchar(500),
  CONSTRAINT source_chunks_text_len_chk CHECK (char_length(text) BETWEEN 1 AND 12000),
  CONSTRAINT source_chunks_index_chk CHECK (chunk_index >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS source_chunks_doc_index_uidx ON source_chunks (source_document_id, chunk_index);
CREATE INDEX IF NOT EXISTS source_chunks_doc_idx ON source_chunks (source_document_id);

CREATE TABLE IF NOT EXISTS knowledge_unit_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_unit_id uuid NOT NULL REFERENCES knowledge_units(id) ON DELETE CASCADE,
  source_chunk_id uuid NOT NULL REFERENCES source_chunks(id) ON DELETE RESTRICT,
  quote text,
  is_primary boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS ku_provenance_uidx ON knowledge_unit_provenance (knowledge_unit_id, source_chunk_id);
CREATE INDEX IF NOT EXISTS ku_provenance_chunk_idx ON knowledge_unit_provenance (source_chunk_id);

CREATE TABLE IF NOT EXISTS learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id uuid NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  code varchar(64) NOT NULL,
  title varchar(300) NOT NULL,
  description text,
  exam_relevance exam_relevance NOT NULL DEFAULT 'medium',
  status publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_objectives_code_uidx ON learning_objectives (curriculum_id, code);

CREATE TABLE IF NOT EXISTS learning_objective_knowledge_units (
  learning_objective_id uuid NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  knowledge_unit_id uuid NOT NULL REFERENCES knowledge_units(id) ON DELETE CASCADE,
  PRIMARY KEY (learning_objective_id, knowledge_unit_id)
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type question_type NOT NULL,
  stem text NOT NULL,
  status publish_status NOT NULL DEFAULT 'draft',
  difficulty integer,
  estimated_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT questions_difficulty_chk CHECK (difficulty IS NULL OR difficulty BETWEEN 1 AND 5),
  CONSTRAINT questions_stem_len_chk CHECK (char_length(stem) BETWEEN 1 AND 4000)
);
CREATE INDEX IF NOT EXISTS questions_status_idx ON questions (status);

CREATE TABLE IF NOT EXISTS question_knowledge_units (
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  knowledge_unit_id uuid NOT NULL REFERENCES knowledge_units(id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT true,
  PRIMARY KEY (question_id, knowledge_unit_id)
);
CREATE INDEX IF NOT EXISTS question_kus_ku_idx ON question_knowledge_units (knowledge_unit_id);

CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer,
  normalized_key varchar(500)
);
CREATE INDEX IF NOT EXISTS answers_question_idx ON answers (question_id);

CREATE TABLE IF NOT EXISTS explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_id uuid REFERENCES answers(id) ON DELETE SET NULL,
  body text NOT NULL,
  source_chunk_id uuid REFERENCES source_chunks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  front text NOT NULL,
  back text NOT NULL,
  status publish_status NOT NULL DEFAULT 'draft',
  difficulty integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flashcards_difficulty_chk CHECK (difficulty IS NULL OR difficulty BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS flashcard_knowledge_units (
  flashcard_id uuid NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  knowledge_unit_id uuid NOT NULL REFERENCES knowledge_units(id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT true,
  PRIMARY KEY (flashcard_id, knowledge_unit_id)
);
CREATE INDEX IF NOT EXISTS flashcard_kus_ku_idx ON flashcard_knowledge_units (knowledge_unit_id);

CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  exercise_kind varchar(80) NOT NULL,
  instructions text
);
CREATE UNIQUE INDEX IF NOT EXISTS exercises_question_uidx ON exercises (question_id);

CREATE TABLE IF NOT EXISTS exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  exam_format exam_format NOT NULL DEFAULT 'either',
  weight integer NOT NULL DEFAULT 3,
  notes text,
  CONSTRAINT exam_questions_weight_chk CHECK (weight BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX IF NOT EXISTS exam_questions_question_uidx ON exam_questions (question_id);

CREATE TABLE IF NOT EXISTS mastery_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id varchar(64) NOT NULL,
  knowledge_unit_id uuid NOT NULL REFERENCES knowledge_units(id) ON DELETE CASCADE,
  level mastery_level NOT NULL DEFAULT 'unknown',
  stability numeric(10, 4),
  difficulty numeric(10, 4),
  due_at timestamptz,
  last_attempt_at timestamptz,
  correct_streak integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  evidence_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mastery_states_learner_ku_uidx ON mastery_states (learner_id, knowledge_unit_id);
CREATE INDEX IF NOT EXISTS mastery_states_due_idx ON mastery_states (learner_id, due_at);

CREATE OR REPLACE FUNCTION enforce_question_has_ku()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'published' THEN
    IF NOT EXISTS (
      SELECT 1 FROM question_knowledge_units qku WHERE qku.question_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'published question % must link to at least one knowledge_unit', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_questions_require_ku ON questions;
CREATE TRIGGER trg_questions_require_ku
  BEFORE INSERT OR UPDATE OF status ON questions
  FOR EACH ROW EXECUTE FUNCTION enforce_question_has_ku();

CREATE OR REPLACE FUNCTION enforce_flashcard_has_ku()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'published' THEN
    IF NOT EXISTS (
      SELECT 1 FROM flashcard_knowledge_units fku WHERE fku.flashcard_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'published flashcard % must link to at least one knowledge_unit', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flashcards_require_ku ON flashcards;
CREATE TRIGGER trg_flashcards_require_ku
  BEFORE INSERT OR UPDATE OF status ON flashcards
  FOR EACH ROW EXECUTE FUNCTION enforce_flashcard_has_ku();

CREATE OR REPLACE FUNCTION enforce_ku_has_provenance()
RETURNS trigger AS $$
BEGIN
  IF NEW.review_status = 'published' THEN
    IF NOT EXISTS (
      SELECT 1 FROM knowledge_unit_provenance p WHERE p.knowledge_unit_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'published knowledge_unit % must have provenance', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ku_require_provenance ON knowledge_units;
CREATE TRIGGER trg_ku_require_provenance
  BEFORE INSERT OR UPDATE OF review_status ON knowledge_units
  FOR EACH ROW EXECUTE FUNCTION enforce_ku_has_provenance();
