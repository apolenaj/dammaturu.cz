# DATA MODEL — DámMaturu production schema

> Canonical Postgres model for identity, content, materials, and learner runtime.  
> Drizzle: `src/db/schema/` · SQL: `src/db/migrations/0001`–`0003`  
> Content principles: [`CONTENT_MODEL.md`](./CONTENT_MODEL.md) · Auth: [`AUTH.md`](./AUTH.md)

**Runtime today:** learner progress still primarily on filesystem (`data/**`).  
Student uploads: `data/learner-materials/{learnerId}/` → later `study_materials` (`owner_type=user`).  
**This schema** is the production target — apply with `DATABASE_URL` and migrate stores later.

---

## 1. Entity map (product → table)

| Product entity | Table | Notes |
|----------------|-------|-------|
| **User** | `users` | `id` = Auth uid; `learner_key` = hex bridge to FS |
| **StudentProfile** | `student_profiles` | 1:1 with User; onboarding + school link |
| **SchoolProfile** | `school_profiles` | School-specific maturity requirements (JSONB) |
| **Exam** | `exams` | CERMAT / school / ministry; country-scoped |
| **Subject** | `subjects` | Extended with `language_code`, `country_code` |
| **StudyMaterial** | `study_materials` | Platform / user / school ownership |
| **Document** | `source_documents` | Kept name; product alias “Document” |
| **DocumentChunk** | `source_chunks` | Kept name; product alias “DocumentChunk” |
| **KnowledgeUnit** | `knowledge_units` | Unchanged spine |
| **Topic** | `topics` (+ modules, curricula) | Unchanged spine |
| **Question** | `questions` | + `language_code` |
| **QuestionAttempt** | `question_attempts` | Immutable graded events |
| **StudySession** | `study_sessions` | Unified session envelope |
| **Mistake** | `mistakes` | = domain ErrorMemory |
| **MasteryState** | `mastery_states` | **score + band** canonical; `level` legacy |
| **ReviewSchedule** | `review_schedules` | SM-2 / spaced due queue |
| **StudyPlan** | `study_plans` | Generated plan snapshots |
| **DailyMission** | `daily_missions` | One plan per user × date |
| **MockExam** | `mock_exams` | Template / pack |
| **MockExamAttempt** | `mock_exam_attempts` | Persisted reports |
| **ReadinessSnapshot** | `readiness_snapshots` | Point-in-time readiness |

Supporting: `exam_subjects`, `subject_enrollments`, curriculum hierarchy, KU provenance, flashcards, etc.

---

## 2. Architecture capabilities

```
User ──1:1── StudentProfile ──?── SchoolProfile
  │
  ├──* SubjectEnrollment ── Subject ──* Curriculum ──* Topic ──* KnowledgeUnit
  │         │                    │
  │         └──? Exam <──────────┘ (exam_subjects M:N)
  │
  ├──* StudyMaterial (owner=user) ──? Document ──* DocumentChunk ── KU provenance
  │
  ├──* StudySession ──* QuestionAttempt
  ├──* Mistake
  ├──* MasteryState (per KU)
  ├──* ReviewSchedule
  ├──* StudyPlan
  ├──* DailyMission
  ├──* MockExamAttempt ── MockExam
  └──* ReadinessSnapshot

Platform StudyMaterial (CERMAT) ── Document ── Chunks → shared KU corpus
```

Supports:
- **One student · multiple subjects** via `subject_enrollments`
- **Multiple uploaded documents** via user-owned `study_materials` → `source_documents`
- **School-specific requirements** via `school_profiles.requirements` JSONB
- **CERMAT content** via `exams.authority = cermat` + platform materials
- **User-specific materials** via `owner_type = user`
- **Expansion beyond Czech** via `country_code` / `language_code` on users, subjects, exams, materials

---

## 3. Naming decisions (no parallel models)

| Avoid inventing | Keep / extend |
|-----------------|---------------|
| New `documents` table | **`source_documents`** (= Document) |
| New `document_chunks` | **`source_chunks`** (= DocumentChunk) |
| Second mastery table | **Extend `mastery_states`** with score/band |
| Parallel question bank | Keep **`questions`**; FS EngineQuestion migrates via `external_question_key` on attempts |
| `error_memories` table | **`mistakes`** (= ErrorMemory domain) |

**MasteryState collision resolved:**  
Domain mastery-engine (`score` + `band`) is canonical in DB. Enum `mastery_level` remains for lesson-engine migration only.

---

## 4. Migrations

| File | Scope |
|------|--------|
| `0001_content_model.sql` | Content spine + legacy mastery_states |
| `0002_curriculum_modules.sql` | Modules + topic graph |
| `0003_production_core.sql` | Identity, materials, learner runtime, extensions |

Apply:

```bash
psql "$DATABASE_URL" -f src/db/migrations/0001_content_model.sql
psql "$DATABASE_URL" -f src/db/migrations/0002_curriculum_modules.sql
psql "$DATABASE_URL" -f src/db/migrations/0003_production_core.sql
```

Or: `npm run db:migrate:sql` (prints commands).

---

## 5. Key constraints

- `users.learner_key` ~ `^[a-f0-9]{32}$` (unique)
- `subject_enrollments` unique `(user_id, subject_id)`
- `study_materials` owner consistency checks (user/school)
- `mastery_states.score` ∈ [0, 100]; unique `(learner_id, ku)` and partial `(user_id, ku)`
- `question_attempts` requires `question_id` or `external_question_key`
- `review_schedules` requires at least one item reference
- `readiness_snapshots.units_covered ≤ units_total`
- Published content invariants from 0001 (KU provenance, question→KU) still apply

---

## 6. Identity bridge (FS → Postgres)

| Auth | DB `users.id` | FS key |
|------|---------------|--------|
| Supabase UUID | same UUID | `learner_key` = UUID without hyphens |
| Local-dev Auth | same UUID | same mapping |

Until FS stores are migrated, runtime continues to key files by `learner_key`.  
`mastery_states.learner_id` remains for bridge; prefer `user_id` for new writes.

---

## 7. Seed note

`0003` upserts exam slug `cz-maturita-cjl` and links to subject `cjl` when that subject exists.

---

## 8. Out of scope (this migration)

- RLS policies (add with Supabase Auth roles)
- Automatic dual-write from FS stores
- Student upload UI
- Dropping `mastery_level` column
