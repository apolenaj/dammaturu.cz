# Readiness / Maturita Score — scoring formula (internal)

**Version:** `2026.07-evidence-v1`  
**Code:** `src/domain/learning/readiness.ts`, `src/server/readiness/gather-evidence.ts`  
**UI:** `/app/progress`

This is an **evidence-based readiness model**, not P(pass matura).  
We **do not** show a confident overall percentage until confidence thresholds are met.

---

## 1. Dimensions

| Id | Czech label | Weight \(w\) |
|----|-------------|--------------|
| `didactic_test` | Didaktický test | 0.25 |
| `oral` | Ústní zkouška | 0.20 |
| `writing` | Písemná práce | 0.15 |
| `materials_mastery` | Moje materiály | 0.15 |
| `retention` | Retence | 0.15 |
| `consistency` | Konzistence | 0.10 |

Weights sum to 1.0.

---

## 2. Per-dimension score \(s_d\)

Each dimension has:

- `evidenceCount` — real graded / scheduled / activity signals (never invented)
- `provisionalPct` ∈ [0,100] or `null` if no signal
- `scorePct` — **shown only if confidence ≠ insufficient**

### Signal sources (gatherer)

| Dimension | Sources |
|-----------|---------|
| Didactic | Mastery book evidence + open-answer evals (`question_engine`, `grounded_study`) + accuracy |
| Oral | Mastery blend (rozbory/autoři/směry) + future mock-oral scores when stored |
| Writing | Materials/long-answer open evals + mastery blend (rozbory/jazyk) |
| Materials | Materials study schedule + materials open-eval correctness |
| Retention | FSRS retrievability on spaced-repetition + flashcard + materials schedules |
| Consistency | Daily mission completion last 14 days + streak |

### Blend (when mastery + signal both exist)

\[
s = \mathrm{round}(m \cdot \alpha + g \cdot (1-\alpha))
\]

Typical \(\alpha \in [0.4, 0.55]\) (mastery weight). If only one side exists, use that side.

### Retention proxy

For each scheduled item with `lastReviewed`:

\[
R = \exp\left(\ln(0.9) \cdot \frac{t}{S}\right)
\]

Score ≈ \(100R\) minus a small lapse penalty. Mean over items → `retentionScorePct`.

---

## 3. Confidence thresholds

Per dimension (`dimensionEvidenceThresholds`):

| Dimension | min (show %) | moderate | high |
|-----------|--------------|----------|------|
| didactic_test | 8 | 16 | 32 |
| oral | 3 | 6 | 12 |
| writing | 4 | 8 | 16 |
| materials_mastery | 5 | 10 | 20 |
| retention | 6 | 12 | 24 |
| consistency | 4 | 8 | 14 |

- `evidenceCount < min` → **insufficient** → `scorePct = null`  
- Student copy: **„Potřebujeme ještě X pokusů pro spolehlivější odhad.“**

Overall (`overallEvidenceConfig`):

- `minTotalEvidence = 12`
- `minScoredDimensions = 2` (dimensions with non-null `scorePct`)
- moderate / high totals: 28 / 56

Overall `scorePct` is shown only if:

1. at least 2 dimensions are scored, and  
2. total evidence ≥ 12, and  
3. provisional blend exists.

Otherwise UI shows a dashed “Zatím ne” ring — **not** a fake confident %.

---

## 4. Overall blend

Let \(D^*\) be dimensions with a provisional score:

\[
O_{\mathrm{prov}} = \mathrm{round}\left(\frac{\sum_{d \in D^*} w_d \cdot s_d}{\sum_{d \in D^*} w_d}\right)
\]

- `overall.provisionalPct` = \(O_{\mathrm{prov}}\) (internal / history)  
- `overall.scorePct` = \(O_{\mathrm{prov}}\) **only when confidence gate passes**, else `null`

---

## 5. Trend

From stored history points (`data/readiness/history/{learnerId}.jsonl`), last up to 4 provisional/overall values:

| Δ (last − first) | Trend |
|------------------|-------|
| ≥ +3 | `improving` |
| ≤ −3 | `declining` |
| else | `stable` |
| &lt; 2 points | `unknown` |

Czech labels: Zlepšuje se / Stabilní / Klesá / Zatím bez trendu.

---

## 6. Historical snapshots

- **Daily history:** append on hub load (`persistHistory: true`) and after practice (`recordReadinessPractice`) — one point per calendar day (latest wins).  
- **Weekly:** `weeklyHistory` on the readiness book (Monday UTC week start) for week-delta copy.

Point fields: `at`, `formulaVersion`, `provisionalPct`, `overallPct`, `confidence`, `trend`, `dimensions`, `totalEvidence`.

---

## 7. Curriculum area bars (secondary)

Unchanged mastery aggregate per ČJL area (Literární směry · Autoři a díla · Rozbory · Jazyk):

\[
A = 100 \times \frac{\sum_i w_i (s_i/100)}{\sum_i w_i}
\]

These bars show **coverage of učivo**, not Maturita Score confidence.

---

## 8. Explicit non-goals

- Not a calibrated probability of passing the exam  
- Not filled with demo/seed data in student-facing production paths  
- Not shown as a confident ring when evidence is thin  

Disclaimer (UI):  
„Připravenost je evidence-based odhad z cvičení, opakování a materiálů. Není to predikce úspěchu u maturity ani ‚šance složit‘.“
