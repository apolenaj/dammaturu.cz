# Content Trust Pipeline

Strict provenance for every learning fact and question.

## Statuses

| Status | Meaning | Student feedback |
|--------|---------|------------------|
| `DRAFT` | Rozpracováno | Not authoritative |
| `EXTRACTED` | Vytaženo ze zdroje | Not authoritative — uncertainty shown |
| `REVIEW_REQUIRED` | Ke kontrole | Not authoritative |
| `VERIFIED` | Ověřeno / corrected (Content QA) | **Authoritative** |
| `REJECTED` | Zamítnuto | Never use |

Gate: `isAuthoritativeForStudentFeedback(status)` → only `VERIFIED`.

## Record fields (per knowledge unit)

- `sourceId`, `sourceTitle`, `sourceLocation` / page / section
- `reviewedStatus`, `lastUpdated`, `reviewedAt`, `reviewedBy`
- `confidence`, `verificationLabelCs`
- `issues[]`, `authoritativeForFeedback`

## Detectors

`detectContentTrustIssues`: duplicates, contradictory facts, malformed extraction, suspicious OCR, missing answer keys, answers not supported by source, missing source/location, low confidence, unclear formulation.

## Student display

```ts
formatStudentSourceLabel({ sourceTitle: "Národní obrození" })
// → „Zdroj: Národní obrození – studijní materiál“
```

Optional detail via `SourceCitationPanel` — **no internal file paths**.

Heuristic extracts map to evidence confidence `likely`, never auto-`verified_from_source` (requires `trustAuthoritative: true` / Content QA).

## Admin

- Dashboard: `/admin/content-trust`
- Still use `/admin/reviews` for human verify/correct
- Report builder: `buildContentTrustReportFromStores()`

## Code map

- Domain: `src/domain/content/content-trust.ts`, `content-trust-detectors.ts`, `content-trust-report.ts`
- Server: `src/server/content-trust/build-report.ts`
- UI: `src/components/admin/content-trust-dashboard.tsx`
