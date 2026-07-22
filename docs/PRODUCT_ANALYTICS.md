# Product analytics — learning funnel

Privacy-first **product** analytics for the public → learning conversion funnel.
Extends D-062. Complements learning analytics (D-049) — does not replace it.
**Do not block launch on a larger analytics stack** — file-backed store under `data/product-analytics/`.

## Privacy

**Allowed**

- Opaque learner key (hashed on export / admin display)
- Funnel step / milestone from allowlist
- Plan id / feature id
- Counts, minutes, mastery delta
- Topic **slug** only (never excerpt / answer text)
- Answer result enum (`correct` / `partial` / `wrong`)
- `dateKey` + timestamp

**Denied**

- Email / name / phone
- Uploaded document text / filenames with PII
- Free-text answers / voice transcripts
- IP / user-agent / device fingerprint
- Payment card data
- Raw school documents

Client beacon (`POST /api/analytics/product`) accepts only allowlisted events + optional `topicSlug` / `featureId` (slug-shaped). Rate-limited. Never accepts free text.

## Funnel (primary)

```
Homepage
→ Start (guest)
→ First material
→ First answer
→ First lesson completed
→ Return next day
```

| Step | Trigger events |
|------|----------------|
| Homepage | `homepage_view` |
| Start | `guest_start` (first guest app open) |
| First material | `material_open` / `lesson_start` |
| First answer | `retrieval_attempt` / `answer_*` |
| First lesson completed | `lesson_complete` |
| Return next day | any activity ≥1 calendar day after `firstSeenAt` |

## Events (learning)

| Event | Meaning |
|-------|---------|
| `homepage_view` | Marketing homepage |
| `guest_start` | Guest learner enters app |
| `czech_hub_view` | ČJL hub (`/app/learn`) |
| `material_open` | Opened a study material / pack |
| `lesson_start` | Started a lesson / study session |
| `retrieval_attempt` | Submitted an answer (retrieval) |
| `answer_correct` / `answer_partial` / `answer_wrong` | Graded outcome |
| `feedback_view` | Feedback returned after grade |
| `lesson_complete` | Finished a lesson / pack session |
| `test_start` / `test_complete` | Testing engine |
| `review_start` / `review_complete` | Flashcards / spaced / mistakes practice |
| `mistake_relearned` | Mistake practice graded `good` |
| `simulation_start` / `simulation_complete` | Oral simulation |

Legacy events (`homepage_viewed`, `question_answered`, `study_session_started`, …) remain accepted for back-compat.

## Metrics (admin)

| Metric | Definition |
|--------|------------|
| Time to first learning interaction | Median seconds `firstSeenAt` → `firstLearningInteractionAt` |
| Lesson completion | `lessonsCompleted / lessonsStarted` |
| Return rate (next day) | Learners with `returnNextDayAt` among those ≥1 day old |
| Mistakes later corrected | `mistakesRelearned / mistakesLogged` |
| Review completion | `reviewsCompleted / reviewsStarted` |
| Topic abandonment | Topics with opens > completes (slug only) |

Admin UI: `/admin/analytics` (Product analytics section).

## Storage

- `data/product-analytics/events/*.json`
- `data/product-analytics/learners/*.json`
- Domain: `src/domain/product-analytics`
- Store: `src/server/product-analytics`
- Emit helpers: `src/server/product-analytics/emit.ts`
- Client beacon: `src/lib/product-analytics-beacon.ts`

## Instrumentation map

| Surface | Events |
|---------|--------|
| Homepage beacon | `homepage_view` |
| App layout (guest) | `guest_start`, `app_opened` |
| `/app/learn` | `czech_hub_view` |
| Catalog / materials / QE | `material_open`, `lesson_start`, answer chain, `lesson_complete` |
| Testing engine | `test_start`, answers, `test_complete` |
| Flashcards / spaced / mistakes | `review_start`, `review_complete`, `mistake_relearned` |
| Oral simulation | `simulation_start`, `simulation_complete` |

## Out of scope (intentionally)

- Third-party analytics SDKs
- Session replay
- Cross-device identity graphs
- Content QA / ingestion metrics (separate systems)
