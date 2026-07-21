# Product analytics (D-062)

Privacy-first **product** funnel + outcomes for internal admin. Complements learning analytics (D-049) — does not replace it.

## Privacy

**Allowed:** opaque learner key (hashed on export), funnel step, plan id, feature id, topic **slug**, counts, minutes, mastery delta, dateKey.

**Denied:** email/name, document text/filenames with PII, free-text answers, transcripts, IP/UA, payment card data, raw school documents.

Admin UI never renders student content — only aggregates and slug ids.

## Funnel

Homepage → Registration → Onboarding completed → First document uploaded → First study session → First 10 questions → Day 2 return → Day 7 return → First mock exam → Upgrade

## Outcomes

questions answered, correctness %, mastery improvement sum, weak topic slug hits, study minutes, day-2 / day-7 retention among eligible learners.

## Feature flags & experiments

`src/domain/feature-flags` + `data/feature-flags.json`. Sticky hash bucketing. **Not** billing entitlements (D-061).

## Storage

- `data/product-analytics/events/*.json`
- `data/product-analytics/learners/*.json`
- Admin: `/admin/analytics` (Product analytics section)
