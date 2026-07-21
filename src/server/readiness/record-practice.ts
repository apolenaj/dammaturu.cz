import { applyMasteryEvidence, emptyMasteryState } from "@/domain/learning/mastery-engine";
import {
  readinessBookSchema,
  type ReadinessAreaId,
  type ReadinessBook,
} from "@/domain/learning/readiness";
import {
  getReadinessBook,
  saveReadinessBook,
} from "@/server/readiness/store";
import { assertSafeId } from "@/server/safe-id";

function guessArea(unitId: string, title?: string): ReadinessAreaId {
  const hay = `${unitId} ${title ?? ""}`.toLowerCase();
  if (/jazyk|homonym|synonym|anton|poly/.test(hay)) return "jazyk";
  if (/rozbor|kompoz|postav|motiv|narativ|dej/.test(hay)) return "rozbory";
  if (/autor|dilo|balzac|dickens|neruda|macha|dosto/.test(hay))
    return "autori-dila";
  return "literarni-smery";
}

/**
 * Upsert readiness book + apply graded practice evidence.
 * Creates a minimal book when missing so practice actually moves Připravenost.
 */
export async function recordReadinessPractice(input: {
  learnerId: string;
  units: Array<{ id: string; title?: string; areaId?: ReadinessAreaId }>;
  correctness: "incorrect" | "partial" | "correct";
  kind?: "practice" | "review" | "diagnostic" | "self_grade";
}): Promise<ReadinessBook | null> {
  try {
    const learnerId = assertSafeId(input.learnerId, "learner id");
    if (input.units.length === 0) return null;

    const now = new Date().toISOString();
    let book = await getReadinessBook(learnerId);
    if (!book) {
      book = readinessBookSchema.parse({
        learnerId,
        units: [],
        weeklyHistory: [],
        updatedAt: now,
      });
    }

    const units = [...book.units];
    for (const ref of input.units.slice(0, 8)) {
      const id = ref.id.slice(0, 120);
      let idx = units.findIndex((u) => u.id === id);
      if (idx < 0) {
        units.push({
          id,
          title: (ref.title ?? id).slice(0, 160),
          areaId: ref.areaId ?? guessArea(id, ref.title),
          examWeight: 1.5,
          state: emptyMasteryState(id, now),
        });
        idx = units.length - 1;
      }
      const unit = units[idx]!;
      const { state } = applyMasteryEvidence(
        unit.state,
        {
          kind: input.kind ?? "practice",
          correctness: input.correctness,
          difficulty: 3,
          hintsUsed: 0,
          speedRelevant: false,
          isTransfer: false,
          at: now,
        },
        id,
      );
      units[idx] = { ...unit, state };
    }

    const next = readinessBookSchema.parse({
      ...book,
      units,
      updatedAt: now,
    });
    await saveReadinessBook(next);
    return next;
  } catch {
    return null;
  }
}
