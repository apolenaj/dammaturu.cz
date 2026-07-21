# BETA EXPERIMENT — N=1 validation

**Design:** `N=1 beta validation` (D-050)  
**Cohort:** `cjl-private-aug-2026` · cíl **31. 8. 2026**  
**Účel:** ověřit, zda produkt zlepšuje znalosti jednoho reálného studenta a najít problémy v mechanismu.  
**Neúčel:** dokázat vědeckou účinnost platformy ani generalizovat na populaci.

---

## Co se měří

### BASELINE
Uloženo po diagnostice (≥8 otázek):
- start / completed datetime
- duration minutes
- diagnostic accuracy
- mastery per area
- self-reported confidence (onboarding 1–5)
- objective KU ids z packu

### DAILY
Automaticky z learning aktivit:
- minutes studied / planned / adherence
- lessons / reviews / questions / accuracy
- mastery delta / topics / methods

### RETENTION
LEARNED = první úspěšné zvládnutí KU.  
RETAINED / FORGOTTEN = delayed probe ve oknech:
`immediate` · `1d` · `3d` · `7d` · `14d`  
Chybějící probe ≠ fail (student neprocvičil v okně).

### METHODS
`microlearning` · `flashcards` · `active_recall` · `matching` · `story_mode` · `timeline` · `teach_back` · `mixed_test` · `oral_simulation`  
Žebříček je deskriptivní (≥2 pokusy) — ne kauzální A/B.

### WEEKLY CHECKPOINT
`/app/progress/experiment` → Spustit weekly checkpoint  
- témata posledních 7 dní  
- vyloučí už viděné otázky  
- preferuje transfer kinds + KU overlap  

### FINAL
Stejné learning objectives jako baseline, jiné otázky (≥6 unseen).

---

## Report

Learner: [`/app/progress/experiment`](/app/progress/experiment)  
Data: `data/beta-experiment/{learnerId}.json`

Report obsahuje START vs END, retention, study time, plan adherence, TOP 5 zlepšení / slabin, method ranking, weekly/final — vždy s caveats.

---

## Ops

1. Testerka dokončí onboarding + diagnostiku (`?diagnostic=1`).
2. Denní mise / metody běží normálně — instrumentace je pasivní.
3. Jednou týdně: weekly checkpoint.
4. Před / kolem 31. 8.: final assessment.
5. Čti report — hledej produktové problémy, ne „p-value“.
