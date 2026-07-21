# CONTENT_MODEL — DámMaturu.cz

> Atomický vzdělávací model pro adaptive learning.  
> TypeScript: `src/domain/content/` · Drizzle: `src/db/schema/` · SQL: `src/db/migrations/0001_content_model.sql`

## 1. Principy

1. **Atomické znalosti** — mastery stojí na `KnowledgeUnit`, ne na celém dokumentu.
2. **Žádný gigantický markdown blob** jako jednotka učení — dokumenty se řežou na `SourceChunk`.
3. **Provenance first** — published KU musí mít vazbu na `SourceChunk`.
4. **Každá otázka → KU** — published `Question` / `Flashcard` musí mít ≥1 KU.
5. **Reviewable** — `draft | needs_review | published | archived`.
6. **Škálovatelné** — Subject → Curriculum → Topic → Subtopic → Lesson.

## 2. Hierarchie obsahu

```
Subject
 └── Curriculum
      ├── Module (A–F …)
      │    └── Topic ── topic_prerequisites → Topic
      │         └── Subtopic
      │              └── Lesson
      │                   └── KnowledgeUnit
      └── LearningObjective
```

Moduly jsou první třída (`modules` tabulka). Topic dependency graph = `topic_prerequisites`.

## 3. Entity (minimální sada)

| Entita | Účel |
|--------|------|
| **Subject** | Předmět (ČJL, MAT…) |
| **Curriculum** | Verzovaný pack / sylabus |
| **Topic / Subtopic / Lesson** | Navigační hierarchie + pořadí |
| **KnowledgeUnit** | Atom mastery |
| **Fact / Concept / Person / Work / Event / Term** | Typed extension 1:1 k KU |
| **Relationship** | Typované hrany mezi KU |
| **SourceDocument / SourceChunk** | Provenance (chunk = atom textu) |
| **LearningObjective** | Cíl výuky ↔ KU |
| **Question / Answer / Explanation** | Assessment |
| **Flashcard / Exercise / ExamQuestion** | Specializace assessment |
| **MasteryState** | Learner × KU progress |

## 4. KnowledgeUnit (povinná pole)

| Pole | Význam |
|------|--------|
| `importance` | 1–5 váha k cíli |
| `difficulty` | 1–5 |
| `prerequisites` | M:N přes `knowledge_unit_prerequisites` |
| `tags` | `text[]` |
| `source provenance` | `knowledge_unit_provenance` → chunk |
| `reviewStatus` | publish pipeline |
| `confidence` | 0–1 editorial/model jistota |
| `examRelevance` | none → critical |
| `kind` | fact/concept/person/work/event/term/other |
| `statement` | krátké atomické tvrzení (ne esej) |

## 5. Assessment vazby

```
Question ──< question_knowledge_units >── KnowledgeUnit
   ├── Answer
   └── Explanation (± source_chunk)
Flashcard ──< flashcard_knowledge_units >── KnowledgeUnit
Exercise.question_id → Question
ExamQuestion.question_id → Question
```

**Invariant:** `status = published` ⇒ ≥1 KU link (DB trigger + app check).

## 6. Anti-patterns

- ❌ Jeden KU = celý dokument „Kytice.docx“
- ❌ Otázka bez KU
- ❌ Published fakt bez provenance
- ❌ Ukládat curriculum jako jeden MD soubor do DB jako jedinou entitu učení

## 7. Beta mapping (12 DOCX)

DOCX → `SourceDocument` → chunking → `SourceChunk` → draft `KnowledgeUnit` + extensions (Person/Work/…) → review → publish → questions/flashcards.

Odhad: **~80–150 KU** z beta corpusu.

## 8. Jak aplikovat migraci

```bash
# vyžaduje DATABASE_URL (Postgres / Supabase)
psql "$DATABASE_URL" -f src/db/migrations/0001_content_model.sql
# nebo později: npm run db:migrate
```

Dokud DB neběží, typy + Drizzle schema slouží jako source of truth pro ingest a engine.
